-- ============================================================================
-- Migration: 011_payroll_details_table.sql
-- Tabel detail payroll per mata kuliah per kategori.
-- Memungkinkan satu dosen punya beberapa kategori sesuai matkul yang diajar.
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_details (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id     UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  lecturer_id    UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  mata_kuliah_id UUID REFERENCES mata_kuliah(id) ON DELETE SET NULL,
  matkul_nama    VARCHAR(255),
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_code  VARCHAR(10),
  tarif_per_jam  DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_meetings INT NOT NULL DEFAULT 0,
  total_hadir    INT NOT NULL DEFAULT 0,
  fixed_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  attend_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,
  period_month   INT NOT NULL,
  period_year    INT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_details_payroll  ON payroll_details(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_lecturer ON payroll_details(lecturer_id);

ALTER TABLE payroll_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_payroll_details" ON payroll_details
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_write_payroll_details" ON payroll_details
  FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr','finance'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hr','finance'));
