-- ============================================================================
-- Sistem Akumulasi Gaji Dosen - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2026-05-25
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: categories
-- Menyimpan kategori dosen (A, B, C) dengan tarif per jam
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_code VARCHAR(10) UNIQUE NOT NULL,
  hourly_rate DECIMAL(15,2) NOT NULL CHECK (hourly_rate > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- TABLE: lecturers
-- Menyimpan data dosen
-- ============================================================================
CREATE TABLE lecturers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  nidn VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- TABLE: schedules
-- Menyimpan jadwal mengajar dosen
-- ============================================================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  session_slot INT NOT NULL CHECK (session_slot BETWEEN 1 AND 4),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'hadir', 'absen')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(lecturer_id, schedule_date, session_slot)
);

-- ============================================================================
-- TABLE: payroll_summaries
-- Menyimpan rekap gaji bulanan per dosen
-- ============================================================================
CREATE TABLE payroll_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL CHECK (period_year >= 2020),
  
  -- Komponen Gaji
  total_scheduled_hours INT NOT NULL DEFAULT 0,
  total_attended_hours INT NOT NULL DEFAULT 0,
  fixed_component_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  attendance_component_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  transportation_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  is_finalized BOOLEAN DEFAULT FALSE,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(lecturer_id, period_month, period_year)
);

-- ============================================================================
-- TABLE: audit_logs
-- Menyimpan log perubahan data untuk audit trail
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
CREATE INDEX idx_lecturers_category ON lecturers(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lecturers_active ON lecturers(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_schedules_lecturer_date ON schedules(lecturer_id, schedule_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_schedules_date_status ON schedules(schedule_date, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_schedules_status ON schedules(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payroll_period ON payroll_summaries(period_year, period_month);
CREATE INDEX idx_payroll_lecturer ON payroll_summaries(lecturer_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);

-- ============================================================================
-- TRIGGERS for updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecturers_updated_at BEFORE UPDATE ON lecturers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_summaries_updated_at BEFORE UPDATE ON payroll_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default Categories
-- ============================================================================
INSERT INTO categories (category_code, hourly_rate, description) VALUES
  ('A', 60000.00, 'Kategori A - Dosen Senior'),
  ('B', 55000.00, 'Kategori B - Dosen Madya'),
  ('C', 50000.00, 'Kategori C - Dosen Junior');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) Setup
-- ============================================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin/HR: Full access to all tables
CREATE POLICY "Admin full access categories" ON categories FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));

CREATE POLICY "Admin full access lecturers" ON lecturers FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));

CREATE POLICY "Admin full access schedules" ON schedules FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));

CREATE POLICY "Admin full access payroll" ON payroll_summaries FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));

-- Finance: Read all, write payroll_summaries
CREATE POLICY "Finance read categories" ON categories FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr', 'finance'));

CREATE POLICY "Finance read lecturers" ON lecturers FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr', 'finance'));

CREATE POLICY "Finance read schedules" ON schedules FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr', 'finance'));

CREATE POLICY "Finance manage payroll" ON payroll_summaries FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr', 'finance'));

-- Lecturer: View own data only
CREATE POLICY "Lecturer view own payroll" ON payroll_summaries FOR SELECT TO authenticated
  USING (
    lecturer_id IN (
      SELECT id FROM lecturers WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Lecturer view own schedules" ON schedules FOR SELECT TO authenticated
  USING (
    lecturer_id IN (
      SELECT id FROM lecturers WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Audit logs: Admin only
CREATE POLICY "Admin view audit logs" ON audit_logs FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'hr'));

-- ============================================================================
-- VIEWS for Common Queries
-- ============================================================================

-- View: Lecturer with Category Info
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

-- View: Schedule with Lecturer Info
CREATE OR REPLACE VIEW v_schedules_with_lecturer AS
SELECT 
  s.id,
  s.schedule_date,
  s.session_slot,
  s.status,
  s.notes,
  l.name AS lecturer_name,
  l.nidn,
  c.category_code,
  c.hourly_rate,
  s.created_at,
  s.updated_at
FROM schedules s
JOIN lecturers l ON s.lecturer_id = l.id
JOIN categories c ON l.category_id = c.id
WHERE s.deleted_at IS NULL;

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================
COMMENT ON TABLE categories IS 'Kategori dosen dengan tarif per jam';
COMMENT ON TABLE lecturers IS 'Data dosen';
COMMENT ON TABLE schedules IS 'Jadwal mengajar dosen';
COMMENT ON TABLE payroll_summaries IS 'Rekap gaji bulanan per dosen';
COMMENT ON TABLE audit_logs IS 'Log audit untuk tracking perubahan data';
