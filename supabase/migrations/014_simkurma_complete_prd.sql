-- =====================================================
-- SIMKURMA — Migration 014: Complete PRD Features
-- Menambahkan kolom, tabel, RPC, dan index yang belum ada
-- Referensi: PRD §11-§18, Gap Analysis
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. TAMBAHAN KOLOM LECTURERS (§17.6)
-- ─────────────────────────────────────────────────────
ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS max_night_teaching_per_week INTEGER DEFAULT 2;
ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;
ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS degree TEXT;

-- ─────────────────────────────────────────────────────
-- 2. TAMBAHAN KOLOM COURSES (§17.7)
-- ─────────────────────────────────────────────────────
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'wajib'
  CHECK (course_type IN ('wajib','pilihan','praktik','diskusi','hafalan','kitab'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'sedang'
  CHECK (difficulty_level IN ('berat','sedang','ringan'));

-- ─────────────────────────────────────────────────────
-- 3. TAMBAHAN KOLOM SCHEDULES (§17.18)
-- ─────────────────────────────────────────────────────
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS generated_by_system BOOLEAN DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS warning_note TEXT;

-- ─────────────────────────────────────────────────────
-- 4. TAMBAHAN KOLOM SEMESTER_CATEGORY_RULES (§17.15)
-- ─────────────────────────────────────────────────────
ALTER TABLE semester_category_rules ADD COLUMN IF NOT EXISTS rule_type TEXT DEFAULT 'preferred'
  CHECK (rule_type IN ('required','preferred','alternative'));

-- ─────────────────────────────────────────────────────
-- 5. TAMBAHAN KOLOM COURSE_TIME_PREFERENCES (§17.14)
-- Pastikan rule_type ada
-- ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_time_preferences' AND column_name = 'rule_type'
  ) THEN
    ALTER TABLE course_time_preferences ADD COLUMN rule_type TEXT DEFAULT 'preferred'
      CHECK (rule_type IN ('required','preferred','alternative'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 6. UNIQUE INDEX UNTUK CEGAH BENTROK (§17.18)
-- ─────────────────────────────────────────────────────
-- Unique: satu dosen tidak boleh dijadwalkan di hari+slot yang sama
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'unique_lecturer_schedule'
  ) THEN
    CREATE UNIQUE INDEX unique_lecturer_schedule
    ON schedule_slots (academic_year_id, lecturer_id, day_id, time_slot_id)
    WHERE lecturer_id IS NOT NULL AND deleted_at IS NULL AND status != 'cancelled';
  END IF;
END $$;

-- Unique: satu kelas tidak boleh dijadwalkan di hari+slot yang sama
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'unique_classroom_schedule'
  ) THEN
    CREATE UNIQUE INDEX unique_classroom_schedule
    ON schedule_slots (academic_year_id, classroom_id, day_id, time_slot_id)
    WHERE deleted_at IS NULL AND status != 'cancelled';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 7. RPC: CHECK_SCHEDULE_CONFLICT (§15.1)
-- Mengecek bentrok jadwal dosen dan kelas
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_schedule_conflict(p_schedule_id UUID)
RETURNS TABLE (
  conflict_type TEXT,
  description TEXT,
  day_name TEXT,
  slot_label TEXT,
  entity_name TEXT
) AS $$
BEGIN
  -- Cek bentrok dosen (sama dosen, sama hari+slot)
  RETURN QUERY
  SELECT
    'Bentrok Dosen'::TEXT AS conflict_type,
    ('Dosen ' || l.name || ' dijadwalkan di 2+ kelas pada waktu yang sama')::TEXT AS description,
    d.name AS day_name,
    (ts.start_time || ' - ' || ts.end_time)::TEXT AS slot_label,
    l.name AS entity_name
  FROM schedule_slots ss1
  JOIN schedule_slots ss2 ON ss1.lecturer_id = ss2.lecturer_id
    AND ss1.day_id = ss2.day_id
    AND ss1.time_slot_id = ss2.time_slot_id
    AND ss1.id < ss2.id
    AND ss1.deleted_at IS NULL AND ss2.deleted_at IS NULL
    AND ss1.status != 'cancelled' AND ss2.status != 'cancelled'
  JOIN lecturers l ON l.id = ss1.lecturer_id
  JOIN days d ON d.id = ss1.day_id
  JOIN time_slots ts ON ts.id = ss1.time_slot_id
  WHERE ss1.academic_year_id = (
    SELECT academic_year_id FROM schedules WHERE id = p_schedule_id
  );

  -- Cek bentrok kelas (sama kelas + huruf kelas, sama hari+slot)
  RETURN QUERY
  SELECT
    'Bentrok Kelas'::TEXT AS conflict_type,
    ('Kelas ' || c.name || ' memiliki 2+ mata kuliah pada waktu yang sama')::TEXT AS description,
    d.name AS day_name,
    (ts.start_time || ' - ' || ts.end_time)::TEXT AS slot_label,
    c.name AS entity_name
  FROM schedule_slots ss1
  JOIN schedule_slots ss2 ON ss1.classroom_id = ss2.classroom_id
    AND ss1.class_letter = ss2.class_letter
    AND ss1.day_id = ss2.day_id
    AND ss1.time_slot_id = ss2.time_slot_id
    AND ss1.id < ss2.id
    AND ss1.deleted_at IS NULL AND ss2.deleted_at IS NULL
    AND ss1.status != 'cancelled' AND ss2.status != 'cancelled'
  JOIN classrooms c ON c.id = ss1.classroom_id
  JOIN days d ON d.id = ss1.day_id
  JOIN time_slots ts ON ts.id = ss1.time_slot_id
  WHERE ss1.academic_year_id = (
    SELECT academic_year_id FROM schedules WHERE id = p_schedule_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────
-- 8. RPC: CHECK_GENERATION_READINESS (§15.2)
-- Cek kesiapan data sebelum generate
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_generation_readiness(p_academic_year_id UUID)
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  detail TEXT,
  count_val BIGINT
) AS $$
DECLARE
  v_total_courses BIGINT;
  v_total_lecturers BIGINT;
  v_total_slots BIGINT;
  v_total_pengampu BIGINT;
  v_total_avail BIGINT;
  v_total_kurikulum BIGINT;
BEGIN
  -- 1. Cek mata kuliah aktif
  SELECT COUNT(*) INTO v_total_courses FROM courses WHERE deleted_at IS NULL;
  RETURN QUERY SELECT 'Mata Kuliah Aktif'::TEXT,
    CASE WHEN v_total_courses > 0 THEN 'OK' ELSE 'BELUM' END::TEXT,
    (v_total_courses || ' mata kuliah ditemukan')::TEXT,
    v_total_courses;

  -- 2. Cek dosen aktif
  SELECT COUNT(*) INTO v_total_lecturers FROM lecturers WHERE deleted_at IS NULL;
  RETURN QUERY SELECT 'Dosen Aktif'::TEXT,
    CASE WHEN v_total_lecturers > 0 THEN 'OK' ELSE 'BELUM' END::TEXT,
    (v_total_lecturers || ' dosen ditemukan')::TEXT,
    v_total_lecturers;

  -- 3. Cek slot waktu
  SELECT COUNT(*) INTO v_total_slots FROM time_slots WHERE deleted_at IS NULL;
  RETURN QUERY SELECT 'Slot Waktu'::TEXT,
    CASE WHEN v_total_slots > 0 THEN 'OK' ELSE 'BELUM' END::TEXT,
    (v_total_slots || ' slot waktu ditemukan')::TEXT,
    v_total_slots;

  -- 4. Cek pengampu assignments
  SELECT COUNT(*) INTO v_total_pengampu FROM pengampu_assignments
  WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL;
  RETURN QUERY SELECT 'Dosen Pengampu'::TEXT,
    CASE WHEN v_total_pengampu > 0 THEN 'OK' ELSE 'BELUM' END::TEXT,
    (v_total_pengampu || ' assignment pengampu')::TEXT,
    v_total_pengampu;

  -- 5. Cek ketersediaan dosen
  SELECT COUNT(*) INTO v_total_avail FROM lecturer_availability
  WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL;
  RETURN QUERY SELECT 'Ketersediaan Dosen'::TEXT,
    CASE WHEN v_total_avail > 0 THEN 'OK' ELSE 'PERINGATAN' END::TEXT,
    (v_total_avail || ' data ketersediaan')::TEXT,
    v_total_avail;

  -- 6. Cek kurikulum kelas
  SELECT COUNT(*) INTO v_total_kurikulum FROM kurikulum_kelas
  WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL;
  RETURN QUERY SELECT 'Kurikulum Kelas'::TEXT,
    CASE WHEN v_total_kurikulum > 0 THEN 'OK' ELSE 'BELUM' END::TEXT,
    (v_total_kurikulum || ' item kurikulum')::TEXT,
    v_total_kurikulum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────
-- 9. RPC: FINALIZE_GENERATION_BATCH (§15.3)
-- Finalisasi batch hasil generate
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finalize_generation_batch(
  p_schedule_id UUID,
  p_batch_size INTEGER DEFAULT 50
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_ay_id UUID;
BEGIN
  -- Ambil academic_year_id
  SELECT academic_year_id INTO v_ay_id FROM schedules WHERE id = p_schedule_id;
  IF v_ay_id IS NULL THEN RAISE EXCEPTION 'Schedule not found'; END IF;

  -- Update status draft -> final untuk slot yang tidak bentrok
  WITH to_finalize AS (
    SELECT ss.id
    FROM schedule_slots ss
    WHERE ss.academic_year_id = v_ay_id
      AND ss.status = 'draft'
      AND ss.deleted_at IS NULL
    LIMIT p_batch_size
  )
  UPDATE schedule_slots SET status = 'final', updated_at = NOW()
  WHERE id IN (SELECT id FROM to_finalize);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log finalisasi
  INSERT INTO schedule_run_logs (academic_year_id, action, detail, created_at)
  VALUES (v_ay_id, 'finalize_batch', jsonb_build_object(
    'schedule_id', p_schedule_id,
    'finalized_count', v_count,
    'batch_size', p_batch_size
  )::TEXT, NOW());

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────
-- 10. RPC: LOCK_SCHEDULE (§15.4)
-- Mengunci semua jadwal dalam satu schedule
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lock_schedule(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_ay_id UUID;
BEGIN
  SELECT academic_year_id INTO v_ay_id FROM schedules WHERE id = p_schedule_id;
  IF v_ay_id IS NULL THEN RAISE EXCEPTION 'Schedule not found'; END IF;

  -- Lock semua slot final
  UPDATE schedule_slots
  SET status = 'locked', updated_at = NOW()
  WHERE academic_year_id = v_ay_id
    AND status = 'final'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update schedule parent
  UPDATE schedules SET is_locked = TRUE, updated_at = NOW()
  WHERE id = p_schedule_id;

  -- Log
  INSERT INTO schedule_run_logs (academic_year_id, action, detail, created_at)
  VALUES (v_ay_id, 'lock_schedule', jsonb_build_object(
    'schedule_id', p_schedule_id,
    'locked_count', v_count
  )::TEXT, NOW());

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────
-- 11. RPC: UNLOCK_SCHEDULE
-- Membuka kunci jadwal
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION unlock_schedule(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_ay_id UUID;
BEGIN
  SELECT academic_year_id INTO v_ay_id FROM schedules WHERE id = p_schedule_id;
  IF v_ay_id IS NULL THEN RAISE EXCEPTION 'Schedule not found'; END IF;

  UPDATE schedule_slots
  SET status = 'final', updated_at = NOW()
  WHERE academic_year_id = v_ay_id
    AND status = 'locked'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE schedules SET is_locked = FALSE, updated_at = NOW()
  WHERE id = p_schedule_id;

  INSERT INTO schedule_run_logs (academic_year_id, action, detail, created_at)
  VALUES (v_ay_id, 'unlock_schedule', jsonb_build_object(
    'schedule_id', p_schedule_id,
    'unlocked_count', v_count
  )::TEXT, NOW());

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────
-- 12. VIEW: JADWAL PER KELAS (Laporan §11.23)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_schedule_per_classroom AS
SELECT
  ss.academic_year_id,
  ay.name AS academic_year_name,
  c.name AS classroom_name,
  ss.class_letter,
  d.name AS day_name,
  d.sort_order AS day_sort,
  ts.start_time,
  ts.end_time,
  ts.session_number,
  co.code AS course_code,
  co.name AS course_name,
  l.name AS lecturer_name,
  ss.status
FROM schedule_slots ss
JOIN classrooms c ON c.id = ss.classroom_id
JOIN days d ON d.id = ss.day_id
JOIN time_slots ts ON ts.id = ss.time_slot_id
LEFT JOIN courses co ON co.id = ss.course_id
LEFT JOIN lecturers l ON l.id = ss.lecturer_id
LEFT JOIN academic_years ay ON ay.id = ss.academic_year_id
WHERE ss.deleted_at IS NULL AND ss.status NOT IN ('cancelled')
ORDER BY ss.academic_year_id, c.name, ss.class_letter, d.sort_order, ts.start_time;

-- ─────────────────────────────────────────────────────
-- 13. VIEW: JADWAL PER DOSEN (Laporan §11.23)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_schedule_per_lecturer AS
SELECT
  ss.academic_year_id,
  ay.name AS academic_year_name,
  l.name AS lecturer_name,
  l.nidn,
  d.name AS day_name,
  d.sort_order AS day_sort,
  ts.start_time,
  ts.end_time,
  ts.session_number,
  co.code AS course_code,
  co.name AS course_name,
  c.name AS classroom_name,
  ss.class_letter,
  ss.status
FROM schedule_slots ss
JOIN lecturers l ON l.id = ss.lecturer_id
JOIN days d ON d.id = ss.day_id
JOIN time_slots ts ON ts.id = ss.time_slot_id
LEFT JOIN courses co ON co.id = ss.course_id
LEFT JOIN classrooms c ON c.id = ss.classroom_id
LEFT JOIN academic_years ay ON ay.id = ss.academic_year_id
WHERE ss.deleted_at IS NULL AND ss.status NOT IN ('cancelled')
ORDER BY ss.academic_year_id, l.name, d.sort_order, ts.start_time;

-- ─────────────────────────────────────────────────────
-- 14. VIEW: REKAP BEBAN DOSEN (Laporan §11.23)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_lecturer_workload AS
SELECT
  ss.academic_year_id,
  ay.name AS academic_year_name,
  l.id AS lecturer_id,
  l.name AS lecturer_name,
  l.nidn,
  cat.name AS category_name,
  COUNT(*) AS total_slots_per_week,
  COUNT(DISTINCT co.id) AS total_courses,
  COUNT(DISTINCT c.id) AS total_classrooms,
  SUM(CASE WHEN ts.start_time < '12:00' THEN 1 ELSE 0 END) AS morning_slots,
  SUM(CASE WHEN ts.start_time >= '12:00' AND ts.start_time < '17:00' THEN 1 ELSE 0 END) AS afternoon_slots,
  SUM(CASE WHEN ts.start_time >= '17:00' THEN 1 ELSE 0 END) AS evening_slots
FROM schedule_slots ss
JOIN lecturers l ON l.id = ss.lecturer_id
LEFT JOIN categories cat ON cat.id = l.category_id
JOIN days d ON d.id = ss.day_id
JOIN time_slots ts ON ts.id = ss.time_slot_id
LEFT JOIN courses co ON co.id = ss.course_id
LEFT JOIN classrooms c ON c.id = ss.classroom_id
LEFT JOIN academic_years ay ON ay.id = ss.academic_year_id
WHERE ss.deleted_at IS NULL AND ss.status NOT IN ('cancelled')
GROUP BY ss.academic_year_id, ay.name, l.id, l.name, l.nidn, cat.name
ORDER BY total_slots_per_week DESC;

-- ─────────────────────────────────────────────────────
-- 15. VIEW: MATA KULIAH BELUM TERJADWAL (Laporan §11.23)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_unscheduled_courses AS
SELECT
  kk.academic_year_id,
  ay.name AS academic_year_name,
  c.name AS classroom_name,
  kk.class_letter,
  co.code AS course_code,
  co.name AS course_name,
  co.credits AS sks,
  kk.sessions_per_week,
  (kk.sessions_per_week - COALESCE(scheduled.scheduled_count, 0)) AS remaining_sessions
FROM kurikulum_kelas kk
JOIN courses co ON co.id = kk.course_id
JOIN classrooms c ON c.id = kk.classroom_id
LEFT JOIN academic_years ay ON ay.id = kk.academic_year_id
LEFT JOIN (
  SELECT
    ss.academic_year_id,
    ss.course_id,
    ss.classroom_id,
    ss.class_letter,
    COUNT(*) AS scheduled_count
  FROM schedule_slots ss
  WHERE ss.deleted_at IS NULL AND ss.status NOT IN ('cancelled')
  GROUP BY ss.academic_year_id, ss.course_id, ss.classroom_id, ss.class_letter
) scheduled ON scheduled.academic_year_id = kk.academic_year_id
  AND scheduled.course_id = kk.course_id
  AND scheduled.classroom_id = kk.classroom_id
  AND scheduled.class_letter = kk.class_letter
WHERE kk.deleted_at IS NULL
  AND (scheduled.scheduled_count IS NULL OR scheduled.scheduled_count < kk.sessions_per_week)
ORDER BY ay.name, c.name, kk.class_letter, co.name;
