-- ============================================================================
-- Sistem Administrasi Ma'had Aly An-Nur II
-- Migration: 002_complete_schema.sql
-- Deskripsi: Schema lengkap yang mencerminkan implementasi aktual aplikasi.
--            Menambahkan tabel users, mata_kuliah, matkul_tarif,
--            attendance_monthly, serta memperbaiki tabel schedules dan views.
-- ============================================================================

-- ============================================================================
-- TABLE: users
-- Autentikasi custom (bukan Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(64) NOT NULL,  -- SHA-256 hex
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'hr', 'finance', 'lecturer')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: mata_kuliah
-- Master data mata kuliah
-- ============================================================================
CREATE TABLE IF NOT EXISTS mata_kuliah (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode        VARCHAR(30) UNIQUE NOT NULL,
  nama        VARCHAR(255) NOT NULL,
  sks         INT DEFAULT 2 CHECK (sks >= 0 AND sks <= 6),
  deskripsi   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matkul_kode ON mata_kuliah(kode) WHERE deleted_at IS NULL;

CREATE TRIGGER update_mata_kuliah_updated_at BEFORE UPDATE ON mata_kuliah
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: matkul_tarif
-- Tarif per jam per mata kuliah per semester (mengacu ke categories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS matkul_tarif (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mata_kuliah_id UUID NOT NULL REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  semester       VARCHAR(5) NOT NULL CHECK (semester IN ('2','4','6','8')),
  category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  hourly_rate    DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mata_kuliah_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_matkul_tarif_matkul ON matkul_tarif(mata_kuliah_id);

CREATE TRIGGER update_matkul_tarif_updated_at BEFORE UPDATE ON matkul_tarif
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ALTER TABLE: schedules
-- Tambah kolom yang dipakai aplikasi (day_of_week, semester, mata_kuliah, dll)
-- Kolom lama (schedule_date) tetap ada untuk kompatibilitas dashboard dosen
-- ============================================================================
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS day_of_week    VARCHAR(10) CHECK (day_of_week IN ('Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')),
  ADD COLUMN IF NOT EXISTS semester       VARCHAR(5)  CHECK (semester IN ('2A','2B','4','6','8')),
  ADD COLUMN IF NOT EXISTS mata_kuliah    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mata_kuliah_id UUID REFERENCES mata_kuliah(id) ON DELETE SET NULL;

-- Hapus constraint UNIQUE lama yang tidak relevan lagi (jika ada)
-- dan buat constraint baru yang sesuai pola jadwal mingguan
DO $$
BEGIN
  -- Drop constraint lama jika masih ada
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'schedules_lecturer_id_schedule_date_session_slot_key'
  ) THEN
    ALTER TABLE schedules DROP CONSTRAINT schedules_lecturer_id_schedule_date_session_slot_key;
  END IF;
END $$;

-- Unique constraint baru: 1 dosen hanya bisa 1 jadwal per hari+sesi+semester
ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_unique_weekly,
  ADD CONSTRAINT schedules_unique_weekly
    UNIQUE (lecturer_id, day_of_week, session_slot, semester);

CREATE INDEX IF NOT EXISTS idx_schedules_day_semester ON schedules(day_of_week, semester) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_matkul ON schedules(mata_kuliah_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: attendance_monthly
-- Rekap kehadiran bulanan per dosen per matkul per hari per sesi
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_monthly (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id    UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  mata_kuliah_id UUID REFERENCES mata_kuliah(id) ON DELETE SET NULL,
  day_of_week    VARCHAR(10) NOT NULL,
  session_slot   INT NOT NULL CHECK (session_slot BETWEEN 1 AND 4),
  period_month   INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year    INT NOT NULL CHECK (period_year >= 2020),
  total_meetings INT NOT NULL DEFAULT 0 CHECK (total_meetings >= 0),
  total_hadir    INT NOT NULL DEFAULT 0 CHECK (total_hadir >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lecturer_id, mata_kuliah_id, day_of_week, session_slot, period_month, period_year),
  CHECK (total_hadir <= total_meetings)
);

CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance_monthly(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_attendance_lecturer ON attendance_monthly(lecturer_id);

CREATE TRIGGER update_attendance_monthly_updated_at BEFORE UPDATE ON attendance_monthly
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: payroll (menggantikan payroll_summaries)
-- Nama tabel disesuaikan dengan yang dipakai di kode JS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id                 UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  period_month                INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year                 INT NOT NULL CHECK (period_year >= 2020),
  total_scheduled_hours       INT NOT NULL DEFAULT 0,
  total_attended_hours        INT NOT NULL DEFAULT 0,
  fixed_component_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  attendance_component_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  transportation_amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_salary                DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_finalized                BOOLEAN DEFAULT FALSE,
  finalized_at                TIMESTAMPTZ,
  finalized_by                UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lecturer_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_period  ON payroll(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_lecturer ON payroll(lecturer_id);

CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DROP & RECREATE VIEWS (sesuai schema baru)
-- ============================================================================

-- View: Lecturer with Category Info (tidak berubah, tetap valid)
CREATE OR REPLACE VIEW v_lecturers_with_category AS
SELECT
  l.id,
  l.nidn,
  l.name,
  l.email,
  l.phone,
  l.is_active,
  c.category_code,
  c.hourly_rate,
  l.created_at,
  l.updated_at
FROM lecturers l
JOIN categories c ON l.category_id = c.id
WHERE l.deleted_at IS NULL;

-- View: Schedule with Lecturer Info (diperbaiki sesuai kolom baru)
CREATE OR REPLACE VIEW v_schedules_with_lecturer AS
SELECT
  s.id,
  s.lecturer_id,
  s.day_of_week,
  s.session_slot,
  s.semester,
  s.mata_kuliah,
  s.mata_kuliah_id,
  s.status,
  s.notes,
  COALESCE(l.name, '—')          AS lecturer_name,
  l.nidn,
  c.category_code,
  c.hourly_rate,
  s.created_at,
  s.updated_at
FROM schedules s
LEFT JOIN lecturers l  ON s.lecturer_id = l.id AND l.deleted_at IS NULL
LEFT JOIN categories c ON l.category_id = c.id
WHERE s.deleted_at IS NULL;

-- View: Attendance Monthly with Lecturer & Tarif Info
CREATE OR REPLACE VIEW v_attendance_monthly AS
SELECT
  am.id,
  am.lecturer_id,
  am.mata_kuliah_id,
  am.day_of_week,
  am.session_slot,
  am.period_month,
  am.period_year,
  am.total_meetings,
  am.total_hadir,
  l.name  AS lecturer_name,
  l.nidn,
  mk.nama AS matkul_nama,
  mt.category_id,
  c.category_code,
  COALESCE(mt.hourly_rate, 0) AS tarif_per_jam,
  am.created_at,
  am.updated_at
FROM attendance_monthly am
JOIN  lecturers   l  ON am.lecturer_id    = l.id  AND l.deleted_at IS NULL
LEFT JOIN mata_kuliah mk ON am.mata_kuliah_id = mk.id AND mk.deleted_at IS NULL
LEFT JOIN matkul_tarif mt ON (
  mt.mata_kuliah_id = am.mata_kuliah_id
  AND mt.semester = CASE
    WHEN (SELECT s.semester FROM schedules s
          WHERE s.lecturer_id    = am.lecturer_id
            AND s.mata_kuliah_id = am.mata_kuliah_id
            AND s.day_of_week    = am.day_of_week
            AND s.session_slot   = am.session_slot
            AND s.deleted_at IS NULL
          LIMIT 1) IN ('2A','2B') THEN '2'
    ELSE (SELECT s.semester FROM schedules s
          WHERE s.lecturer_id    = am.lecturer_id
            AND s.mata_kuliah_id = am.mata_kuliah_id
            AND s.day_of_week    = am.day_of_week
            AND s.session_slot   = am.session_slot
            AND s.deleted_at IS NULL
          LIMIT 1)
  END
)
LEFT JOIN categories c ON mt.category_id = c.id;

-- ============================================================================
-- RLS untuk tabel baru
-- ============================================================================
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_kuliah       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matkul_tarif      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll           ENABLE ROW LEVEL SECURITY;

-- Karena auth custom (bukan Supabase Auth), gunakan service_role untuk semua
-- operasi dari backend. Untuk anon key (frontend), buka akses via policy berikut
-- yang memvalidasi session dari tabel users.

-- Sementara: buka akses penuh untuk anon (karena auth custom tidak set JWT).
-- CATATAN: Ini harus diganti dengan Supabase Auth atau custom JWT di masa depan.
CREATE POLICY "anon full access users"              ON users              FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access mata_kuliah"        ON mata_kuliah        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access matkul_tarif"       ON matkul_tarif       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access attendance_monthly" ON attendance_monthly FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access payroll"            ON payroll            FOR ALL TO anon USING (true) WITH CHECK (true);

-- Perbaiki juga policy tabel lama agar anon bisa akses (karena JWT tidak di-set)
DROP POLICY IF EXISTS "Admin full access categories" ON categories;
DROP POLICY IF EXISTS "Admin full access lecturers"  ON lecturers;
DROP POLICY IF EXISTS "Admin full access schedules"  ON schedules;
DROP POLICY IF EXISTS "Admin full access payroll"    ON payroll_summaries;
DROP POLICY IF EXISTS "Finance read categories"      ON categories;
DROP POLICY IF EXISTS "Finance read lecturers"       ON lecturers;
DROP POLICY IF EXISTS "Finance read schedules"       ON schedules;
DROP POLICY IF EXISTS "Finance manage payroll"       ON payroll_summaries;
DROP POLICY IF EXISTS "Lecturer view own payroll"    ON payroll_summaries;
DROP POLICY IF EXISTS "Lecturer view own schedules"  ON schedules;
DROP POLICY IF EXISTS "Admin view audit logs"        ON audit_logs;

CREATE POLICY "anon full access categories"  ON categories  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access lecturers"   ON lecturers   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access schedules"   ON schedules   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access audit_logs"  ON audit_logs  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED DATA: Default admin user
-- Password: admin123 (SHA-256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a)
-- GANTI PASSWORD INI SETELAH DEPLOY!
-- ============================================================================
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@mahadalyannur.ac.id', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a', 'admin'),
  ('keuangan@mahadalyannur.ac.id', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a', 'finance')
ON CONFLICT (email) DO NOTHING;
