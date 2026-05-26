# Testing Guide - Payroll Feature

## Prerequisites

✅ **Pastikan sudah setup:**
1. Apps Script sudah di-deploy sebagai Web App
2. SampleData.gs sudah di-run (`setupWithSampleData()`)
3. Web App URL sudah diupdate di `appscript-client.js`
4. HTML files sudah menggunakan `appscript-client.js`

## Step-by-Step Testing

### 1. Buka Aplikasi

```
File: c:\Users\hnf\Documents\VibeCoding\GajiDosen\index.html
```

**Cara buka:**
- Double-click index.html, ATAU
- Right-click > Open with > Browser, ATAU
- Drag file ke browser

### 2. Login

**Credentials:**
- Email: `admin@example.com`
- Password: `admin123`

**Expected Result:**
- ✅ Redirect ke dashboard-admin.html
- ✅ Muncul sidebar dengan menu
- ✅ Dashboard menampilkan statistik

### 3. Cek Data Dosen

**Steps:**
1. Klik menu **"Dosen"** di sidebar
2. Lihat tabel dosen

**Expected Result:**
- ✅ Muncul 10 dosen sample
- ✅ Ada kolom: NIDN, Nama, Kategori, Email, Telepon, Status
- ✅ Bisa search dan filter

### 4. Cek Jadwal

**Steps:**
1. Klik menu **"Jadwal"** di sidebar
2. Pilih bulan dan tahun (bulan ini)
3. Klik "Terapkan"

**Expected Result:**
- ✅ Muncul jadwal-jadwal dosen
- ✅ Ada status: Pending, Hadir, Absen
- ✅ Bisa filter by dosen

### 5. Test Payroll Calculation

**Steps:**
1. Klik menu **"Payroll"** di sidebar
2. Pilih bulan: **Mei** (atau bulan sekarang)
3. Pilih tahun: **2026**
4. Klik tombol **"Hitung Payroll"**
5. Tunggu proses (bisa 5-10 detik)

**Expected Result:**
- ✅ Muncul toast notification "Payroll berhasil dihitung"
- ✅ Tabel payroll terisi dengan data
- ✅ Kolom yang muncul:
  - Nama Dosen
  - Kategori
  - Jam Jadwal
  - Jam Hadir
  - Gaji Tetap
  - Gaji Kehadiran
  - Transport
  - Total Gaji

### 6. Verifikasi Perhitungan

**Pilih salah satu dosen dan cek manual:**

Contoh: Dr. Ahmad Suryadi (Kategori A, Rp60.000/jam)

**Jika dia punya:**
- 10 jam terjadwal
- 8 jam hadir
- 3 hari mengajar (3 jam, 2 jam, 3 jam)

**Perhitungan:**
```
Gaji Tetap = 10 × (60000 × 0.5) = 10 × 30000 = Rp300.000
Gaji Kehadiran = 8 × (60000 × 0.5) = 8 × 30000 = Rp240.000

Transport:
- Hari 1: 3 jam = 15000 + (2 × 5000) = Rp25.000
- Hari 2: 2 jam = 15000 + (1 × 5000) = Rp20.000
- Hari 3: 3 jam = 15000 + (2 × 5000) = Rp25.000
Total Transport = Rp70.000

TOTAL GAJI = 300.000 + 240.000 + 70.000 = Rp610.000
```

**Cek di tabel apakah angkanya sesuai!**

### 7. Test Export Excel

**Steps:**
1. Di halaman Payroll (setelah ada data)
2. Klik tombol **"Export Excel"**

**Expected Result:**
- ✅ File CSV terdownload
- ✅ Nama file: `Payroll_Mei_2026.csv`
- ✅ Isi file sesuai dengan data di tabel

### 8. Cek Data di Spreadsheet

**Steps:**
1. Buka spreadsheet Anda
2. Buka sheet **"Payroll"**

**Expected Result:**
- ✅ Ada data payroll yang baru dihitung
- ✅ Kolom terisi lengkap
- ✅ Angka sesuai dengan yang di website

## Troubleshooting

### Error: "Failed to fetch" atau "Network Error"

**Penyebab:**
- Web App URL salah
- Apps Script belum di-deploy
- CORS issue

**Solusi:**
1. Cek `appscript-client.js` line 15 - pastikan URL benar
2. Re-deploy Apps Script (Deploy > Manage Deployments > Edit > Deploy)
3. Pastikan "Who has access" = Anyone

### Error: "Cannot read property"

**Penyebab:**
- Sheet belum dibuat
- Data belum ada

**Solusi:**
1. Run `setupSpreadsheet()` di Apps Script
2. Run `setupWithSampleData()` untuk data sample

### Payroll tidak muncul setelah "Hitung Payroll"

**Penyebab:**
- Tidak ada jadwal untuk periode tersebut
- Error di Apps Script

**Solusi:**
1. Cek Apps Script Logs (View > Logs)
2. Pastikan ada jadwal di bulan yang dipilih
3. Run `addSampleSchedules()` untuk tambah jadwal

### Data tidak sesuai perhitungan manual

**Penyebab:**
- Logika perhitungan salah
- Data jadwal tidak lengkap

**Solusi:**
1. Cek sheet Schedules - pastikan data lengkap
2. Cek Payroll.gs - verifikasi formula
3. Test dengan `testPayrollCalculation()` di Apps Script

## Test Checklist

Centang setelah berhasil:

- [ ] Login berhasil
- [ ] Dashboard muncul dengan statistik
- [ ] Menu Kategori menampilkan A, B, C
- [ ] Menu Dosen menampilkan 10 dosen
- [ ] Menu Jadwal menampilkan jadwal bulan ini
- [ ] Menu Presensi bisa update status
- [ ] Menu Payroll bisa hitung gaji
- [ ] Hasil perhitungan sesuai formula
- [ ] Export Excel berhasil
- [ ] Data tersimpan di spreadsheet

## Next Steps

Setelah semua test berhasil:

1. ✅ Tambah dosen real (ganti sample data)
2. ✅ Input jadwal real
3. ✅ Update presensi setiap hari
4. ✅ Hitung payroll di akhir bulan
5. ✅ Export dan cetak slip gaji

## Support

Jika ada error:
1. Buka Browser Console (F12)
2. Lihat error message
3. Cek Apps Script Logs
4. Screenshot dan tanyakan ke developer
