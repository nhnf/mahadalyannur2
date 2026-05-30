-- ============================================================================
-- Migration: 009_fix_payroll_rls.sql
-- Fix: "permission denied for table users" saat akses payroll
-- Policy lama punya subquery ke auth.users yang tidak bisa diakses
-- oleh role authenticated. Diganti dengan policy sederhana.
-- ============================================================================

DROP POLICY IF EXISTS "auth_read_payroll"  ON public.payroll;
DROP POLICY IF EXISTS "auth_write_payroll" ON public.payroll;

-- Semua user login bisa baca payroll
CREATE POLICY "auth_read_payroll" ON public.payroll
  FOR SELECT TO authenticated
  USING (true);

-- Hanya admin/hr/finance yang bisa write/delete
CREATE POLICY "auth_write_payroll" ON public.payroll
  FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr','finance'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr','finance'));
