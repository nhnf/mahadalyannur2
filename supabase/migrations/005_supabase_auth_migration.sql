-- ============================================================================
-- Migration: 005_supabase_auth_migration.sql
-- Migrasi ke Supabase Auth built-in
-- - Buat user di auth.users dengan role di app_metadata
-- - Update RLS menggunakan auth.jwt() dan auth.uid()
-- ============================================================================

-- ── BUAT USER DI SUPABASE AUTH ────────────────────────────────────────────────
-- Password default: admin123 — GANTI SETELAH DEPLOY

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
  'admin@mahadalyannur.ac.id', crypt('admin123', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  '{"role":"admin","name":"Administrator"}'::jsonb,
  NOW(), NOW(), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@mahadalyannur.ac.id');

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
  'keuangan@mahadalyannur.ac.id', crypt('admin123', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"],"role":"finance"}'::jsonb,
  '{"role":"finance","name":"Keuangan"}'::jsonb,
  NOW(), NOW(), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'keuangan@mahadalyannur.ac.id');

-- ── RLS BERBASIS JWT ──────────────────────────────────────────────────────────

-- CATEGORIES
DROP POLICY IF EXISTS "anon_read_categories"         ON public.categories;
DROP POLICY IF EXISTS "anon_insert_categories"       ON public.categories;
DROP POLICY IF EXISTS "anon_update_categories"       ON public.categories;
DROP POLICY IF EXISTS "block_anon_delete_categories" ON public.categories;
CREATE POLICY "auth_read_categories"  ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_categories" ON public.categories FOR ALL    TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));

-- LECTURERS
DROP POLICY IF EXISTS "anon_read_lecturers"         ON public.lecturers;
DROP POLICY IF EXISTS "anon_insert_lecturers"       ON public.lecturers;
DROP POLICY IF EXISTS "anon_update_lecturers"       ON public.lecturers;
DROP POLICY IF EXISTS "block_anon_delete_lecturers" ON public.lecturers;
CREATE POLICY "auth_read_lecturers"  ON public.lecturers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_lecturers" ON public.lecturers FOR ALL    TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));

-- SCHEDULES
DROP POLICY IF EXISTS "anon_read_schedules"         ON public.schedules;
DROP POLICY IF EXISTS "anon_insert_schedules"       ON public.schedules;
DROP POLICY IF EXISTS "anon_update_schedules"       ON public.schedules;
DROP POLICY IF EXISTS "block_anon_delete_schedules" ON public.schedules;
CREATE POLICY "auth_read_schedules"  ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_schedules" ON public.schedules FOR ALL    TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));

-- MATA_KULIAH
DROP POLICY IF EXISTS "anon_read_mata_kuliah"         ON public.mata_kuliah;
DROP POLICY IF EXISTS "anon_insert_mata_kuliah"       ON public.mata_kuliah;
DROP POLICY IF EXISTS "anon_update_mata_kuliah"       ON public.mata_kuliah;
DROP POLICY IF EXISTS "block_anon_delete_mata_kuliah" ON public.mata_kuliah;
CREATE POLICY "auth_read_mata_kuliah"  ON public.mata_kuliah FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_mata_kuliah" ON public.mata_kuliah FOR ALL    TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));

-- MATKUL_TARIF
DROP POLICY IF EXISTS "anon_read_matkul_tarif"         ON public.matkul_tarif;
DROP POLICY IF EXISTS "anon_insert_matkul_tarif"       ON public.matkul_tarif;
DROP POLICY IF EXISTS "anon_update_matkul_tarif"       ON public.matkul_tarif;
DROP POLICY IF EXISTS "block_anon_delete_matkul_tarif" ON public.matkul_tarif;
CREATE POLICY "auth_read_matkul_tarif"  ON public.matkul_tarif FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_matkul_tarif" ON public.matkul_tarif FOR ALL    TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));

-- ATTENDANCE_MONTHLY
DROP POLICY IF EXISTS "anon_read_attendance"         ON public.attendance_monthly;
DROP POLICY IF EXISTS "anon_insert_attendance"       ON public.attendance_monthly;
DROP POLICY IF EXISTS "anon_update_attendance"       ON public.attendance_monthly;
DROP POLICY IF EXISTS "block_anon_delete_attendance" ON public.attendance_monthly;
CREATE POLICY "auth_read_attendance"  ON public.attendance_monthly FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_attendance" ON public.attendance_monthly FOR ALL    TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));

-- PAYROLL
DROP POLICY IF EXISTS "anon_read_payroll"         ON public.payroll;
DROP POLICY IF EXISTS "anon_insert_payroll"       ON public.payroll;
DROP POLICY IF EXISTS "anon_update_payroll"       ON public.payroll;
DROP POLICY IF EXISTS "block_anon_delete_payroll" ON public.payroll;
CREATE POLICY "auth_read_payroll" ON public.payroll FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('admin','hr','finance')
    OR lecturer_id IN (
      SELECT l.id FROM public.lecturers l
      WHERE l.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
CREATE POLICY "auth_write_payroll" ON public.payroll FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr','finance'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr','finance'));

-- USERS (tabel custom — hanya admin)
DROP POLICY IF EXISTS "anon_login_only"         ON public.users;
DROP POLICY IF EXISTS "block_anon_insert_users" ON public.users;
DROP POLICY IF EXISTS "block_anon_update_users" ON public.users;
DROP POLICY IF EXISTS "block_anon_delete_users" ON public.users;
CREATE POLICY "admin_only_users" ON public.users FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));
