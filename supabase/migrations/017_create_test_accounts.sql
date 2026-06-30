-- ============================================================================
-- Migration: 017_create_test_accounts.sql
-- Create test accounts in Supabase Auth for all roles
-- Password default: admin123 — GANTI SETELAH TESTING
-- ============================================================================

-- ── HAPUS USER LAMA YANG BERMASALAH (jika ada) ──────────────────────────────
-- Hapus identities dulu (FK constraint), lalu user
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'admin@mahadalyannur.ac.id',
    'kurikulum@mahadalyannur.ac.id',
    'operator@mahadalyannur.ac.id',
    'dosen@mahadalyannur.ac.id',
    'santri@mahadalyannur.ac.id',
    'keuangan@mahadalyannur.ac.id'
  )
);
DELETE FROM auth.users WHERE email IN (
  'admin@mahadalyannur.ac.id',
  'kurikulum@mahadalyannur.ac.id',
  'operator@mahadalyannur.ac.id',
  'dosen@mahadalyannur.ac.id',
  'santri@mahadalyannur.ac.id',
  'keuangan@mahadalyannur.ac.id'
);

-- ── 1. Super Admin ──────────────────────────────────────────────────────────
DO $$
DECLARE
  uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    uid, '00000000-0000-0000-0000-000000000000',
    'admin@mahadalyannur.ac.id', crypt('admin123', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"name":"Administrator"}'::jsonb,
    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), uid, 'admin@mahadalyannur.ac.id', 'email',
    jsonb_build_object('sub', uid::text, 'email', 'admin@mahadalyannur.ac.id', 'email_verified', true, 'provider', 'email'),
    NOW(), NOW(), NOW()
  );
END $$;

-- ── 2. Admin Kurikulum ──────────────────────────────────────────────────────
DO $$
DECLARE
  uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    uid, '00000000-0000-0000-0000-000000000000',
    'kurikulum@mahadalyannur.ac.id', crypt('admin123', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"],"role":"hr"}'::jsonb,
    '{"name":"Admin Kurikulum"}'::jsonb,
    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), uid, 'kurikulum@mahadalyannur.ac.id', 'email',
    jsonb_build_object('sub', uid::text, 'email', 'kurikulum@mahadalyannur.ac.id', 'email_verified', true, 'provider', 'email'),
    NOW(), NOW(), NOW()
  );
END $$;

-- ── 3. Operator Jadwal ──────────────────────────────────────────────────────
DO $$
DECLARE
  uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    uid, '00000000-0000-0000-0000-000000000000',
    'operator@mahadalyannur.ac.id', crypt('admin123', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"],"role":"finance"}'::jsonb,
    '{"name":"Operator Jadwal"}'::jsonb,
    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), uid, 'operator@mahadalyannur.ac.id', 'email',
    jsonb_build_object('sub', uid::text, 'email', 'operator@mahadalyannur.ac.id', 'email_verified', true, 'provider', 'email'),
    NOW(), NOW(), NOW()
  );
END $$;

-- ── 4. Dosen (Viewer/Lecturer) ──────────────────────────────────────────────
DO $$
DECLARE
  uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    uid, '00000000-0000-0000-0000-000000000000',
    'dosen@mahadalyannur.ac.id', crypt('admin123', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"],"role":"lecturer"}'::jsonb,
    '{"name":"Dosen"}'::jsonb,
    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), uid, 'dosen@mahadalyannur.ac.id', 'email',
    jsonb_build_object('sub', uid::text, 'email', 'dosen@mahadalyannur.ac.id', 'email_verified', true, 'provider', 'email'),
    NOW(), NOW(), NOW()
  );
END $$;

-- ── 5. Mahasantri ───────────────────────────────────────────────────────────
DO $$
DECLARE
  uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, aud, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    uid, '00000000-0000-0000-0000-000000000000',
    'santri@mahadalyannur.ac.id', crypt('admin123', gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"],"role":"mahasantri"}'::jsonb,
    '{"name":"Mahasantri"}'::jsonb,
    NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), uid, 'santri@mahadalyannur.ac.id', 'email',
    jsonb_build_object('sub', uid::text, 'email', 'santri@mahadalyannur.ac.id', 'email_verified', true, 'provider', 'email'),
    NOW(), NOW(), NOW()
  );
END $$;
