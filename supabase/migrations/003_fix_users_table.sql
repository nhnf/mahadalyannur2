-- ============================================================================
-- Migration: 003_fix_users_table.sql
-- Perbaikan tabel users: tambah kolom yang hilang + fix password hash
-- ============================================================================

-- Tambah kolom yang hilang
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Set semua user yang ada menjadi aktif
UPDATE public.users SET is_active = TRUE WHERE is_active IS NULL;

-- Perbaiki hash SHA-256("admin123") yang salah (63 karakter → 64 karakter)
-- SHA-256("admin123") = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
UPDATE public.users
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE length(password_hash) != 64;

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon full access users" ON public.users;
CREATE POLICY "anon full access users" ON public.users FOR ALL TO anon USING (true) WITH CHECK (true);
