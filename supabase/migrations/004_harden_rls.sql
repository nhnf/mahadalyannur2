-- ============================================================================
-- Migration: 004_harden_rls.sql
-- Hardening RLS: batasi akses anon, perbaiki views SECURITY DEFINER
-- ============================================================================

-- TABEL USERS: anon hanya boleh SELECT (untuk login), tidak bisa write
DROP POLICY IF EXISTS "anon full access users"      ON public.users;
DROP POLICY IF EXISTS "anon_read_users"             ON public.users;
DROP POLICY IF EXISTS "anon_login_only"             ON public.users;
DROP POLICY IF EXISTS "block_anon_write_users"      ON public.users;
DROP POLICY IF EXISTS "block_anon_update_users"     ON public.users;
DROP POLICY IF EXISTS "block_anon_delete_users"     ON public.users;
DROP POLICY IF EXISTS "block_anon_insert_users"     ON public.users;

CREATE POLICY "anon_login_only"         ON public.users FOR SELECT TO anon USING (true);
CREATE POLICY "block_anon_insert_users" ON public.users FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "block_anon_update_users" ON public.users FOR UPDATE TO anon USING (false);
CREATE POLICY "block_anon_delete_users" ON public.users FOR DELETE TO anon USING (false);

-- TABEL PAYROLL: blokir delete dari anon
DROP POLICY IF EXISTS "anon full access payroll"  ON public.payroll;
DROP POLICY IF EXISTS "anon_read_payroll"         ON public.payroll;
DROP POLICY IF EXISTS "anon_write_payroll"        ON public.payroll;
DROP POLICY IF EXISTS "block_anon_delete_payroll" ON public.payroll;
DROP POLICY IF EXISTS "anon_insert_payroll"       ON public.payroll;
DROP POLICY IF EXISTS "anon_update_payroll"       ON public.payroll;

CREATE POLICY "anon_read_payroll"         ON public.payroll FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_payroll"       ON public.payroll FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_payroll"       ON public.payroll FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "block_anon_delete_payroll" ON public.payroll FOR DELETE TO anon USING (false);

-- TABEL LECTURERS: blokir delete dari anon
DROP POLICY IF EXISTS "anon full access lecturers"  ON public.lecturers;
DROP POLICY IF EXISTS "anon_read_lecturers"         ON public.lecturers;
DROP POLICY IF EXISTS "anon_write_lecturers"        ON public.lecturers;
DROP POLICY IF EXISTS "block_anon_delete_lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "anon_insert_lecturers"       ON public.lecturers;
DROP POLICY IF EXISTS "anon_update_lecturers"       ON public.lecturers;

CREATE POLICY "anon_read_lecturers"         ON public.lecturers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_lecturers"       ON public.lecturers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_lecturers"       ON public.lecturers FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "block_anon_delete_lecturers" ON public.lecturers FOR DELETE TO anon USING (false);

-- TABEL CATEGORIES: blokir delete dari anon
DROP POLICY IF EXISTS "anon full access categories"  ON public.categories;
DROP POLICY IF EXISTS "anon_read_categories"         ON public.categories;
DROP POLICY IF EXISTS "anon_write_categories"        ON public.categories;
DROP POLICY IF EXISTS "block_anon_delete_categories" ON public.categories;
DROP POLICY IF EXISTS "anon_insert_categories"       ON public.categories;
DROP POLICY IF EXISTS "anon_update_categories"       ON public.categories;

CREATE POLICY "anon_read_categories"         ON public.categories FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_categories"       ON public.categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_categories"       ON public.categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "block_anon_delete_categories" ON public.categories FOR DELETE TO anon USING (false);

-- TABEL SCHEDULES: blokir delete dari anon
DROP POLICY IF EXISTS "anon full access schedules"  ON public.schedules;
DROP POLICY IF EXISTS "anon_read_schedules"         ON public.schedules;
DROP POLICY IF EXISTS "anon_write_schedules"        ON public.schedules;
DROP POLICY IF EXISTS "block_anon_delete_schedules" ON public.schedules;
DROP POLICY IF EXISTS "anon_insert_schedules"       ON public.schedules;
DROP POLICY IF EXISTS "anon_update_schedules"       ON public.schedules;

CREATE POLICY "anon_read_schedules"         ON public.schedules FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_schedules"       ON public.schedules FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_schedules"       ON public.schedules FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "block_anon_delete_schedules" ON public.schedules FOR DELETE TO anon USING (false);

-- TABEL MATA_KULIAH: blokir delete dari anon
DROP POLICY IF EXISTS "anon full access mata_kuliah"  ON public.mata_kuliah;
DROP POLICY IF EXISTS "anon_all_matkul"               ON public.mata_kuliah;
DROP POLICY IF EXISTS "anon_read_mata_kuliah"         ON public.mata_kuliah;
DROP POLICY IF EXISTS "anon_insert_mata_kuliah"       ON public.mata_kuliah;
DROP POLICY IF EXISTS "anon_update_mata_kuliah"       ON public.mata_kuliah;
DROP POLICY IF EXISTS "block_anon_delete_mata_kuliah" ON public.mata_kuliah;

CREATE POLICY "anon_read_mata_kuliah"         ON public.mata_kuliah FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_mata_kuliah"       ON public.mata_kuliah FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_mata_kuliah"       ON public.mata_kuliah FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "block_anon_delete_mata_kuliah" ON public.mata_kuliah FOR DELETE TO anon USING (false);

-- TABEL MATKUL_TARIF: blokir delete dari anon
DROP POLICY IF EXISTS "anon full access matkul_tarif"  ON public.matkul_tarif;
DROP POLICY IF EXISTS "anon_all_matkul_tarif"          ON public.matkul_tarif;
DROP POLICY IF EXISTS "anon_read_matkul_tarif"         ON public.matkul_tarif;
DROP POLICY IF EXISTS "anon_insert_matkul_tarif"       ON public.matkul_tarif;
DROP POLICY IF EXISTS "anon_update_matkul_tarif"       ON public.matkul_tarif;
DROP POLICY IF EXISTS "block_anon_delete_matkul_tarif" ON public.matkul_tarif;

CREATE POLICY "anon_read_matkul_tarif"         ON public.matkul_tarif FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_matkul_tarif"       ON public.matkul_tarif FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_matkul_tarif"       ON public.matkul_tarif FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "block_anon_delete_matkul_tarif" ON public.matkul_tarif FOR DELETE TO anon USING (false);

-- TABEL ATTENDANCE_MONTHLY: blokir delete dari anon
DROP POLICY IF EXISTS "anon full access attendance_monthly" ON public.attendance_monthly;
DROP POLICY IF EXISTS "anon_all_attendance_monthly"         ON public.attendance_monthly;
DROP POLICY IF EXISTS "anon_read_attendance"                ON public.attendance_monthly;
DROP POLICY IF EXISTS "anon_insert_attendance"              ON public.attendance_monthly;
DROP POLICY IF EXISTS "anon_update_attendance"              ON public.attendance_monthly;
DROP POLICY IF EXISTS "block_anon_delete_attendance"        ON public.attendance_monthly;

CREATE POLICY "anon_read_attendance"         ON public.attendance_monthly FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_attendance"       ON public.attendance_monthly FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_attendance"       ON public.attendance_monthly FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "block_anon_delete_attendance" ON public.attendance_monthly FOR DELETE TO anon USING (false);

-- PERBAIKI VIEWS: ganti SECURITY DEFINER → SECURITY INVOKER
DROP VIEW IF EXISTS public.v_lecturers_with_category CASCADE;
DROP VIEW IF EXISTS public.v_schedules_with_lecturer CASCADE;
DROP VIEW IF EXISTS public.v_attendance_monthly CASCADE;

CREATE VIEW public.v_lecturers_with_category WITH (security_invoker = true) AS
SELECT l.id, l.nidn, l.name, l.email, l.phone, l.is_active,
       l.category_id, c.category_code, c.hourly_rate, l.created_at
FROM lecturers l JOIN categories c ON l.category_id = c.id
WHERE l.deleted_at IS NULL;

CREATE VIEW public.v_schedules_with_lecturer WITH (security_invoker = true) AS
SELECT s.id, s.lecturer_id, s.day_of_week, s.session_slot,
       s.semester, s.mata_kuliah, s.mata_kuliah_id, s.status, s.notes,
       COALESCE(l.name, '—') AS lecturer_name,
       l.nidn, c.category_code, c.hourly_rate, s.created_at
FROM schedules s
LEFT JOIN lecturers l  ON s.lecturer_id = l.id AND l.deleted_at IS NULL
LEFT JOIN categories c ON l.category_id = c.id
WHERE s.deleted_at IS NULL;

CREATE VIEW public.v_attendance_monthly WITH (security_invoker = true) AS
SELECT am.id, am.lecturer_id, am.mata_kuliah_id, am.day_of_week, am.session_slot,
       am.period_month, am.period_year, am.total_meetings, am.total_hadir,
       l.name AS lecturer_name, l.nidn, mk.nama AS matkul_nama,
       mt.category_id, c.category_code,
       COALESCE(mt.hourly_rate, 0) AS tarif_per_jam,
       am.created_at, am.updated_at
FROM attendance_monthly am
JOIN lecturers l ON am.lecturer_id = l.id AND l.deleted_at IS NULL
LEFT JOIN mata_kuliah mk ON am.mata_kuliah_id = mk.id AND mk.deleted_at IS NULL
LEFT JOIN matkul_tarif mt ON (
  mt.mata_kuliah_id = am.mata_kuliah_id
  AND mt.semester = CASE
    WHEN (SELECT s.semester FROM schedules s
          WHERE s.lecturer_id = am.lecturer_id AND s.mata_kuliah_id = am.mata_kuliah_id
            AND s.day_of_week = am.day_of_week AND s.session_slot = am.session_slot
            AND s.deleted_at IS NULL LIMIT 1) IN ('2A','2B') THEN '2'
    ELSE (SELECT s.semester FROM schedules s
          WHERE s.lecturer_id = am.lecturer_id AND s.mata_kuliah_id = am.mata_kuliah_id
            AND s.day_of_week = am.day_of_week AND s.session_slot = am.session_slot
            AND s.deleted_at IS NULL LIMIT 1)
  END
)
LEFT JOIN categories c ON mt.category_id = c.id;
