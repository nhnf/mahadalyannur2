# Panduan Testing — Sistem Administrasi Ma'had Aly An-Nur II

## Setup Awal

### 1. Konfigurasi Supabase
1. Salin `config.example.js` menjadi `config.js`
2. Isi `SUPABASE_URL` dan `SUPABASE_ANON` dari Supabase Dashboard → Project Settings → API
3. Jalankan migration di Supabase Dashboard → SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_complete_schema.sql`

### 2. Akun Default (dari seed data migration)
| Email | Password | Role |
|-------|----------|------|
| admin@mahadalyannur.ac.id | admin123 | Admin |
| keuangan@mahadalyannur.ac.id | admin123 | Finance |

> **Penting:** Ganti password default setelah pertama kali login!

---

## Alur Testing

### A. Login
1. Buka `index.html`
2. Login dengan akun admin
3. Pastikan redirect ke `dashboard-admin.html`
4. Login dengan akun keuangan → redirect ke `dashboard-finance.html`
5. Coba login dengan password salah → muncul pesan error

### B. Kategori
1. Buka halaman Kategori
2. Tambah kategori baru (kode, tarif, deskripsi)
3. Edit kategori yang ada
4. Coba hapus kategori yang masih dipakai dosen → harus muncul error

### C. Mata Kuliah
1. Tambah beberapa mata kuliah (kode unik, nama, SKS)
2. Buka tab "Tarif per Semester" → set kategori untuk setiap matkul per semester
3. Klik "Simpan Semua"

### D. Dosen
1. Tambah dosen baru — **wajib pilih Kategori**
2. Pastikan NIDN 10 digit angka
3. Edit dosen → ubah kategori
4. Cari dosen via search box

### E. Jadwal
1. Tambah jadwal — pilih hari, semester, sesi (bisa multi-sesi)
2. Pilih dosen dan mata kuliah
3. Pastikan grid jadwal tampil dengan benar (kolom = semester, baris = hari+sesi)
4. Edit jadwal → ubah dosen
5. Filter jadwal per dosen

### F. Presensi
1. Pilih bulan dan tahun → klik Tampilkan
2. Sistem otomatis generate baris presensi dari jadwal aktif
3. Isi jumlah hadir untuk setiap baris
4. Klik "Simpan Presensi"
5. Coba "Hadir Semua" → semua hadir = pertemuan
6. Coba "Reset" → semua hadir = 0
7. Buka tab "Rekap Kehadiran" → tampil persentase per dosen

### G. Payroll
1. Pastikan presensi sudah diisi
2. Pilih bulan dan tahun → klik "Hitung Payroll"
3. Tabel payroll muncul dengan rincian gaji
4. Klik ikon mata → modal detail gaji
5. Klik ikon print → slip gaji terbuka di tab baru
6. Klik "Export CSV" → file CSV terunduh

### H. Dashboard Keuangan
1. Login sebagai keuangan
2. Dashboard menampilkan total gaji bulan ini
3. Halaman Payroll → pilih periode → tampilkan
4. Export CSV dari halaman keuangan
5. Laporan → pilih tipe → download

### I. Portal Dosen
1. Tambah user dosen di tabel `users` (via Supabase Dashboard atau SQL)
2. Pastikan email user sama dengan email di tabel `lecturers`
3. Login sebagai dosen → tampil profil dan jadwal
4. Halaman Slip Gaji → pilih periode → tampilkan

---

## Checklist Keamanan

- [ ] `config.js` tidak ter-commit ke git (ada di `.gitignore`)
- [ ] Password default sudah diganti
- [ ] Session expired setelah 8 jam tidak aktif
- [ ] Data dari database di-escape sebelum ditampilkan (XSS prevention)

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "Konfigurasi Supabase tidak ditemukan" | Pastikan `config.js` ada dan berisi nilai yang benar |
| Semua query error 404 | Jalankan kedua file migration di Supabase |
| Login selalu gagal | Pastikan tabel `users` ada dan berisi data seed |
| Tambah dosen gagal | Pastikan kategori dipilih (wajib) |
| Presensi tidak muncul | Pastikan jadwal sudah ditambahkan dengan dosen |
