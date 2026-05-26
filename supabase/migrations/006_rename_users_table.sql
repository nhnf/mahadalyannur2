-- ============================================================================
-- Migration: 006_rename_users_table.sql
-- Rename public.users → public.app_users
-- Alasan: nama "users" bentrok dengan auth.users internal Supabase,
-- menyebabkan error "Database error querying schema" saat login.
-- ============================================================================

ALTER TABLE public.users RENAME TO app_users;

DROP POLICY IF EXISTS "anon_login_only"         ON public.app_users;
DROP POLICY IF EXISTS "block_anon_insert_users" ON public.app_users;
DROP POLICY IF EXISTS "block_anon_update_users" ON public.app_users;
DROP POLICY IF EXISTS "block_anon_delete_users" ON public.app_users;
DROP POLICY IF EXISTS "admin_only_users"        ON public.app_users;

CREATE POLICY "admin_only_app_users" ON public.app_users
  FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr'));
