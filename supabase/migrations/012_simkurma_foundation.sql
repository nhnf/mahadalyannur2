-- ============================================================================
-- SIMKURMA Foundation Schema
-- Migration: 012_simkurma_foundation.sql
-- Purpose: pivot the payroll-oriented schema into the academic SIMKURMA model
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
    CREATE TYPE gender_type AS ENUM ('putra', 'putri');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parallel_type') THEN
    CREATE TYPE parallel_type AS ENUM ('A', 'B');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_run_status') THEN
    CREATE TYPE schedule_run_status AS ENUM ('draft', 'running', 'completed', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_entry_status') THEN
    CREATE TYPE schedule_entry_status AS ENUM ('draft', 'published', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_status') THEN
    CREATE TYPE availability_status AS ENUM ('available', 'preferred', 'unavailable');
  END IF;
END $$;

-- ============================================================================
-- MASTER DATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(30) NOT NULL UNIQUE,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT academic_years_year_check CHECK (end_year = start_year + 1)
);

CREATE TABLE IF NOT EXISTS semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  number INT NOT NULL UNIQUE,
  priority_weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT semesters_number_check CHECK (number > 0)
);

CREATE TABLE IF NOT EXISTS lecturer_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  level INT NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  gender gender_type NOT NULL,
  parallel parallel_type,
  student_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT classrooms_student_count_check CHECK (student_count >= 0),
  CONSTRAINT classrooms_unique UNIQUE (academic_year_id, semester_id, gender, parallel)
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_mata_kuliah_id UUID REFERENCES mata_kuliah(id) ON DELETE SET NULL,
  code VARCHAR(30) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  credits INT NOT NULL DEFAULT 1,
  meeting_hours INT NOT NULL DEFAULT 1,
  difficulty_weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT courses_credits_check CHECK (credits > 0),
  CONSTRAINT courses_meeting_hours_check CHECK (meeting_hours > 0)
);

CREATE TABLE IF NOT EXISTS class_curriculum (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  required_meetings INT NOT NULL DEFAULT 1,
  priority_weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT class_curriculum_required_meetings_check CHECK (required_meetings > 0),
  CONSTRAINT class_curriculum_unique UNIQUE (academic_year_id, classroom_id, course_id)
);

CREATE TABLE IF NOT EXISTS course_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT course_assignments_unique UNIQUE (academic_year_id, classroom_id, course_id, lecturer_id)
);

CREATE TABLE IF NOT EXISTS days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(30) NOT NULL UNIQUE,
  sort_order INT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) NOT NULL UNIQUE,
  day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  session_number INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_break BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT time_slots_session_number_check CHECK (session_number > 0),
  CONSTRAINT time_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT time_slots_unique UNIQUE (day_id, session_number)
);

CREATE TABLE IF NOT EXISTS lecturer_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  status availability_status NOT NULL DEFAULT 'available',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT lecturer_availability_unique UNIQUE (lecturer_id, day_id, time_slot_id)
);

CREATE TABLE IF NOT EXISTS course_time_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_id UUID REFERENCES days(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
  preference_weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT course_time_preferences_scope_check CHECK (day_id IS NOT NULL OR time_slot_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS semester_category_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  lecturer_category_id UUID NOT NULL REFERENCES lecturer_categories(id) ON DELETE CASCADE,
  priority_weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  max_courses INT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT semester_category_rules_unique UNIQUE (semester_id, lecturer_category_id)
);

-- ============================================================================
-- ENRICH EXISTING TABLES
-- ============================================================================
ALTER TABLE lecturers
  ADD COLUMN IF NOT EXISTS lecturer_category_id UUID REFERENCES lecturer_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gender gender_type,
  ADD COLUMN IF NOT EXISTS can_teach_putra BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_teach_putri BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_teaching_per_day INT NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS max_teaching_per_week INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS priority_score NUMERIC(6,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes_academic TEXT;

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_run_id UUID,
  ADD COLUMN IF NOT EXISTS entry_status schedule_entry_status NOT NULL DEFAULT 'draft';

-- ============================================================================
-- SCHEDULING ENGINE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedule_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status schedule_run_status NOT NULL DEFAULT 'draft',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_candidates INT NOT NULL DEFAULT 0,
  total_assigned INT NOT NULL DEFAULT 0,
  total_conflicts INT NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_run_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_run_id UUID NOT NULL REFERENCES schedule_runs(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  code VARCHAR(50),
  message TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE schedules
  ADD CONSTRAINT schedules_generated_by_run_fk
  FOREIGN KEY (generated_by_run_id) REFERENCES schedule_runs(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_classrooms_lookup ON classrooms(academic_year_id, semester_id, gender, parallel) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_assignments_lookup ON course_assignments(academic_year_id, lecturer_id, course_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_slots_day_session ON time_slots(day_id, session_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lecturer_availability_lookup ON lecturer_availability(lecturer_id, day_id, time_slot_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_simkurma_lookup ON schedules(academic_year_id, classroom_id, time_slot_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_runs_academic_year ON schedule_runs(academic_year_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_run_logs_run ON schedule_run_logs(schedule_run_id, created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lecturer_categories_updated_at BEFORE UPDATE ON lecturer_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_curriculum_updated_at BEFORE UPDATE ON class_curriculum
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_assignments_updated_at BEFORE UPDATE ON course_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_days_updated_at BEFORE UPDATE ON days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON time_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lecturer_availability_updated_at BEFORE UPDATE ON lecturer_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_time_preferences_updated_at BEFORE UPDATE ON course_time_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_semester_category_rules_updated_at BEFORE UPDATE ON semester_category_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_runs_updated_at BEFORE UPDATE ON schedule_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED MASTER REFERENCE DATA
-- ============================================================================
INSERT INTO semesters (code, name, number, priority_weight)
VALUES
  ('SMT-2', 'Semester 2', 2, 1.20),
  ('SMT-4', 'Semester 4', 4, 1.10),
  ('SMT-6', 'Semester 6', 6, 1.00),
  ('SMT-8', 'Semester 8', 8, 0.95)
ON CONFLICT (code) DO NOTHING;

INSERT INTO lecturer_categories (name, level, description)
VALUES
  ('Senior', 1, 'Kategori dosen senior untuk prioritas penjadwalan dan payroll'),
  ('Madya', 2, 'Kategori dosen madya untuk prioritas penjadwalan dan payroll'),
  ('Junior', 3, 'Kategori dosen junior untuk prioritas penjadwalan dan payroll')
ON CONFLICT (name) DO NOTHING;

INSERT INTO days (code, name, sort_order)
VALUES
  ('sabtu', 'Sabtu', 1),
  ('ahad', 'Ahad', 2),
  ('senin', 'Senin', 3),
  ('selasa', 'Selasa', 4),
  ('rabu', 'Rabu', 5),
  ('kamis', 'Kamis', 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO time_slots (code, day_id, session_number, start_time, end_time)
SELECT 'S' || d.sort_order || '-0' || n.session_number, d.id, n.session_number, n.start_time, n.end_time
FROM days d
CROSS JOIN (
  VALUES
    (1, TIME '07:00', TIME '07:50'),
    (2, TIME '08:00', TIME '08:50'),
    (3, TIME '09:00', TIME '09:50'),
    (4, TIME '10:00', TIME '10:50')
) AS n(session_number, start_time, end_time)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- BRIDGE LEGACY DATA INTO NEW STRUCTURE
-- ============================================================================
UPDATE lecturers l
SET lecturer_category_id = lc.id
FROM categories c
JOIN lecturer_categories lc
  ON lc.name = CASE c.category_code
    WHEN 'A' THEN 'Senior'
    WHEN 'B' THEN 'Madya'
    ELSE 'Junior'
  END
WHERE l.category_id = c.id
  AND l.lecturer_category_id IS NULL;

INSERT INTO courses (legacy_mata_kuliah_id, code, name, description, credits, meeting_hours)
SELECT mk.id, mk.kode, mk.nama, mk.deskripsi, 1, 1
FROM mata_kuliah mk
WHERE NOT EXISTS (
  SELECT 1
  FROM courses c
  WHERE c.legacy_mata_kuliah_id = mk.id
);

-- ============================================================================
-- VIEWS
-- ============================================================================
CREATE OR REPLACE VIEW v_lecturers_simkurma AS
SELECT
  l.id,
  l.nidn,
  l.name,
  l.email,
  l.phone,
  l.is_active,
  l.gender,
  l.can_teach_putra,
  l.can_teach_putri,
  l.max_teaching_per_day,
  l.max_teaching_per_week,
  l.priority_score,
  lc.name AS lecturer_category_name,
  c.category_code,
  c.hourly_rate,
  l.created_at,
  l.updated_at
FROM lecturers l
LEFT JOIN lecturer_categories lc ON lc.id = l.lecturer_category_id
LEFT JOIN categories c ON c.id = l.category_id
WHERE l.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_schedules_simkurma AS
SELECT
  s.id,
  s.schedule_date,
  s.session_slot,
  s.status,
  s.entry_status,
  s.is_locked,
  s.lock_reason,
  s.notes,
  s.lecturer_id,
  l.name AS lecturer_name,
  l.nidn,
  s.classroom_id,
  cl.name AS classroom_name,
  cl.gender AS classroom_gender,
  cl.parallel AS classroom_parallel,
  sem.number AS semester_number,
  sem.name AS semester_name,
  s.course_id,
  co.name AS course_name,
  s.time_slot_id,
  ts.code AS time_slot_code,
  d.name AS day_name,
  s.generated_by_run_id,
  sr.name AS run_name,
  s.created_at,
  s.updated_at
FROM schedules s
LEFT JOIN lecturers l ON l.id = s.lecturer_id
LEFT JOIN classrooms cl ON cl.id = s.classroom_id
LEFT JOIN semesters sem ON sem.id = cl.semester_id
LEFT JOIN courses co ON co.id = s.course_id
LEFT JOIN time_slots ts ON ts.id = s.time_slot_id
LEFT JOIN days d ON d.id = ts.day_id
LEFT JOIN schedule_runs sr ON sr.id = s.generated_by_run_id
WHERE s.deleted_at IS NULL;
