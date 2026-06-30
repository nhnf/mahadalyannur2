-- ============================================================================
-- SIMKURMA Migration 016: Views & Rules Fix
-- Purpose: Create/fix views and lecturer_class_rules table to match frontend
-- DUAL-COMPAT: supports BOTH legacy data (day_of_week VARCHAR + session_slot 
--   SMALLINT with null UUID columns) AND new SIMKURMA data (time_slot_id, 
--   academic_year_id, classroom_id, course_id populated)
-- ============================================================================

-- ============================================================================
-- 1. DROP EXISTING VIEWS (from 014/015 if they exist with wrong definitions)
-- ============================================================================
DROP VIEW IF EXISTS v_schedule_per_classroom CASCADE;
DROP VIEW IF EXISTS v_schedule_per_lecturer CASCADE;
DROP VIEW IF EXISTS v_lecturer_workload CASCADE;
DROP VIEW IF EXISTS v_unscheduled_courses CASCADE;

-- ============================================================================
-- 2. RECREATE lecturer_class_rules TABLE
--    Frontend expects: academic_year_id, lecturer_id, course_id,
--    class_letters (TEXT[]), rule_type, semester_number, warning_note
-- ============================================================================
DROP TABLE IF EXISTS lecturer_class_rules CASCADE;

CREATE TABLE lecturer_class_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  class_letters TEXT[] NOT NULL DEFAULT '{}',
  rule_type VARCHAR(30) NOT NULL DEFAULT 'assign_kelas'
    CHECK (rule_type IN ('assign_kelas', 'exclude_kelas')),
  semester_number INT,
  warning_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT lecturer_class_rules_unique UNIQUE (academic_year_id, lecturer_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_lcr_academic_year
  ON lecturer_class_rules(academic_year_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lcr_lecturer
  ON lecturer_class_rules(lecturer_id) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS update_lecturer_class_rules_updated_at ON lecturer_class_rules;
CREATE TRIGGER update_lecturer_class_rules_updated_at
  BEFORE UPDATE ON lecturer_class_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE lecturer_class_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_lecturer_class_rules" ON lecturer_class_rules;
CREATE POLICY "auth_read_lecturer_class_rules"
  ON lecturer_class_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_manage_lecturer_class_rules" ON lecturer_class_rules;
CREATE POLICY "auth_manage_lecturer_class_rules"
  ON lecturer_class_rules FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY(ARRAY['admin'::text, 'operator'::text, 'hr'::text]))
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY(ARRAY['admin'::text, 'operator'::text, 'hr'::text]));

GRANT ALL ON lecturer_class_rules TO anon;

-- ============================================================================
-- 3. VIEW: v_schedule_per_classroom
--    DUAL-COMPAT: Uses time_slot_id if available, falls back to
--    day_of_week + session_slot for legacy data.
--    Frontend expects: academic_year_id, classroom_id, classroom_name,
--      class_letter, day_name, start_time, end_time, session_number,
--      course_code, course_name, lecturer_name, status
-- ============================================================================
CREATE OR REPLACE VIEW v_schedule_per_classroom AS
SELECT
  COALESCE(s.academic_year_id, '00000000-0000-0000-0000-000000000000'::uuid) AS academic_year_id,
  s.classroom_id,
  COALESCE(cl.name, s.classroom) AS classroom_name,
  COALESCE(cl.parallel::text, '-') AS class_letter,
  COALESCE(d_legacy.name, d_modern.name, s.day_of_week) AS day_name,
  COALESCE(d_legacy.sort_order, d_modern.sort_order, 99) AS day_sort,
  COALESCE(ts_modern.start_time, ts_legacy.start_time) AS start_time,
  COALESCE(ts_modern.end_time, ts_legacy.end_time) AS end_time,
  COALESCE(ts_modern.session_number, ts_legacy.session_number, s.session_slot)::int AS session_number,
  COALESCE(co.code, '') AS course_code,
  COALESCE(co.name, s.mata_kuliah) AS course_name,
  l.name AS lecturer_name,
  COALESCE(s.entry_status::text, s.status, 'draft') AS status
FROM schedules s
-- Modern UUID joins
LEFT JOIN classrooms cl ON cl.id = s.classroom_id AND s.classroom_id IS NOT NULL
LEFT JOIN courses co ON co.id = s.course_id AND s.course_id IS NOT NULL
LEFT JOIN time_slots ts_modern ON ts_modern.id = s.time_slot_id AND s.time_slot_id IS NOT NULL
LEFT JOIN days d_modern ON d_modern.id = ts_modern.day_id
-- Legacy fallback: join time_slots by matching day name + session number
LEFT JOIN days d_legacy ON s.time_slot_id IS NULL
  AND d_legacy.deleted_at IS NULL
  AND lower(d_legacy.name) = lower(s.day_of_week)
LEFT JOIN time_slots ts_legacy ON s.time_slot_id IS NULL
  AND ts_legacy.deleted_at IS NULL
  AND ts_legacy.day_id = d_legacy.id
  AND ts_legacy.session_number = s.session_slot
-- Lecturer join
LEFT JOIN lecturers l ON l.id = s.lecturer_id AND l.deleted_at IS NULL
WHERE s.deleted_at IS NULL;

-- ============================================================================
-- 4. VIEW: v_schedule_per_lecturer
-- ============================================================================
CREATE OR REPLACE VIEW v_schedule_per_lecturer AS
SELECT
  COALESCE(s.academic_year_id, '00000000-0000-0000-0000-000000000000'::uuid) AS academic_year_id,
  s.lecturer_id,
  l.name AS lecturer_name,
  l.nidn,
  COALESCE(d_legacy.name, d_modern.name, s.day_of_week) AS day_name,
  COALESCE(d_legacy.sort_order, d_modern.sort_order, 99) AS day_sort,
  COALESCE(ts_modern.start_time, ts_legacy.start_time) AS start_time,
  COALESCE(ts_modern.end_time, ts_legacy.end_time) AS end_time,
  COALESCE(ts_modern.session_number, ts_legacy.session_number, s.session_slot)::int AS session_number,
  COALESCE(co.code, '') AS course_code,
  COALESCE(co.name, s.mata_kuliah) AS course_name,
  COALESCE(cl.name, s.classroom) AS classroom_name,
  COALESCE(cl.parallel::text, '-') AS class_letter,
  COALESCE(s.entry_status::text, s.status, 'draft') AS status
FROM schedules s
LEFT JOIN lecturers l ON l.id = s.lecturer_id AND l.deleted_at IS NULL
LEFT JOIN courses co ON co.id = s.course_id AND s.course_id IS NOT NULL
LEFT JOIN classrooms cl ON cl.id = s.classroom_id AND s.classroom_id IS NOT NULL
LEFT JOIN time_slots ts_modern ON ts_modern.id = s.time_slot_id AND s.time_slot_id IS NOT NULL
LEFT JOIN days d_modern ON d_modern.id = ts_modern.day_id
LEFT JOIN days d_legacy ON s.time_slot_id IS NULL
  AND d_legacy.deleted_at IS NULL
  AND lower(d_legacy.name) = lower(s.day_of_week)
LEFT JOIN time_slots ts_legacy ON s.time_slot_id IS NULL
  AND ts_legacy.deleted_at IS NULL
  AND ts_legacy.day_id = d_legacy.id
  AND ts_legacy.session_number = s.session_slot
WHERE s.deleted_at IS NULL;

-- ============================================================================
-- 5. VIEW: v_lecturer_workload
--    Frontend expects: academic_year_id, lecturer_id, lecturer_name, nidn,
--      category_name, total_slots_per_week, total_courses, total_classrooms,
--      morning_count, afternoon_count, evening_count
-- ============================================================================
CREATE OR REPLACE VIEW v_lecturer_workload AS
SELECT
  COALESCE(s.academic_year_id, '00000000-0000-0000-0000-000000000000'::uuid) AS academic_year_id,
  l.id AS lecturer_id,
  l.name AS lecturer_name,
  l.nidn,
  COALESCE(cat.category_code, '-') AS category_name,
  COUNT(*)::int AS total_slots_per_week,
  COUNT(DISTINCT s.course_id)::int AS total_courses,
  COUNT(DISTINCT s.classroom_id)::int AS total_classrooms,
  SUM(CASE WHEN COALESCE(ts_modern.start_time, ts_legacy.start_time) < '12:00:00'::time 
    THEN 1 ELSE 0 END)::int AS morning_count,
  SUM(CASE WHEN COALESCE(ts_modern.start_time, ts_legacy.start_time) >= '12:00:00'::time 
    AND COALESCE(ts_modern.start_time, ts_legacy.start_time) < '17:00:00'::time 
    THEN 1 ELSE 0 END)::int AS afternoon_count,
  SUM(CASE WHEN COALESCE(ts_modern.start_time, ts_legacy.start_time) >= '17:00:00'::time 
    THEN 1 ELSE 0 END)::int AS evening_count
FROM schedules s
JOIN lecturers l ON l.id = s.lecturer_id AND l.deleted_at IS NULL
LEFT JOIN categories cat ON cat.id = l.category_id
LEFT JOIN time_slots ts_modern ON ts_modern.id = s.time_slot_id AND s.time_slot_id IS NOT NULL
LEFT JOIN days d_modern ON d_modern.id = ts_modern.day_id
LEFT JOIN days d_legacy ON s.time_slot_id IS NULL
  AND d_legacy.deleted_at IS NULL
  AND lower(d_legacy.name) = lower(s.day_of_week)
LEFT JOIN time_slots ts_legacy ON s.time_slot_id IS NULL
  AND ts_legacy.deleted_at IS NULL
  AND ts_legacy.day_id = d_legacy.id
  AND ts_legacy.session_number = s.session_slot
WHERE s.deleted_at IS NULL
GROUP BY s.academic_year_id, l.id, l.name, l.nidn, cat.category_code;

-- ============================================================================
-- 6. VIEW: v_unscheduled_courses
--    Frontend expects: academic_year_id, classroom_name, class_letter,
--      course_code, course_name, sks, sessions_per_week, remaining_sessions
-- ============================================================================
CREATE OR REPLACE VIEW v_unscheduled_courses AS
SELECT
  cc.academic_year_id,
  cl.name AS classroom_name,
  cl.parallel::text AS class_letter,
  co.code AS course_code,
  co.name AS course_name,
  co.credits AS sks,
  cc.required_meetings AS sessions_per_week,
  (cc.required_meetings - COALESCE(scheduled.cnt, 0)) AS remaining_sessions
FROM class_curriculum cc
JOIN classrooms cl ON cl.id = cc.classroom_id
JOIN courses co ON co.id = cc.course_id
LEFT JOIN (
  SELECT
    s.academic_year_id,
    s.classroom_id,
    s.course_id,
    COUNT(*) AS cnt
  FROM schedules s
  WHERE s.deleted_at IS NULL
    AND s.academic_year_id IS NOT NULL
    AND s.classroom_id IS NOT NULL
    AND s.course_id IS NOT NULL
  GROUP BY s.academic_year_id, s.classroom_id, s.course_id
) scheduled ON scheduled.academic_year_id = cc.academic_year_id
  AND scheduled.classroom_id = cc.classroom_id
  AND scheduled.course_id = cc.course_id
WHERE cc.deleted_at IS NULL
  AND (scheduled.cnt IS NULL OR scheduled.cnt < cc.required_meetings)
ORDER BY cl.name, cl.parallel, co.name;

-- ============================================================================
-- 7. GRANTS
-- ============================================================================
GRANT SELECT ON v_schedule_per_classroom TO authenticated;
GRANT SELECT ON v_schedule_per_classroom TO anon;
GRANT SELECT ON v_schedule_per_lecturer TO authenticated;
GRANT SELECT ON v_schedule_per_lecturer TO anon;
GRANT SELECT ON v_lecturer_workload TO authenticated;
GRANT SELECT ON v_lecturer_workload TO anon;
GRANT SELECT ON v_unscheduled_courses TO authenticated;
GRANT SELECT ON v_unscheduled_courses TO anon;
