-- ============================================================================
-- Migration: 010_add_lecturers_category_fk.sql
-- Tambah FK lecturers → categories yang hilang.
-- Diperlukan agar PostgREST bisa resolve nested join
-- lecturers(categories(category_code)) tanpa error PGRST200.
-- ============================================================================

ALTER TABLE public.lecturers
  ADD CONSTRAINT lecturers_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;
