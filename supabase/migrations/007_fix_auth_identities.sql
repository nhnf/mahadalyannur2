-- ============================================================================
-- Migration: 007_fix_auth_identities.sql
-- Root cause error "Database error querying schema":
-- auth.identities kosong — Supabase Auth wajib punya identity record
-- untuk setiap user agar login bisa diproses.
-- User yang dibuat manual via SQL INSERT ke auth.users tidak otomatis
-- membuat identity, berbeda dengan user yang dibuat via Supabase Dashboard.
-- ============================================================================

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object(
    'sub',            u.id::text,
    'email',          u.email,
    'email_verified', true,
    'provider',       'email'
  ),
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);
