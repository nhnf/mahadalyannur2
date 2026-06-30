-- ============================================================================
-- SIMKURMA Roles and RLS Migration
-- Migration: 013_simkurma_roles_rls.sql
-- Purpose: migrate legacy role checks to SIMKURMA academic roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_role TEXT;
BEGIN
  raw_role := COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() ->> 'role', '');
  raw_role := btrim(raw_role);

  IF raw_role = '' THEN
    RETURN 'Viewer';
  END IF;

  CASE lower(raw_role)
    WHEN 'super admin', 'super_admin', 'admin' THEN RETURN 'Super Admin';
    WHEN 'admin kurikulum', 'admin_kurikulum', 'hr' THEN RETURN 'Admin Kurikulum';
    WHEN 'operator jadwal', 'operator_jadwal', 'finance' THEN RETURN 'Operator Jadwal';
    WHEN 'viewer', 'lecturer' THEN RETURN 'Viewer';
    ELSE
      RETURN raw_role;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_simkurma_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.app_role() = ANY(allowed_roles);
$$;

-- ============================================================================
-- ROLE MIGRATION HELPER
-- Jalankan query UPDATE ini via service role / SQL editor untuk user existing jika perlu.
-- ============================================================================
-- UPDATE auth.users
-- SET raw_app_meta_data = jsonb_set(
--   COALESCE(raw_app_meta_data, '{}'::jsonb),
--   '{role}',
--   to_jsonb(
--     CASE COALESCE(raw_app_meta_data->>'role', '')
--       WHEN 'admin' THEN 'Super Admin'
--       WHEN 'hr' THEN 'Admin Kurikulum'
--       WHEN 'finance' THEN 'Operator Jadwal'
--       WHEN 'lecturer' THEN 'Viewer'
--       ELSE COALESCE(NULLIF(raw_app_meta_data->>'role', ''), 'Viewer')
--     END
--   ),
--   true
-- );

-- ============================================================================
-- POLICY RESET
-- ============================================================================
DROP POLICY IF EXISTS "Users can select categories" ON categories;
DROP POLICY IF EXISTS "Users can insert categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;
DROP POLICY IF EXISTS "Categories read for authenticated users" ON categories;
DROP POLICY IF EXISTS "Admin full access categories" ON categories;
DROP POLICY IF EXISTS "Finance read categories" ON categories;

DROP POLICY IF EXISTS "Users can select mata_kuliah" ON mata_kuliah;
DROP POLICY IF EXISTS "Users can insert mata_kuliah" ON mata_kuliah;
DROP POLICY IF EXISTS "Users can update mata_kuliah" ON mata_kuliah;
DROP POLICY IF EXISTS "Users can delete mata_kuliah" ON mata_kuliah;
DROP POLICY IF EXISTS "Admin full access mata_kuliah" ON mata_kuliah;

DROP POLICY IF EXISTS "Users can select matkul_tarif" ON matkul_tarif;
DROP POLICY IF EXISTS "Users can insert matkul_tarif" ON matkul_tarif;
DROP POLICY IF EXISTS "Users can update matkul_tarif" ON matkul_tarif;
DROP POLICY IF EXISTS "Users can delete matkul_tarif" ON matkul_tarif;
DROP POLICY IF EXISTS "Admin full access matkul_tarif" ON matkul_tarif;

DROP POLICY IF EXISTS "Users can select lecturers" ON lecturers;
DROP POLICY IF EXISTS "Users can insert lecturers" ON lecturers;
DROP POLICY IF EXISTS "Users can update lecturers" ON lecturers;
DROP POLICY IF EXISTS "Users can delete lecturers" ON lecturers;
DROP POLICY IF EXISTS "Admin full access lecturers" ON lecturers;
DROP POLICY IF EXISTS "Finance read lecturers" ON lecturers;

DROP POLICY IF EXISTS "Users can select schedules" ON schedules;
DROP POLICY IF EXISTS "Users can insert schedules" ON schedules;
DROP POLICY IF EXISTS "Users can update schedules" ON schedules;
DROP POLICY IF EXISTS "Users can delete schedules" ON schedules;
DROP POLICY IF EXISTS "Admin full access schedules" ON schedules;
DROP POLICY IF EXISTS "Finance read schedules" ON schedules;
DROP POLICY IF EXISTS "Lecturer view own schedules" ON schedules;

DROP POLICY IF EXISTS "Users can select attendance_monthly" ON attendance_monthly;
DROP POLICY IF EXISTS "Users can insert attendance_monthly" ON attendance_monthly;
DROP POLICY IF EXISTS "Users can update attendance_monthly" ON attendance_monthly;
DROP POLICY IF EXISTS "Users can delete attendance_monthly" ON attendance_monthly;
DROP POLICY IF EXISTS "Admin full access attendance" ON attendance_monthly;

DROP POLICY IF EXISTS "Users can select payroll" ON payroll;
DROP POLICY IF EXISTS "Users can insert payroll" ON payroll;
DROP POLICY IF EXISTS "Users can update payroll" ON payroll;
DROP POLICY IF EXISTS "Users can delete payroll" ON payroll;
DROP POLICY IF EXISTS "Finance manage payroll" ON payroll;
DROP POLICY IF EXISTS "Lecturer view own payroll" ON payroll;

DROP POLICY IF EXISTS "Users can select payroll_details" ON payroll_details;
DROP POLICY IF EXISTS "Users can insert payroll_details" ON payroll_details;
DROP POLICY IF EXISTS "Users can update payroll_details" ON payroll_details;
DROP POLICY IF EXISTS "Users can delete payroll_details" ON payroll_details;
DROP POLICY IF EXISTS "Authenticated manage payroll_details" ON payroll_details;

DROP POLICY IF EXISTS "Admin view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can select users" ON app_users;

-- New SIMKURMA tables
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_time_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_run_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CORE MASTER DATA POLICIES
-- ============================================================================
CREATE POLICY "SIMKURMA read categories" ON categories FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage categories" ON categories FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read mata_kuliah" ON mata_kuliah FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage mata_kuliah" ON mata_kuliah FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read matkul_tarif" ON matkul_tarif FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage matkul_tarif" ON matkul_tarif FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read lecturers" ON lecturers FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage lecturers" ON lecturers FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read academic_years" ON academic_years FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage academic_years" ON academic_years FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read semesters" ON semesters FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage semesters" ON semesters FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read lecturer_categories" ON lecturer_categories FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage lecturer_categories" ON lecturer_categories FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read classrooms" ON classrooms FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage classrooms" ON classrooms FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read courses" ON courses FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage courses" ON courses FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read class_curriculum" ON class_curriculum FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage class_curriculum" ON class_curriculum FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read course_assignments" ON course_assignments FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage course_assignments" ON course_assignments FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read days" ON days FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage days" ON days FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read time_slots" ON time_slots FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage time_slots" ON time_slots FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read lecturer_availability" ON lecturer_availability FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage lecturer_availability" ON lecturer_availability FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read course_time_preferences" ON course_time_preferences FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage course_time_preferences" ON course_time_preferences FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

CREATE POLICY "SIMKURMA read semester_category_rules" ON semester_category_rules FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal','Viewer']));
CREATE POLICY "SIMKURMA manage semester_category_rules" ON semester_category_rules FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum']));

-- ============================================================================
-- SCHEDULING POLICIES
-- ============================================================================
CREATE POLICY "SIMKURMA read schedules" ON schedules FOR SELECT TO authenticated
  USING (
    public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal'])
    OR (
      public.has_simkurma_role(ARRAY['Viewer'])
      AND lecturer_id IN (SELECT id FROM lecturers WHERE email = auth.jwt() ->> 'email')
    )
  );
CREATE POLICY "SIMKURMA manage schedules" ON schedules FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']));

CREATE POLICY "SIMKURMA read schedule_runs" ON schedule_runs FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']));
CREATE POLICY "SIMKURMA manage schedule_runs" ON schedule_runs FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Operator Jadwal']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Operator Jadwal']));

CREATE POLICY "SIMKURMA read schedule_run_logs" ON schedule_run_logs FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']));
CREATE POLICY "SIMKURMA manage schedule_run_logs" ON schedule_run_logs FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Operator Jadwal']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Operator Jadwal']));

-- ============================================================================
-- PAYROLL / ATTENDANCE / AUDIT POLICIES
-- ============================================================================
CREATE POLICY "SIMKURMA read attendance" ON attendance_monthly FOR SELECT TO authenticated
  USING (
    public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal'])
    OR (
      public.has_simkurma_role(ARRAY['Viewer'])
      AND lecturer_id IN (SELECT id FROM lecturers WHERE email = auth.jwt() ->> 'email')
    )
  );
CREATE POLICY "SIMKURMA manage attendance" ON attendance_monthly FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']));

CREATE POLICY "SIMKURMA read payroll" ON payroll FOR SELECT TO authenticated
  USING (
    public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal'])
    OR (
      public.has_simkurma_role(ARRAY['Viewer'])
      AND lecturer_id IN (SELECT id FROM lecturers WHERE email = auth.jwt() ->> 'email')
    )
  );
CREATE POLICY "SIMKURMA manage payroll" ON payroll FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']));

CREATE POLICY "SIMKURMA read payroll_details" ON payroll_details FOR SELECT TO authenticated
  USING (
    public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal'])
    OR (
      public.has_simkurma_role(ARRAY['Viewer'])
      AND lecturer_id IN (SELECT id FROM lecturers WHERE email = auth.jwt() ->> 'email')
    )
  );
CREATE POLICY "SIMKURMA manage payroll_details" ON payroll_details FOR ALL TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']))
  WITH CHECK (public.has_simkurma_role(ARRAY['Super Admin','Admin Kurikulum','Operator Jadwal']));

CREATE POLICY "SIMKURMA read audit_logs" ON audit_logs FOR SELECT TO authenticated
  USING (public.has_simkurma_role(ARRAY['Super Admin']));

-- Legacy app_users table if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_users'
  ) THEN
    EXECUTE 'CREATE POLICY "SIMKURMA read app_users" ON app_users FOR SELECT TO authenticated USING (public.has_simkurma_role(ARRAY[''Super Admin'']))';
  END IF;
END $$;
