-- ============================================================================
-- Migration: 008_fix_null_auth_tokens.sql
-- Root cause "Database error querying schema" (HTTP 500 saat login):
-- User yang dibuat manual via SQL INSERT ke auth.users memiliki NULL
-- di kolom token (confirmation_token, recovery_token, dll).
-- Supabase Auth tidak bisa scan kolom NULL ke string → crash dengan 500.
-- Referensi: https://supabase.com/docs/guides/troubleshooting/scan-error-on-column-confirmation_token
-- ============================================================================

UPDATE auth.users 
SET 
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change               = COALESCE(email_change, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change_token_new IS NULL;
