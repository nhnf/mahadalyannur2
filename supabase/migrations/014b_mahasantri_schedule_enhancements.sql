-- ============================================================================
-- SIMKURMA Migration 014 (CORRECTED): Mahasantri + Schedule Enhancements
-- Compatible with LIVE remote database schema
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================

-- Create or replace the app_role function matching existing JWT pattern
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_role TEXT;
BEGIN
  raw_role := COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role',
    ''
  );
  raw_role := btrim(lower(raw_role));

  IF raw_role = '' THEN
    RETURN 'viewer';
  END IF;

  RETURN raw_role;
END;
$$;

-- Helper: check if user has any of the given roles
CREATE OR REPLACE FUNCTION public.has_role(roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (SELECT public.app_role()) = ANY(roles);
$$;

-- ============================================================================
-- 2. SCHEDULE_SLOTS — Blocked Slots & Status
-- ============================================================================
-- Uses day_of_week (varchar) and session_slot (smallint) matching live schema
CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week VARCHAR NOT NULL,
  session_slot SMALLINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reserve', 'blocked')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (day_of_week, session_slot)
);

ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;

-- Populate schedule_slots for all known day x slot combinations
INSERT INTO schedule_slots (day_of_week, session_slot, status, reason)
SELECT d, s,
  CASE
    WHEN d = 'Kamis' AND s = 4 THEN 'blocked'
    ELSE 'active'
  END,
  CASE
    WHEN d = 'Kamis' AND s = 4 THEN 'Kamis malam tidak diperbolehkan'
    ELSE NULL
  END
FROM (
  VALUES ('Senin'), ('Selasa'), ('Rabu'), ('Kamis'), ('Jumat'), ('Sabtu'), ('Ahad')
) AS days(d)
CROSS JOIN (VALUES (1::smallint), (2::smallint), (3::smallint), (4::smallint)) AS slots(s)
ON CONFLICT (day_of_week, session_slot) DO NOTHING;

-- RLS for schedule_slots
DROP POLICY IF EXISTS "auth_read_schedule_slots" ON schedule_slots;
CREATE POLICY "auth_read_schedule_slots" ON schedule_slots
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_write_schedule_slots" ON schedule_slots;
CREATE POLICY "auth_write_schedule_slots" ON schedule_slots
  FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY(ARRAY['admin'::text, 'hr'::text]))
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY(ARRAY['admin'::text, 'hr'::text]));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_schedule_slots_updated_at ON schedule_slots;
CREATE TRIGGER update_schedule_slots_updated_at BEFORE UPDATE ON schedule_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. TABEL MAHASANTRI
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mahasantri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nim TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  angkatan TEXT,
  semester VARCHAR(10),
  classroom VARCHAR(50),
  gender TEXT CHECK (gender IN ('putra', 'putri')),
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.mahasantri ENABLE ROW LEVEL SECURITY;

-- RLS: Admin can CRUD, authenticated can read
DROP POLICY IF EXISTS "auth_read_mahasantri" ON mahasantri;
CREATE POLICY "auth_read_mahasantri" ON mahasantri
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "auth_write_mahasantri" ON mahasantri;
CREATE POLICY "auth_write_mahasantri" ON mahasantri
  FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY(ARRAY['admin'::text, 'hr'::text]))
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY(ARRAY['admin'::text, 'hr'::text]));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mahasantri_nim ON mahasantri(nim) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mahasantri_classroom ON mahasantri(classroom) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mahasantri_semester ON mahasantri(semester) WHERE deleted_at IS NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_mahasantri_updated_at ON mahasantri;
CREATE TRIGGER update_mahasantri_updated_at BEFORE UPDATE ON mahasantri
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. ADD CLASSROOM_ID TO SCHEDULES (optional column for grouping)
-- ============================================================================
-- Add classroom/semester grouping to schedules if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedules' AND column_name = 'classroom'
  ) THEN
    ALTER TABLE public.schedules ADD COLUMN classroom VARCHAR(50);
  END IF;
END $$;

-- ============================================================================
-- 5. VIEW UNTUK JADWAL MAHASANTRI
-- ============================================================================
-- Compatible with existing schedules structure (day_of_week, session_slot, semester, mata_kuliah)
CREATE OR REPLACE VIEW v_mahasantri_schedule AS
SELECT
  m.id AS mahasantri_id,
  m.nim,
  m.nama AS mahasantri_nama,
  m.semester,
  m.classroom,
  s.id AS schedule_id,
  s.day_of_week,
  s.session_slot,
  CASE s.session_slot
    WHEN 1 THEN 'Pagi 1'
    WHEN 2 THEN 'Pagi 2'
    WHEN 3 THEN 'Sore'
    WHEN 4 THEN 'Malam'
    ELSE 'Unknown'
  END AS session_name,
  CASE s.session_slot
    WHEN 1 THEN '08:00 - 09:40'
    WHEN 2 THEN '10:00 - 11:40'
    WHEN 3 THEN '13:30 - 15:10'
    WHEN 4 THEN '19:30 - 21:10'
    ELSE '-'
  END AS time_range,
  s.mata_kuliah AS mata_kuliah_nama,
  s.mata_kuliah_id,
  s.lecturer_id,
  l.name AS lecturer_name,
  s.status AS schedule_status,
  s.notes
FROM mahasantri m
JOIN schedules s ON (
  s.semester = m.semester
  AND (s.classroom = m.classroom OR s.classroom IS NULL OR m.classroom IS NULL)
  AND s.deleted_at IS NULL
)
LEFT JOIN lecturers l ON l.id = s.lecturer_id AND l.deleted_at IS NULL
WHERE m.deleted_at IS NULL
  AND m.is_active = true
ORDER BY
  CASE s.day_of_week
    WHEN 'Ahad' THEN 1
    WHEN 'Senin' THEN 2
    WHEN 'Selasa' THEN 3
    WHEN 'Rabu' THEN 4
    WHEN 'Kamis' THEN 5
    WHEN 'Jumat' THEN 6
    WHEN 'Sabtu' THEN 7
    ELSE 99
  END,
  s.session_slot;

-- ============================================================================
-- 6. GRANT ACCESS TO VIEW
-- ============================================================================
GRANT SELECT ON v_mahasantri_schedule TO authenticated;
GRANT SELECT ON v_mahasantri_schedule TO anon;

-- ============================================================================
-- DONE: Migration 014 (Corrected for live schema)
-- ============================================================================
