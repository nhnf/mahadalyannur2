-- ============================================================================
-- SIMKURMA Enhancements
-- Migration: 015_simkurma_enhancements.sql
-- Purpose: Add missing tables, columns, indexes, and RPC functions from PRD
-- ============================================================================

-- ============================================================================
-- 1. NEW ENUM TYPES
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_type_enum') THEN
    CREATE TYPE course_type_enum AS ENUM ('wajib', 'pilihan', 'praktik', 'diskusi', 'hafalan', 'kitab');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('berat', 'sedang', 'ringan');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_type') THEN
    CREATE TYPE rule_type AS ENUM ('required', 'preferred', 'alternative');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_active_status') THEN
    CREATE TYPE slot_active_status AS ENUM ('active', 'reserve', 'blocked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_rule_type') THEN
    CREATE TYPE class_rule_type AS ENUM ('allowed_only', 'blocked');
  END IF;
END $$;

-- ============================================================================
-- 2. ENHANCE EXISTING TABLES
-- ============================================================================

-- 2.1 lecturers: add missing columns
ALTER TABLE lecturers
  ADD COLUMN IF NOT EXISTS max_night_teaching_per_week INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS degree VARCHAR(50);

-- 2.2 courses: add course_type and difficulty_level
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS course_type course_type_enum NOT NULL DEFAULT 'wajib',
  ADD COLUMN IF NOT EXISTS difficulty_level difficulty_level NOT NULL DEFAULT 'sedang';

-- 2.3 semester_category_rules: add rule_type
ALTER TABLE semester_category_rules
  ADD COLUMN IF NOT EXISTS rule_type rule_type NOT NULL DEFAULT 'preferred';

-- 2.4 course_time_preferences: add rule_type
ALTER TABLE course_time_preferences
  ADD COLUMN IF NOT EXISTS rule_type rule_type NOT NULL DEFAULT 'preferred';

-- 2.5 schedules: add warning_note and generated_by_system
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS warning_note TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_system BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- 3. NEW TABLES
-- ============================================================================

-- 3.1 schedule_slots: status per slot per tahun akademik
CREATE TABLE IF NOT EXISTS schedule_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  status slot_active_status NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT schedule_slots_unique UNIQUE (academic_year_id, day_id, time_slot_id)
);

-- 3.2 lecturer_class_rules: aturan pengecualian dosen per kelas
CREATE TABLE IF NOT EXISTS lecturer_class_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  rule_type class_rule_type NOT NULL DEFAULT 'allowed_only',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT lecturer_class_rules_unique UNIQUE (lecturer_id, classroom_id)
);

-- ============================================================================
-- 4. INDEXES — PREVENT CONFLICTS
-- ============================================================================

-- Unique index to prevent lecturer conflict in schedules
CREATE UNIQUE INDEX IF NOT EXISTS unique_lecturer_schedule
  ON schedules(academic_year_id, lecturer_id, time_slot_id)
  WHERE entry_status != 'archived' AND deleted_at IS NULL;

-- Index for schedule_slots
CREATE INDEX IF NOT EXISTS idx_schedule_slots_lookup
  ON schedule_slots(academic_year_id, day_id, time_slot_id, status)
  WHERE deleted_at IS NULL;

-- Index for lecturer_class_rules
CREATE INDEX IF NOT EXISTS idx_lecturer_class_rules_lookup
  ON lecturer_class_rules(lecturer_id, classroom_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================
CREATE TRIGGER update_schedule_slots_updated_at BEFORE UPDATE ON schedule_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecturer_class_rules_updated_at BEFORE UPDATE ON lecturer_class_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_class_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read schedule_slots"
  ON schedule_slots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/operator manage schedule_slots"
  ON schedule_slots FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'operator')
  ));

CREATE POLICY "Authenticated can read lecturer_class_rules"
  ON lecturer_class_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/operator manage lecturer_class_rules"
  ON lecturer_class_rules FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'operator')
  ));

-- ============================================================================
-- 7. RPC FUNCTIONS
-- ============================================================================

-- 7.1 check_schedule_conflict
CREATE OR REPLACE FUNCTION check_schedule_conflict(
  p_academic_year_id UUID,
  p_lecturer_id UUID,
  p_time_slot_id UUID,
  p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS TABLE (
  has_conflict BOOLEAN,
  conflicting_schedule_id UUID,
  conflicting_classroom_name VARCHAR,
  conflicting_course_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE, s.id, cl.name, co.name
  FROM schedules s
  LEFT JOIN classrooms cl ON cl.id = s.classroom_id
  LEFT JOIN courses co ON co.id = s.course_id
  WHERE s.academic_year_id = p_academic_year_id
    AND s.lecturer_id = p_lecturer_id
    AND s.time_slot_id = p_time_slot_id
    AND s.entry_status != 'archived'
    AND s.deleted_at IS NULL
    AND (p_exclude_schedule_id IS NULL OR s.id != p_exclude_schedule_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 check_generation_readiness
CREATE OR REPLACE FUNCTION check_generation_readiness(
  p_academic_year_id UUID,
  p_classroom_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_ready BOOLEAN,
  check_name TEXT,
  check_status TEXT,
  check_message TEXT,
  check_count INT
) AS $$
DECLARE
  v_classrooms INT;
  v_curriculum INT;
  v_assignments INT;
  v_availability INT;
BEGIN
  SELECT COUNT(*) INTO v_classrooms FROM classrooms
    WHERE academic_year_id = p_academic_year_id
      AND (p_classroom_id IS NULL OR id = p_classroom_id)
      AND deleted_at IS NULL;
  RETURN QUERY SELECT v_classrooms > 0, 'classrooms', CASE WHEN v_classrooms > 0 THEN 'pass' ELSE 'fail' END,
    'Ditemukan ' || v_classrooms || ' kelas', v_classrooms;

  SELECT COUNT(*) INTO v_curriculum FROM class_curriculum
    WHERE academic_year_id = p_academic_year_id
      AND (p_classroom_id IS NULL OR classroom_id = p_classroom_id)
      AND deleted_at IS NULL;
  RETURN QUERY SELECT v_curriculum > 0, 'curriculum', CASE WHEN v_curriculum > 0 THEN 'pass' ELSE 'fail' END,
    'Ditemukan ' || v_curriculum || ' kurikulum', v_curriculum;

  SELECT COUNT(*) INTO v_assignments FROM course_assignments
    WHERE academic_year_id = p_academic_year_id
      AND (p_classroom_id IS NULL OR classroom_id = p_classroom_id)
      AND deleted_at IS NULL;
  RETURN QUERY SELECT v_assignments > 0, 'assignments', CASE WHEN v_assignments > 0 THEN 'pass' ELSE 'fail' END,
    'Ditemukan ' || v_assignments || ' penugasan dosen', v_assignments;

  SELECT COUNT(*) INTO v_availability FROM lecturer_availability
    WHERE deleted_at IS NULL;
  RETURN QUERY SELECT v_availability > 0, 'availability', CASE WHEN v_availability > 0 THEN 'pass' ELSE 'warn' END,
    'Ditemukan ' || v_availability || ' data ketersediaan', v_availability;

  RETURN QUERY SELECT (v_classrooms > 0 AND v_curriculum > 0 AND v_assignments > 0), 'overall',
    CASE WHEN v_classrooms > 0 AND v_curriculum > 0 AND v_assignments > 0 THEN 'ready' ELSE 'not_ready' END,
    CASE WHEN v_classrooms > 0 AND v_curriculum > 0 AND v_assignments > 0
      THEN 'Siap untuk generate jadwal' ELSE 'Data belum lengkap' END, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3 finalize_generation_batch
CREATE OR REPLACE FUNCTION finalize_generation_batch(p_run_id UUID)
RETURNS TABLE (success BOOLEAN, total_finalized INT, message TEXT) AS $$
DECLARE
  v_count INT;
  v_status schedule_run_status;
BEGIN
  SELECT status INTO v_status FROM schedule_runs WHERE id = p_run_id;
  IF v_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Run tidak ditemukan'; RETURN;
  END IF;
  IF v_status != 'completed' THEN
    RETURN QUERY SELECT FALSE, 0, 'Run belum selesai. Status: ' || v_status::TEXT; RETURN;
  END IF;
  UPDATE schedules SET entry_status = 'published'
    WHERE generated_by_run_id = p_run_id AND entry_status = 'draft' AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE schedule_runs SET updated_at = NOW() WHERE id = p_run_id;
  RETURN QUERY SELECT TRUE, v_count, 'Berhasil finalisasi ' || v_count || ' jadwal';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.4 lock_schedule
CREATE OR REPLACE FUNCTION lock_schedule(
  p_schedule_id UUID, p_lock BOOLEAN DEFAULT TRUE, p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_current BOOLEAN;
BEGIN
  SELECT is_locked INTO v_current FROM schedules WHERE id = p_schedule_id AND deleted_at IS NULL;
  IF v_current IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Jadwal tidak ditemukan'; RETURN;
  END IF;
  IF v_current = p_lock THEN
    RETURN QUERY SELECT FALSE, CASE WHEN p_lock THEN 'Sudah terkunci' ELSE 'Sudah terbuka' END; RETURN;
  END IF;
  UPDATE schedules SET is_locked = p_lock, lock_reason = CASE WHEN p_lock THEN p_reason ELSE NULL END, updated_at = NOW()
    WHERE id = p_schedule_id;
  RETURN QUERY SELECT TRUE, CASE WHEN p_lock THEN 'Jadwal berhasil dikunci' ELSE 'Jadwal berhasil dibuka' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ENHANCED VIEWS
-- ============================================================================
CREATE OR REPLACE VIEW v_schedules_with_lecturer AS
SELECT
  s.id, s.schedule_date, s.session_slot, s.status, s.entry_status,
  s.is_locked, s.lock_reason, s.warning_note, s.generated_by_system, s.notes,
  s.lecturer_id, l.name AS lecturer_name, l.nidn, l.degree, l.is_external,
  s.classroom_id, cl.name AS classroom_name, cl.gender AS classroom_gender, cl.parallel AS classroom_parallel,
  sem.number AS semester_number, sem.name AS semester_name,
  s.course_id, co.name AS course_name, co.code AS course_code, co.course_type, co.difficulty_level,
  s.time_slot_id, ts.code AS time_slot_code, ts.session_number, ts.start_time AS slot_start_time, ts.end_time AS slot_end_time,
  d.id AS day_id, d.name AS day_name, d.code AS day_code, d.sort_order AS day_sort_order,
  s.generated_by_run_id, sr.name AS run_name, sr.status AS run_status,
  s.created_at, s.updated_at
FROM schedules s
LEFT JOIN lecturers l ON l.id = s.lecturer_id
LEFT JOIN classrooms cl ON cl.id = s.classroom_id
LEFT JOIN semesters sem ON sem.id = cl.semester_id
LEFT JOIN courses co ON co.id = s.course_id
LEFT JOIN time_slots ts ON ts.id = s.time_slot_id
LEFT JOIN days d ON d.id = ts.day_id
LEFT JOIN schedule_runs sr ON sr.id = s.generated_by_run_id
WHERE s.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_lecturer_workload AS
SELECT
  l.id AS lecturer_id, l.name AS lecturer_name, l.nidn,
  lc.name AS category_name,
  l.max_teaching_per_week, l.max_teaching_per_day, l.max_night_teaching_per_week,
  ay.id AS academic_year_id, ay.name AS academic_year_name,
  COUNT(s.id) AS total_schedules,
  COUNT(DISTINCT s.course_id) AS total_courses,
  COUNT(DISTINCT s.classroom_id) AS total_classrooms,
  COALESCE(SUM(CASE WHEN ts.session_number >= 3 THEN 1 ELSE 0 END), 0) AS night_schedules
FROM lecturers l
LEFT JOIN lecturer_categories lc ON lc.id = l.lecturer_category_id
LEFT JOIN schedules s ON s.lecturer_id = l.id AND s.entry_status != 'archived' AND s.deleted_at IS NULL
LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
LEFT JOIN time_slots ts ON ts.id = s.time_slot_id
WHERE l.deleted_at IS NULL
GROUP BY l.id, l.name, l.nidn, lc.name, l.max_teaching_per_week, l.max_teaching_per_day, l.max_night_teaching_per_week, ay.id, ay.name;

CREATE OR REPLACE VIEW v_unscheduled_courses AS
SELECT
  ay.id AS academic_year_id, ay.name AS academic_year_name,
  cl.id AS classroom_id, cl.name AS classroom_name, cl.gender AS classroom_gender,
  sem.number AS semester_number,
  c.id AS course_id, c.name AS course_name, c.code AS course_code,
  cc.required_meetings,
  COUNT(s.id) AS scheduled_meetings,
  cc.required_meetings - COUNT(s.id) AS remaining_meetings
FROM class_curriculum cc
JOIN academic_years ay ON ay.id = cc.academic_year_id
JOIN classrooms cl ON cl.id = cc.classroom_id
JOIN semesters sem ON sem.id = cl.semester_id
JOIN courses c ON c.id = cc.course_id
LEFT JOIN schedules s ON s.course_id = c.id AND s.classroom_id = cl.id
  AND s.academic_year_id = ay.id AND s.entry_status != 'archived' AND s.deleted_at IS NULL
WHERE cc.deleted_at IS NULL
GROUP BY ay.id, ay.name, cl.id, cl.name, cl.gender, sem.number, c.id, c.name, c.code, cc.required_meetings
HAVING cc.required_meetings > COUNT(s.id);
