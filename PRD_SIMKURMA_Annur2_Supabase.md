# PRD — SIMKURMA An-Nur 2 dengan Supabase

## 1. Nama Produk

**SIMKURMA An-Nur 2**  
**Sistem Informasi Kurikulum Ma’had Aly An-Nur 2**

SIMKURMA An-Nur 2 adalah aplikasi web untuk mengelola kurikulum, dosen, mata kuliah, kelas, semester, ketersediaan dosen, aturan akademik, dan auto-generate jadwal kuliah berbasis aturan.

Database utama menggunakan:

```text
Supabase PostgreSQL
```

---

## 2. Latar Belakang

Penyusunan jadwal kuliah Ma’had Aly An-Nur 2 memiliki banyak variabel, di antaranya:

- Pemisahan kelas putra dan putri.
- Beberapa semester memiliki kelas paralel A dan B.
- Tidak semua semester wajib memiliki kelas A dan B.
- Setiap mata kuliah memiliki jumlah pertemuan mingguan.
- Setiap dosen memiliki kemampuan mengajar mata kuliah tertentu.
- Setiap dosen memiliki ketersediaan waktu berbeda-beda.
- Setiap dosen memiliki kategori, misalnya Dosen Pakar, Dosen Senior, Dosen Reguler, Dosen Kader, atau Dosen Tamu.
- Beberapa semester mengutamakan kategori dosen tertentu, misalnya Semester 7 mengutamakan Dosen Pakar.
- Beberapa mata kuliah lebih cocok diletakkan di jam pagi.
- Ada slot waktu yang tidak boleh dipakai, seperti Kamis malam, Jumat pagi jam ke-1, Jumat pagi jam ke-2, dan Jumat sore.
- Jadwal tidak boleh bentrok antara dosen, kelas, dan ruang.
- Jadwal yang sudah disepakati perlu bisa dikunci agar tidak berubah saat generate ulang.

Karena banyaknya aturan, penyusunan jadwal secara manual rentan terhadap:

- Jadwal bentrok.
- Dosen terlalu padat.
- Kelas terlalu padat di hari tertentu.
- Mata kuliah penting tidak mendapat slot ideal.
- Dosen pakar terpakai untuk semester bawah sehingga semester atas kekurangan.
- Jadwal ulang merusak jadwal yang sudah disepakati.

Oleh karena itu, dibutuhkan sistem web yang dapat mengelola data kurikulum dan membuat jadwal otomatis dengan tetap memberikan kendali kepada admin.

---

## 3. Tujuan Produk

Tujuan utama sistem ini adalah:

1. Memudahkan pengelolaan data kurikulum Ma’had Aly An-Nur 2.
2. Memudahkan pengelolaan data dosen, mata kuliah, semester, kelas, dan slot waktu.
3. Memisahkan jadwal antara putra dan putri.
4. Mendukung kelas paralel A dan B pada semester tertentu.
5. Membuat jadwal kuliah otomatis berdasarkan aturan akademik.
6. Mencegah bentrok jadwal dosen, kelas, dan ruang.
7. Mengutamakan kategori dosen tertentu pada semester tertentu.
8. Mengutamakan mata kuliah tertentu pada jam tertentu.
9. Memberikan hasil generate dalam bentuk draft agar bisa diperiksa admin.
10. Menyediakan fitur lock jadwal agar jadwal penting tidak berubah.
11. Menyediakan laporan jadwal per kelas, per dosen, per semester, dan per jenis santri.
12. Menyediakan log alasan hasil generate agar admin memahami keputusan sistem.
13. Memanfaatkan Supabase PostgreSQL sebagai database utama.
14. Memanfaatkan Supabase Auth dan Row Level Security untuk keamanan data.

---

## 4. Target Pengguna

### 4.1 Super Admin

Pengguna dengan akses penuh.

Hak akses:

- Mengelola semua data.
- Mengelola user dan role.
- Mengatur aturan generate jadwal.
- Menjalankan generate jadwal.
- Melihat semua laporan.
- Mengunci dan membuka jadwal.
- Mengatur konfigurasi sistem.

### 4.2 Admin Kurikulum

Pengguna utama sistem.

Hak akses:

- Mengelola tahun akademik.
- Mengelola semester.
- Mengelola kelas.
- Mengelola mata kuliah.
- Mengelola dosen.
- Mengelola kategori dosen.
- Mengelola kurikulum per kelas.
- Mengelola aturan dosen.
- Mengelola ketersediaan dosen.
- Menjalankan generate jadwal.
- Melihat log generate.
- Mengedit hasil jadwal.
- Mencetak jadwal.

### 4.3 Operator Jadwal

Pengguna yang membantu input dan pengecekan jadwal.

Hak akses:

- Melihat data master.
- Input jadwal manual.
- Edit jadwal draft.
- Melihat hasil generate.
- Melihat jadwal putra dan putri.
- Cetak jadwal.

Operator tidak boleh mengubah aturan utama generate tanpa izin.

### 4.4 Viewer

Pengguna hanya baca.

Hak akses:

- Melihat jadwal.
- Melihat jadwal per kelas.
- Melihat jadwal per dosen.
- Mencetak jadwal jika diizinkan.

---

## 5. Ruang Lingkup Produk

### 5.1 Termasuk dalam Produk

Sistem mencakup:

- Login dan manajemen user.
- Manajemen tahun akademik.
- Manajemen semester.
- Manajemen kelas.
- Dukungan kelas putra dan putri.
- Dukungan kelas paralel A dan B.
- Manajemen dosen.
- Manajemen kategori dosen.
- Manajemen mata kuliah.
- Manajemen kurikulum per kelas.
- Manajemen dosen pengampu mata kuliah.
- Manajemen ketersediaan dosen.
- Manajemen slot waktu.
- Manajemen slot aktif, cadangan, dan terblokir.
- Manajemen prioritas waktu mata kuliah.
- Manajemen aturan kategori dosen per semester.
- Generate jadwal otomatis.
- Validasi bentrok jadwal.
- Lock jadwal.
- Draft hasil generate.
- Log generate.
- Jadwal manual.
- Jadwal per kelas.
- Jadwal per dosen.
- Jadwal putra.
- Jadwal putri.
- Export PDF.
- Export Excel.
- Supabase Auth.
- Supabase Row Level Security.
- Supabase Storage untuk file export jika dibutuhkan.

### 5.2 Tidak Termasuk dalam MVP Awal

Fitur berikut dapat masuk tahap lanjutan:

- Integrasi WhatsApp.
- Notifikasi otomatis ke dosen.
- Absensi perkuliahan.
- Penilaian mahasiswa.
- KRS mahasiswa.
- Aplikasi mobile.
- Integrasi Google Calendar.
- Optimasi menggunakan Python OR-Tools.
- AI recommendation untuk perbaikan jadwal.

---

## 6. Struktur Akademik

Sistem harus mendukung struktur berikut:

```text
Tahun Akademik
  → Semester
    → Jenis Santri: Putra / Putri
      → Kelas Paralel: A / B / kosong
        → Mata Kuliah
          → Dosen
          → Jadwal
```

Contoh struktur kelas:

```text
Semester 1 A Putra
Semester 1 B Putra
Semester 1 A Putri
Semester 1 B Putri

Semester 2 A Putra
Semester 2 B Putra
Semester 2 A Putri
Semester 2 B Putri

Semester 3 Putra
Semester 3 Putri

Semester 7 Putra
Semester 7 Putri
```

Catatan:

- Tidak semua semester wajib memiliki kelas A dan B.
- Admin dapat menentukan apakah sebuah semester memiliki kelas tunggal, kelas A saja, atau kelas A dan B.
- Putra dan putri selalu dipisah sebagai kelas berbeda.
- Jadwal putra dan putri dapat memiliki dosen, mata kuliah, dan slot waktu yang berbeda.
- Kelas A dan B boleh memiliki kurikulum sama atau berbeda sesuai kebutuhan.

---

## 7. Slot Waktu Perkuliahan

Sistem menggunakan slot waktu sebagai berikut:

1. Pagi Jam ke-1
2. Pagi Jam ke-2
3. Sore
4. Malam

Hari aktif:

1. Sabtu
2. Ahad
3. Senin
4. Selasa
5. Rabu
6. Kamis
7. Jumat

Slot yang tidak boleh digunakan:

```text
Kamis Malam
Jumat Pagi Jam ke-1
Jumat Pagi Jam ke-2
Jumat Sore
```

Jumat malam dapat dibuat aktif atau cadangan sesuai kebijakan admin.

---

## 8. Revisi Teknologi

### 8.1 Stack Utama yang Disarankan

```text
Frontend/Admin Panel : Next.js / React / Laravel
Database            : Supabase PostgreSQL
Auth                : Supabase Auth
Authorization       : Supabase Row Level Security
File Storage        : Supabase Storage
Backend Logic       : Supabase Edge Functions / Laravel Service / Next.js API Route
Export PDF/Excel    : Backend service terpisah
Scheduler Engine    : Greedy + Scoring
```

### 8.2 Opsi Stack

| Opsi | Kelebihan | Catatan |
|---|---|---|
| Next.js + Supabase | Lebih natural dengan Supabase Auth, API, dan RLS | Cocok untuk web modern |
| Laravel + Supabase PostgreSQL | Cocok jika ingin struktur Laravel dan service class | Supabase dipakai sebagai PostgreSQL remote |
| Laravel + Filament + Supabase PostgreSQL | Admin panel cepat dibuat | Perlu koneksi PostgreSQL dan penyesuaian auth/role |

### 8.3 Rekomendasi untuk SIMKURMA

Untuk kebutuhan internal Ma’had Aly An-Nur 2, rekomendasi paling cepat dan stabil:

```text
Laravel + Filament + Supabase PostgreSQL
```

Alasan:

- CRUD admin sangat banyak.
- Filament mempercepat pembuatan panel.
- Laravel nyaman untuk algoritma generate jadwal.
- Supabase tetap dipakai sebagai PostgreSQL database.
- Export PDF/Excel lebih mudah dari Laravel.

Jika ingin full modern dan dekat dengan ekosistem Supabase:

```text
Next.js + Supabase
```

---

## 9. Posisi Supabase dalam Sistem

Supabase digunakan untuk:

1. Menyimpan semua data akademik.
2. Menyimpan data dosen.
3. Menyimpan data kurikulum.
4. Menyimpan data kelas putra/putri.
5. Menyimpan data kelas A/B.
6. Menyimpan aturan generate jadwal.
7. Menyimpan hasil jadwal.
8. Menyimpan log generate.
9. Mengelola user login.
10. Mengatur hak akses dengan RLS.
11. Menyimpan file export jika dibutuhkan.
12. Menyediakan API otomatis untuk frontend.

---

## 10. Arsitektur Sistem

### 10.1 Arsitektur Umum

```text
User/Admin
   ↓
Frontend Web
Next.js / Laravel Blade / Filament
   ↓
Supabase Auth
   ↓
Supabase PostgreSQL + RLS
   ↓
Scheduler Service
Edge Function / API Route / Laravel Service
   ↓
Draft Jadwal + Log Generate
```

### 10.2 Arsitektur Jika Menggunakan Next.js

```text
Next.js App
  ├─ Login menggunakan Supabase Auth
  ├─ Dashboard admin
  ├─ CRUD data akademik
  ├─ Halaman generate jadwal
  ├─ Memanggil Supabase RPC / Edge Function
  └─ Export PDF/Excel

Supabase
  ├─ PostgreSQL database
  ├─ Auth
  ├─ RLS policies
  ├─ Storage
  ├─ Edge Functions
  └─ RPC functions
```

### 10.3 Arsitektur Jika Menggunakan Laravel

```text
Laravel App
  ├─ Filament Admin Panel
  ├─ Laravel Auth atau Supabase Auth
  ├─ Service generate jadwal
  ├─ Export PDF/Excel
  └─ Koneksi ke Supabase PostgreSQL

Supabase
  ├─ PostgreSQL database
  ├─ Backup database
  ├─ SQL policies
  └─ Storage jika dibutuhkan
```

Catatan:

Jika memakai Laravel + Filament, Supabase dapat diperlakukan sebagai PostgreSQL remote database. Jika ingin memanfaatkan Supabase Auth dan RLS secara penuh, stack Next.js + Supabase biasanya lebih sederhana.

---

## 11. Modul Produk

### 11.1 Modul Login dan Role Permission

Fungsi:

- Login.
- Logout.
- Manajemen user.
- Manajemen role.
- Hak akses per role.

Role awal:

- Super Admin
- Admin Kurikulum
- Operator Jadwal
- Viewer

### 11.2 Modul Tahun Akademik

Fungsi:

- Tambah tahun akademik.
- Edit tahun akademik.
- Nonaktifkan tahun akademik.
- Menentukan tahun akademik aktif.

Field:

```text
id
name
start_year
end_year
is_active
created_at
updated_at
```

Contoh:

```text
2026/2027
```

### 11.3 Modul Semester

Fungsi:

- Tambah semester.
- Edit semester.
- Mengatur urutan semester.
- Mengatur bobot prioritas semester untuk generate jadwal.

Field:

```text
id
number
name
priority_weight
created_at
updated_at
```

Contoh prioritas:

| Semester | Bobot Prioritas |
|---|---:|
| Semester 8 | 100 |
| Semester 7 | 90 |
| Semester 6 | 75 |
| Semester 5 | 70 |
| Semester 1-4 | 50 |

### 11.4 Modul Kelas

Fungsi:

- Membuat kelas berdasarkan tahun akademik.
- Menentukan semester.
- Menentukan jenis santri: Putra atau Putri.
- Menentukan paralel: A, B, atau kosong.
- Menentukan status aktif.
- Menentukan jumlah mahasiswa.

Field:

```text
id
academic_year_id
semester_id
name
gender_type
parallel_type
student_count
is_active
created_at
updated_at
```

Keterangan:

```text
gender_type:
- putra
- putri

parallel_type:
- A
- B
- null
```

Aturan:

- Semester boleh memiliki kelas A dan B.
- Semester juga boleh hanya memiliki satu kelas tanpa paralel.
- Putra dan putri tidak boleh digabung dalam satu kelas.
- Nama kelas dapat dibuat otomatis dari semester, gender, dan paralel.

### 11.5 Modul Kategori Dosen

Fungsi:

- Mengelola kategori dosen.
- Menentukan level kategori.
- Menentukan apakah kategori tersebut cocok untuk semester atas, bawah, atau umum.

Contoh kategori:

| Kategori | Level | Keterangan |
|---|---:|---|
| Dosen Pakar | 1 | Diutamakan untuk semester atas |
| Dosen Senior | 2 | Cocok untuk semester menengah dan atas |
| Dosen Reguler | 3 | Pengajar umum |
| Dosen Kader | 4 | Diutamakan untuk semester bawah |
| Dosen Tamu | 5 | Pengajar luar dengan jadwal khusus |

### 11.6 Modul Dosen

Fungsi:

- Tambah dosen.
- Edit dosen.
- Menentukan kategori dosen.
- Menentukan boleh mengajar putra/putri.
- Menentukan batas mengajar per hari.
- Menentukan batas mengajar per minggu.
- Menentukan batas jadwal malam.
- Menentukan status dosen aktif atau nonaktif.

Field:

```text
id
lecturer_category_id
name
degree
phone
gender
can_teach_putra
can_teach_putri
max_teaching_per_day
max_teaching_per_week
max_night_teaching_per_week
is_external
is_active
notes
created_at
updated_at
```

### 11.7 Modul Mata Kuliah

Fungsi:

- Tambah mata kuliah.
- Edit mata kuliah.
- Menentukan kode mata kuliah.
- Menentukan tingkat kesulitan.
- Menentukan jenis mata kuliah.

Field:

```text
id
code
name
course_type
difficulty_level
description
created_at
updated_at
```

Contoh course_type:

```text
wajib
pilihan
praktik
diskusi
hafalan
kitab
```

Contoh difficulty_level:

```text
berat
sedang
ringan
```

### 11.8 Modul Kurikulum per Kelas

Fungsi:

- Menentukan mata kuliah apa saja yang diajarkan di sebuah kelas.
- Menentukan jumlah pertemuan per minggu.
- Menentukan apakah mata kuliah wajib dijadwalkan.
- Menentukan prioritas mata kuliah dalam proses generate.

Field:

```text
id
academic_year_id
classroom_id
course_id
meetings_per_week
is_required
priority_weight
created_at
updated_at
```

Aturan:

- Kelas A dan B boleh memiliki kurikulum sama.
- Kelas A dan B juga boleh memiliki sedikit perbedaan jika dibutuhkan.
- Putra dan putri boleh memiliki kurikulum sama atau berbeda.
- Generator menggunakan data ini sebagai daftar kebutuhan jadwal.

### 11.9 Modul Dosen Pengampu Mata Kuliah

Fungsi:

- Menentukan dosen mana saja yang boleh mengajar mata kuliah tertentu.
- Menentukan prioritas pengampu.
- Menentukan apakah dosen tersebut pengampu utama atau alternatif.

Field:

```text
id
lecturer_id
course_id
priority
is_primary
created_at
updated_at
```

Aturan:

- Dosen tidak boleh dipilih untuk mata kuliah jika belum terdaftar sebagai pengampu.
- Prioritas 1 lebih diutamakan daripada prioritas 2.
- Jika dosen prioritas 1 tidak tersedia, sistem boleh memilih dosen prioritas berikutnya.

### 11.10 Modul Ketersediaan Dosen

Fungsi:

- Mengatur kapan dosen tersedia untuk mengajar.
- Data dibuat per hari dan per slot waktu.
- Jika dosen tidak tersedia, generator tidak boleh menempatkan dosen di slot tersebut.

Field:

```text
id
lecturer_id
day_id
time_slot_id
is_available
reason
created_at
updated_at
```

Aturan:

- Jika data ketersediaan belum diisi, sistem harus menampilkan warning.
- Admin dapat memilih apakah dosen tanpa data ketersediaan dianggap tidak tersedia atau tersedia semua.
- Untuk keamanan, rekomendasi default adalah dianggap tidak tersedia sampai datanya diisi.

### 11.11 Modul Hari dan Slot Waktu

Fungsi:

- Mengelola hari aktif.
- Mengelola slot waktu.
- Menentukan urutan slot.
- Menentukan jam mulai dan jam selesai jika dibutuhkan.

Contoh slot:

| Slot | Jenis |
|---|---|
| Pagi Jam ke-1 | pagi |
| Pagi Jam ke-2 | pagi |
| Sore | sore |
| Malam | malam |

### 11.12 Modul Status Slot

Status slot:

```text
active
reserve
blocked
```

Contoh:

```text
Kamis - Malam - blocked
Jumat - Pagi Jam ke-1 - blocked
Jumat - Pagi Jam ke-2 - blocked
Jumat - Sore - blocked
Jumat - Malam - reserve atau active
```

Aturan:

- Slot aktif dipakai terlebih dahulu.
- Slot cadangan hanya dipakai jika slot aktif tidak cukup.
- Slot terblokir tidak boleh dipakai.

### 11.13 Modul Prioritas Waktu Mata Kuliah

Fungsi:

- Menentukan slot waktu yang cocok untuk mata kuliah tertentu.
- Mendukung prioritas jam pagi, sore, atau malam.
- Dapat bersifat wajib atau hanya prioritas.

Field:

```text
id
course_id
time_slot_id
priority
rule_type
created_at
updated_at
```

rule_type:

```text
required
preferred
alternative
```

Contoh:

| Mata Kuliah | Slot | Rule | Prioritas |
|---|---|---|---:|
| Fikih | Pagi 1 | preferred | 1 |
| Fikih | Pagi 2 | alternative | 2 |
| Nahwu | Pagi 1 | preferred | 1 |
| Mantiq | Malam | preferred | 1 |
| Bahtsul Masail | Malam | preferred | 1 |

### 11.14 Modul Aturan Kategori Dosen per Semester

Fungsi:

- Menentukan kategori dosen yang wajib atau diutamakan pada semester tertentu.

Field:

```text
id
semester_id
lecturer_category_id
rule_type
priority
created_at
updated_at
```

rule_type:

```text
required
preferred
alternative
```

Contoh:

| Semester | Kategori Dosen | Rule | Prioritas |
|---|---|---|---:|
| Semester 8 | Dosen Pakar | required | 1 |
| Semester 7 | Dosen Pakar | preferred | 1 |
| Semester 7 | Dosen Senior | alternative | 2 |
| Semester 1 | Dosen Reguler | preferred | 1 |
| Semester 1 | Dosen Kader | alternative | 2 |

### 11.15 Modul Pengecualian Dosen per Kelas

Fungsi:

- Menentukan dosen tertentu tidak boleh atau hanya boleh mengajar kelas tertentu.
- Berguna untuk kasus khusus yang tidak bisa ditangani aturan umum.

Field:

```text
id
lecturer_id
classroom_id
rule_type
reason
created_at
updated_at
```

rule_type:

```text
allowed_only
blocked
```

### 11.16 Modul Ruang

Fitur ini opsional untuk MVP, tetapi disarankan agar sistem lebih siap.

Fungsi:

- Mengelola ruang kuliah.
- Menentukan lokasi putra/putri.
- Menentukan kapasitas ruang.
- Mencegah bentrok ruang.

Field:

```text
id
name
location_type
capacity
is_active
created_at
updated_at
```

location_type:

```text
putra
putri
umum
```

### 11.17 Modul Jadwal Manual

Fungsi:

- Admin dapat menambahkan jadwal secara manual.
- Sistem tetap melakukan validasi aturan wajib.
- Admin bisa memilih kelas, mata kuliah, dosen, hari, slot, dan ruang.
- Admin bisa memberi status locked.

Validasi manual:

- Kelas tidak boleh bentrok.
- Dosen tidak boleh bentrok.
- Ruang tidak boleh bentrok.
- Slot terblokir tidak boleh dipakai.
- Dosen harus bisa mengajar mata kuliah.
- Dosen harus tersedia.
- Dosen harus sesuai putra/putri.
- Jika semester wajib dosen kategori tertentu, dosen harus sesuai.

### 11.18 Modul Generate Jadwal Otomatis

Fungsi utama:

- Membuat jadwal otomatis berdasarkan kurikulum dan aturan.
- Hasil generate disimpan sebagai draft.
- Admin dapat mengecek hasil, mengedit, mengunci, atau generate ulang.

Filter generate:

```text
Tahun Akademik
Jenis: Semua / Putra / Putri
Semester: Semua / Semester tertentu
Kelas: Semua / Kelas tertentu
Mode Generate
```

Mode generate:

```text
Generate dari kosong
Generate ulang hasil sistem
Generate slot kosong saja
Generate tanpa mengubah jadwal locked
Generate per kelas
Generate per semester
Generate putra saja
Generate putri saja
```

### 11.19 Modul Cek Kelayakan Sebelum Generate

Sebelum generate, sistem wajib menyediakan fitur cek kelayakan.

Fungsi:

- Mengecek apakah semua data cukup untuk generate.
- Mengecek apakah ada kebutuhan jadwal yang melebihi slot tersedia.
- Mengecek apakah semua mata kuliah memiliki pengampu.
- Mengecek apakah dosen memiliki ketersediaan.
- Mengecek apakah aturan semester dapat dipenuhi.
- Mengecek apakah dosen pakar cukup untuk semester atas.
- Mengecek apakah kelas A dan B sudah memiliki kurikulum.
- Mengecek apakah kelas putra dan putri sudah lengkap.

Contoh hasil:

```text
✅ Semua kelas aktif memiliki kurikulum.
✅ Semua mata kuliah memiliki minimal satu dosen pengampu.
✅ Slot tersedia cukup untuk Semester 1 A Putra.
⚠️ Semester 7 mengutamakan Dosen Pakar, tetapi hanya ada 1 Dosen Pakar tersedia.
⚠️ KH. Ahmad belum memiliki data ketersediaan pada hari Jumat malam.
❌ Faraidh Semester 3 Putri belum memiliki dosen pengampu.
❌ Semester 1 B Putra membutuhkan 25 pertemuan, tetapi slot tersedia hanya 23.
```

### 11.20 Modul Draft Jadwal

Fungsi:

- Menampilkan hasil generate sebelum difinalisasi.
- Admin bisa mengedit hasil generate.
- Admin bisa melihat warning dan error.
- Admin bisa menyimpan hasil sebagai jadwal final.
- Admin bisa membatalkan hasil generate.

Status jadwal:

```text
draft
final
cancelled
```

### 11.21 Modul Lock Jadwal

Fungsi:

- Mengunci jadwal agar tidak berubah saat generate ulang.
- Digunakan untuk jadwal yang sudah disepakati.
- Generator harus membaca jadwal locked sebagai jadwal tetap.

Field:

```text
is_locked
locked_by
locked_at
lock_reason
```

Aturan:

- Jadwal locked tidak boleh dihapus oleh generator.
- Jadwal locked tidak boleh dipindahkan oleh generator.
- Jadwal locked tetap dihitung sebagai slot terpakai.
- Admin dengan permission khusus dapat membuka lock.

### 11.22 Modul Log Generate

Fungsi:

- Menyimpan proses dan alasan hasil generate.
- Memberi transparansi kepada admin.
- Memudahkan debugging ketika jadwal gagal dibuat.

Jenis log:

```text
info
warning
error
success
```

Contoh log:

```text
INFO: Memulai generate jadwal Semester 7 Putra.
INFO: Ushul Fikih memiliki 2 dosen pengampu.
SUCCESS: Ushul Fikih ditempatkan di Senin Pagi 1 dengan KH. Ahmad.
WARNING: Fikih Semester 7 Putri memakai Dosen Senior karena Dosen Pakar tidak tersedia.
ERROR: Faraidh Semester 3 Putri gagal dijadwalkan karena tidak memiliki dosen pengampu.
```

### 11.23 Modul Laporan

Laporan yang dibutuhkan:

1. Jadwal per kelas.
2. Jadwal per dosen.
3. Jadwal putra.
4. Jadwal putri.
5. Jadwal per semester.
6. Jadwal per hari.
7. Rekap beban mengajar dosen.
8. Daftar jadwal locked.
9. Daftar jadwal bermasalah.
10. Log hasil generate.
11. Rekap mata kuliah yang belum terjadwal.
12. Rekap penggunaan slot.
13. Rekap penggunaan ruang.

Export:

```text
PDF
Excel
Print
```

---

## 12. Aturan Generate Jadwal

Aturan generate dibagi menjadi:

1. Aturan wajib.
2. Aturan prioritas.
3. Aturan kontrol untuk menutup celah.

### 12.1 Aturan Wajib

Aturan wajib tidak boleh dilanggar.

#### 1. Kelas tidak boleh bentrok

Satu kelas hanya boleh memiliki satu jadwal pada hari dan slot yang sama.

#### 2. Dosen tidak boleh bentrok

Satu dosen tidak boleh mengajar dua kelas pada hari dan slot yang sama.

#### 3. Ruang tidak boleh bentrok

Jika modul ruang digunakan, satu ruang tidak boleh dipakai oleh dua kelas pada waktu yang sama.

#### 4. Slot terblokir tidak boleh digunakan

Slot berikut tidak boleh digunakan:

```text
Kamis Malam
Jumat Pagi 1
Jumat Pagi 2
Jumat Sore
```

#### 5. Dosen harus bisa mengajar mata kuliah

Dosen hanya boleh dipilih jika terdaftar sebagai pengampu mata kuliah tersebut.

#### 6. Dosen harus tersedia

Dosen hanya boleh dijadwalkan pada hari dan slot yang tersedia untuk dosen tersebut.

#### 7. Dosen harus sesuai putra/putri

Dosen harus sesuai dengan aturan gender kelas:

```text
can_teach_putra
can_teach_putri
```

#### 8. Kategori dosen wajib harus dipenuhi

Jika sebuah semester mewajibkan kategori dosen tertentu, generator hanya boleh memilih dosen dari kategori tersebut.

Contoh:

```text
Semester 8 wajib Dosen Pakar.
```

#### 9. Jumlah pertemuan harus sesuai kurikulum

Jika mata kuliah ditetapkan 2 kali per minggu, maka sistem harus menjadwalkan 2 pertemuan.

#### 10. Jadwal locked tidak boleh berubah

Jadwal yang sudah dikunci tidak boleh dipindah, dihapus, atau diganti oleh generator.

#### 11. Kebutuhan jadwal tidak boleh melebihi slot tersedia

Sistem harus mengecek total kebutuhan per kelas.

#### 12. Pengecualian dosen per kelas harus dipatuhi

Jika dosen diblokir dari kelas tertentu, sistem tidak boleh memilih dosen tersebut untuk kelas itu.

### 12.2 Aturan Prioritas

Aturan prioritas diusahakan terpenuhi, tapi boleh dilanggar jika tidak ada opsi lain. Jika dilanggar, sistem wajib memberi warning.

#### 1. Semester atas diprioritaskan

Urutan generate disarankan:

```text
Semester 8
Semester 7
Semester 6
Semester 5
Semester 4
Semester 3
Semester 2
Semester 1
```

Tujuannya agar dosen pakar dan slot terbaik tidak habis dipakai semester bawah.

#### 2. Semester tertentu mengutamakan kategori dosen tertentu

Contoh:

```text
Semester 7 mengutamakan Dosen Pakar.
Semester 8 mengutamakan Dosen Pakar.
Semester 1 mengutamakan Dosen Reguler atau Kader.
```

#### 3. Mata kuliah tertentu diutamakan pagi

Contoh:

```text
Fikih → Pagi 1 / Pagi 2
Ushul Fikih → Pagi 1 / Pagi 2
Nahwu → Pagi 1 / Pagi 2
Mantiq → Malam / Sore
Bahtsul Masail → Malam
```

#### 4. Dosen prioritas utama diutamakan

Jika satu mata kuliah memiliki beberapa dosen pengampu, sistem memilih berdasarkan prioritas.

#### 5. Mata kuliah dengan dosen terbatas dijadwalkan lebih dulu

Jika mata kuliah hanya memiliki satu dosen pengampu, maka mata kuliah tersebut lebih dulu dijadwalkan.

#### 6. Dosen tidak terlalu padat dalam satu hari

Contoh:

```text
Maksimal 2 atau 3 pertemuan per hari.
```

#### 7. Dosen tidak terlalu padat dalam satu minggu

Contoh:

```text
KH. Ahmad maksimal 6 pertemuan per minggu.
Ust. Zaid maksimal 10 pertemuan per minggu.
```

#### 8. Mata kuliah yang sama tidak ditempatkan dalam satu hari

Jika Fikih 2 kali seminggu, sebaiknya tidak diletakkan pada hari yang sama.

#### 9. Mata kuliah berat tidak ditumpuk dalam satu hari

Contoh mata kuliah berat:

```text
Fikih
Ushul Fikih
Nahwu
Mantiq
Faraidh
```

#### 10. Beban mengajar dibagi merata

Jika ada beberapa dosen yang sama-sama bisa mengajar, sistem mengutamakan dosen dengan beban mingguan lebih ringan.

#### 11. Slot cadangan dipakai terakhir

Slot cadangan hanya digunakan jika slot aktif tidak cukup.

#### 12. Dosen luar atau dosen tamu diatur khusus

Contoh:

```text
Dosen luar hanya boleh hari tertentu.
Dosen luar tidak boleh malam.
Dosen luar maksimal 1 hari per minggu.
```

### 12.3 Aturan Kontrol untuk Menutup Celah

#### 1. Minimal jarak antar pertemuan mata kuliah yang sama

Jika mata kuliah 2 kali seminggu, beri jarak minimal 1 hari.

#### 2. Maksimal jadwal malam per kelas

Contoh:

```text
Setiap kelas maksimal 2 jadwal malam per minggu.
```

#### 3. Maksimal jadwal malam per dosen

Contoh:

```text
Setiap dosen maksimal 2 jadwal malam per minggu.
```

#### 4. Dosen pakar diprioritaskan untuk semester atas

Generator tidak boleh terlalu cepat memakai dosen pakar di semester bawah jika semester atas masih membutuhkan.

#### 5. Hindari perpindahan putra-putri yang terlalu mepet

Jika lokasi putra dan putri berjauhan, sistem sebaiknya memberi jeda minimal satu slot jika dosen berpindah area.

#### 6. Minimal dan maksimal jadwal per hari untuk kelas

Contoh:

```text
Minimal 1 jadwal per hari.
Maksimal 3 jadwal per hari.
```

#### 7. Hindari jadwal kosong di tengah jika tidak perlu

Contoh kurang rapi:

```text
Pagi 1: ada
Pagi 2: kosong
Sore: ada
Malam: ada
```

Aturan ini cukup menjadi prioritas, bukan wajib.

#### 8. Hari khusus dibuat lebih ringan

Contoh:

```text
Jumat malam hanya untuk mata kuliah ringan.
Kamis sore tidak diprioritaskan untuk mata kuliah berat.
```

#### 9. Data kurang lengkap harus terdeteksi

Sistem harus memberi warning jika:

```text
Dosen belum punya kategori.
Dosen belum punya ketersediaan.
Mata kuliah belum punya pengampu.
Kelas belum punya kurikulum.
Mata kuliah belum punya prioritas waktu.
Semester belum punya aturan kategori dosen.
```

#### 10. Semua keputusan generator harus punya alasan

Setiap hasil generate harus bisa dijelaskan.

Contoh:

```text
Ushul Fikih Semester 7 Putra ditempatkan pada Senin Pagi 1 karena:
- Dosen tersedia.
- Dosen bisa mengajar Ushul Fikih.
- Dosen kategori Pakar.
- Slot pagi sesuai prioritas mata kuliah.
- Tidak bentrok dengan kelas lain.
```

---

## 13. Algoritma Generate Jadwal

### 13.1 Pendekatan MVP

Untuk versi awal, sistem menggunakan algoritma:

```text
Greedy + Scoring + Rule Validation
```

Artinya:

1. Sistem mengambil kebutuhan jadwal.
2. Sistem mengurutkan kebutuhan berdasarkan tingkat kesulitan.
3. Sistem mencari semua kandidat dosen dan slot.
4. Sistem membuang kandidat yang melanggar aturan wajib.
5. Sistem memberi skor untuk kandidat yang lolos.
6. Sistem memilih kandidat dengan skor tertinggi.
7. Sistem menyimpan hasil sebagai draft.
8. Jika gagal, sistem menyimpan alasan gagal.

### 13.2 Urutan Generate

Urutan generate disarankan:

```text
1. Baca semua jadwal locked.
2. Generate semester 8.
3. Generate semester 7.
4. Generate semester 6.
5. Generate semester 5.
6. Generate semester 4.
7. Generate semester 3.
8. Generate semester 2.
9. Generate semester 1.
```

Di dalam setiap semester, urutan item:

```text
1. Mata kuliah dengan dosen paling sedikit.
2. Mata kuliah dengan aturan waktu required.
3. Mata kuliah dengan kategori berat.
4. Mata kuliah dengan jumlah pertemuan lebih banyak.
5. Mata kuliah biasa.
```

### 13.3 Scoring Kandidat

Setiap kandidat jadwal diberi skor.

Faktor skor:

```text
Kategori dosen sesuai semester
Prioritas dosen pengampu
Prioritas waktu mata kuliah
Beban dosen per hari
Beban dosen per minggu
Beban kelas per hari
Kesesuaian ruang
Jarak antar pertemuan mata kuliah yang sama
Penggunaan slot aktif atau cadangan
```

Contoh skor:

| Faktor | Skor |
|---|---:|
| Dosen kategori Pakar untuk Semester 7 | +80 |
| Dosen pengampu prioritas 1 | +60 |
| Slot pagi sesuai prioritas mata kuliah | +50 |
| Dosen belum mengajar hari itu | +20 |
| Kelas belum padat hari itu | +15 |
| Slot cadangan | -30 |
| Dosen sudah terlalu padat | -40 |
| Mata kuliah berat di malam | -50 |

### 13.4 Hard Rule Validation

```php
function passesHardRules($item, $slot, $lecturer, $room = null)
{
    if (isBlockedSlot($slot)) {
        return false;
    }

    if (classHasSchedule($item->classroom_id, $slot)) {
        return false;
    }

    if (lecturerHasSchedule($lecturer->id, $slot)) {
        return false;
    }

    if ($room && roomHasSchedule($room->id, $slot)) {
        return false;
    }

    if (! lecturerCanTeachCourse($lecturer->id, $item->course_id)) {
        return false;
    }

    if (! lecturerAvailable($lecturer->id, $slot)) {
        return false;
    }

    if (! lecturerCanTeachGender($lecturer, $item->classroom->gender_type)) {
        return false;
    }

    if (! lecturerPassesRequiredCategoryRule($lecturer, $item->semester_id)) {
        return false;
    }

    if (lecturerBlockedForClass($lecturer->id, $item->classroom_id)) {
        return false;
    }

    return true;
}
```

### 13.5 Scoring Pseudocode

```php
function calculateScore($item, $slot, $lecturer, $room = null)
{
    $score = 0;

    $score += semesterCategoryScore($item->semester_id, $lecturer);
    $score += lecturerCoursePriorityScore($lecturer, $item->course_id);
    $score += courseTimePreferenceScore($item->course_id, $slot);
    $score += lecturerDailyLoadScore($lecturer, $slot);
    $score += lecturerWeeklyLoadScore($lecturer);
    $score += classroomDailyLoadScore($item->classroom_id, $slot);
    $score += sameCourseDistanceScore($item, $slot);
    $score += slotStatusScore($slot);

    if ($room) {
        $score += roomSuitabilityScore($room, $item->classroom);
    }

    return $score;
}
```

### 13.6 Jika Generate Gagal

Jika sistem gagal menempatkan mata kuliah, sistem harus menyimpan error.

Contoh:

```text
Faraidh Semester 3 Putri gagal dijadwalkan.
Alasan:
- Hanya ada 1 dosen pengampu.
- Dosen tidak tersedia di semua slot kosong.
- Slot pagi penuh.
```

Status generate:

```text
success
partial
failed
```

---

## 14. Generate Jadwal dengan Supabase

Ada 3 pilihan implementasi generator.

### 14.1 Opsi A — Generate di Frontend

Tidak disarankan.

Alasan:

```text
Data terlalu banyak.
Logic terlalu penting.
Rawan manipulasi client.
Sulit menjaga service role.
```

### 14.2 Opsi B — Generate di Supabase Edge Function

Direkomendasikan jika menggunakan Next.js + Supabase.

Alur:

```text
Admin klik Generate
↓
Frontend memanggil Supabase Edge Function
↓
Edge Function memakai service role key
↓
Edge Function mengambil data aturan
↓
Edge Function menjalankan algoritma Greedy + Scoring
↓
Edge Function menyimpan draft jadwal
↓
Edge Function menyimpan log generate
↓
Frontend menampilkan hasil
```

Catatan keamanan:

```text
Service role key hanya boleh disimpan di server/Edge Function.
Jangan pernah taruh service role key di frontend.
```

### 14.3 Opsi C — Generate di Laravel Service

Direkomendasikan jika memakai Laravel + Filament.

Alur:

```text
Admin klik Generate di Filament
↓
Laravel Service membaca data dari Supabase PostgreSQL
↓
Laravel menjalankan algoritma
↓
Laravel menyimpan draft jadwal
↓
Laravel menyimpan log generate
```

Kelebihan:

```text
Lebih mudah debugging.
Lebih cocok untuk algoritma panjang.
Lebih mudah export PDF/Excel.
```

### 14.4 Opsi D — Generate dengan PostgreSQL Function/RPC

Bisa digunakan untuk validasi atau operasi sederhana.

Contoh penggunaan RPC:

```text
check_schedule_conflict()
check_generation_readiness()
finalize_schedule_batch()
lock_schedule()
```

Namun algoritma generate yang kompleks lebih baik dikerjakan di Edge Function atau Laravel Service, bukan seluruhnya di SQL.

---

## 15. Supabase RPC yang Disarankan

### 15.1 check_schedule_conflict

Fungsi untuk cek bentrok.

Input:

```text
academic_year_id
classroom_id
lecturer_id
day_id
time_slot_id
room_id
```

Output:

```text
is_conflict
conflict_type
message
```

### 15.2 check_generation_readiness

Fungsi untuk cek kelayakan sebelum generate.

Cek:

```text
kelas punya kurikulum
mata kuliah punya pengampu
dosen punya ketersediaan
slot cukup
semester atas punya dosen pakar cukup
kelas A/B punya kurikulum
putra/putri lengkap
```

### 15.3 finalize_generation_batch

Fungsi untuk mengubah jadwal draft menjadi final.

Aturan:

```text
Hanya admin yang boleh finalisasi.
Jadwal cancelled tidak ikut final.
Jadwal final batch sebelumnya bisa diarsipkan atau dibatalkan sesuai mode.
```

### 15.4 lock_schedule

Fungsi untuk mengunci jadwal.

Input:

```text
schedule_id
lock_reason
```

Output:

```text
success
message
```

---

## 16. Database Supabase PostgreSQL

Karena memakai Supabase, struktur database menggunakan PostgreSQL.

Standar field ID disarankan memakai:

```sql
uuid primary key default gen_random_uuid()
```

Untuk waktu:

```sql
created_at timestamptz default now()
updated_at timestamptz default now()
```

Untuk relasi:

```sql
references nama_tabel(id) on delete cascade
```

---

## 17. Skema Database Supabase

### 17.1 profiles

Tabel ini menghubungkan Supabase Auth dengan data user aplikasi.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Role awal:

```text
super_admin
admin_kurikulum
operator_jadwal
viewer
```

### 17.2 academic_years

```sql
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_year int not null,
  end_year int not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.3 semesters

```sql
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  name text not null,
  priority_weight int not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.4 classrooms

```sql
create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  name text not null,
  gender_type text not null check (gender_type in ('putra', 'putri')),
  parallel_type text check (parallel_type in ('A', 'B')),
  student_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (academic_year_id, semester_id, gender_type, parallel_type)
);
```

Catatan:

Jika semester tidak memiliki A/B, `parallel_type` boleh kosong/null.

### 17.5 lecturer_categories

```sql
create table public.lecturer_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level int not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.6 lecturers

```sql
create table public.lecturers (
  id uuid primary key default gen_random_uuid(),
  lecturer_category_id uuid references public.lecturer_categories(id) on delete set null,
  name text not null,
  degree text,
  phone text,
  gender text check (gender in ('laki-laki', 'perempuan')),
  can_teach_putra boolean not null default true,
  can_teach_putri boolean not null default true,
  max_teaching_per_day int not null default 3,
  max_teaching_per_week int not null default 10,
  max_night_teaching_per_week int not null default 2,
  is_external boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.7 courses

```sql
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  course_type text not null default 'wajib',
  difficulty_level text not null default 'sedang'
    check (difficulty_level in ('berat', 'sedang', 'ringan')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.8 curriculum_items

```sql
create table public.curriculum_items (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  meetings_per_week int not null default 1,
  is_required boolean not null default true,
  priority_weight int not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (academic_year_id, classroom_id, course_id)
);
```

### 17.9 lecturer_courses

```sql
create table public.lecturer_courses (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  priority int not null default 1,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (lecturer_id, course_id)
);
```

### 17.10 days

```sql
create table public.days (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.11 time_slots

```sql
create table public.time_slots (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time,
  end_time time,
  sort_order int not null,
  slot_type text not null check (slot_type in ('pagi', 'sore', 'malam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.12 schedule_slots

```sql
create table public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  time_slot_id uuid not null references public.time_slots(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'reserve', 'blocked')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (day_id, time_slot_id)
);
```

### 17.13 lecturer_availabilities

```sql
create table public.lecturer_availabilities (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  time_slot_id uuid not null references public.time_slots(id) on delete cascade,
  is_available boolean not null default true,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (lecturer_id, day_id, time_slot_id)
);
```

### 17.14 course_time_preferences

```sql
create table public.course_time_preferences (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  time_slot_id uuid not null references public.time_slots(id) on delete cascade,
  priority int not null default 1,
  rule_type text not null default 'preferred'
    check (rule_type in ('required', 'preferred', 'alternative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (course_id, time_slot_id)
);
```

### 17.15 semester_lecturer_category_rules

```sql
create table public.semester_lecturer_category_rules (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  lecturer_category_id uuid not null references public.lecturer_categories(id) on delete cascade,
  rule_type text not null default 'preferred'
    check (rule_type in ('required', 'preferred', 'alternative')),
  priority int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (semester_id, lecturer_category_id)
);
```

### 17.16 lecturer_class_rules

```sql
create table public.lecturer_class_rules (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  rule_type text not null check (rule_type in ('allowed_only', 'blocked')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (lecturer_id, classroom_id, rule_type)
);
```

### 17.17 rooms

```sql
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location_type text not null default 'umum'
    check (location_type in ('putra', 'putri', 'umum')),
  capacity int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.18 schedules

```sql
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  lecturer_id uuid not null references public.lecturers(id) on delete restrict,
  day_id uuid not null references public.days(id) on delete restrict,
  time_slot_id uuid not null references public.time_slots(id) on delete restrict,
  room_id uuid references public.rooms(id) on delete set null,

  status text not null default 'draft'
    check (status in ('draft', 'final', 'cancelled')),

  is_locked boolean not null default false,
  locked_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  lock_reason text,

  generated_by_system boolean not null default false,
  generation_batch_id uuid,
  warning_note text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (academic_year_id, classroom_id, day_id, time_slot_id)
);
```

Index tambahan:

```sql
create index idx_schedules_lecturer_time
on public.schedules (academic_year_id, lecturer_id, day_id, time_slot_id);

create index idx_schedules_room_time
on public.schedules (academic_year_id, room_id, day_id, time_slot_id);

create index idx_schedules_classroom
on public.schedules (academic_year_id, classroom_id);
```

Unique index untuk mencegah bentrok dosen:

```sql
create unique index unique_lecturer_schedule
on public.schedules (academic_year_id, lecturer_id, day_id, time_slot_id)
where status != 'cancelled';
```

Unique index untuk mencegah bentrok ruang:

```sql
create unique index unique_room_schedule
on public.schedules (academic_year_id, room_id, day_id, time_slot_id)
where room_id is not null and status != 'cancelled';
```

### 17.19 schedule_generation_batches

```sql
create table public.schedule_generation_batches (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  target_gender text check (target_gender in ('putra', 'putri', 'all')),
  target_semester_id uuid references public.semesters(id) on delete set null,
  target_classroom_id uuid references public.classrooms(id) on delete set null,
  mode text not null,
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'failed', 'cancelled')),
  total_items int not null default 0,
  scheduled_items int not null default 0,
  failed_items int not null default 0,
  warning_items int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 17.20 schedule_generation_logs

```sql
create table public.schedule_generation_logs (
  id uuid primary key default gen_random_uuid(),
  generation_batch_id uuid not null references public.schedule_generation_batches(id) on delete cascade,
  level text not null check (level in ('info', 'success', 'warning', 'error')),
  type text,
  message text not null,
  context_json jsonb,
  created_at timestamptz not null default now()
);
```

---

## 18. RLS dan Keamanan Supabase

### 18.1 Prinsip Umum

Karena Supabase bisa diakses langsung dari frontend, semua tabel penting harus memakai RLS.

Rekomendasi:

```text
Aktifkan RLS pada semua tabel public.
Buat policy berdasarkan role.
Viewer hanya read.
Operator bisa input/edit jadwal draft.
Admin Kurikulum bisa kelola data akademik.
Super Admin bisa semua.
```

### 18.2 Helper Function Role

Function untuk mengecek role user:

```sql
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;
```

Function cek admin:

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role in ('super_admin', 'admin_kurikulum')
    and is_active = true
  )
$$;
```

Function cek operator:

```sql
create or replace function public.is_operator_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role in ('super_admin', 'admin_kurikulum', 'operator_jadwal')
    and is_active = true
  )
$$;
```

### 18.3 Contoh Enable RLS

```sql
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.classrooms enable row level security;
alter table public.lecturers enable row level security;
alter table public.courses enable row level security;
alter table public.curriculum_items enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_generation_batches enable row level security;
alter table public.schedule_generation_logs enable row level security;
```

### 18.4 Contoh Policy Read untuk Semua User Login

```sql
create policy "Authenticated users can read academic years"
on public.academic_years
for select
to authenticated
using (true);
```

### 18.5 Contoh Policy Admin Bisa Mengelola Data Master

```sql
create policy "Admins can manage academic years"
on public.academic_years
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
```

Policy serupa dapat dibuat untuk:

```text
semesters
classrooms
lecturers
lecturer_categories
courses
curriculum_items
lecturer_courses
lecturer_availabilities
course_time_preferences
semester_lecturer_category_rules
```

### 18.6 Contoh Policy Operator Bisa Mengelola Jadwal Draft

```sql
create policy "Operators can manage draft schedules"
on public.schedules
for all
to authenticated
using (
  public.is_operator_or_admin()
  and status = 'draft'
)
with check (
  public.is_operator_or_admin()
  and status = 'draft'
);
```

### 18.7 Contoh Policy Viewer Hanya Bisa Membaca Jadwal Final

```sql
create policy "Viewers can read final schedules"
on public.schedules
for select
to authenticated
using (
  status = 'final'
);
```

---

## 19. Supabase Storage

Supabase Storage dapat dipakai untuk menyimpan:

```text
PDF jadwal
File Excel export
Template import Excel
Dokumen laporan
```

Struktur bucket:

```text
schedule-exports
curriculum-imports
reports
```

Policy storage:

```text
Viewer boleh download jadwal final.
Admin boleh upload dan hapus file export.
Operator boleh upload file import jika diberi akses.
```

---

## 20. Export PDF dan Excel

Supabase tidak otomatis membuat PDF/Excel. Export harus dikerjakan oleh:

```text
Next.js API Route
Supabase Edge Function
Laravel Controller
```

Rekomendasi jika menggunakan Next.js:

```text
PDF  : Puppeteer / Playwright di server
Excel: ExcelJS
```

Rekomendasi jika menggunakan Laravel:

```text
PDF  : DomPDF / Browsershot
Excel: Laravel Excel
```

File hasil export dapat disimpan ke Supabase Storage.

---

## 21. Realtime

Supabase Realtime dapat dipakai untuk:

```text
Menampilkan progress generate jadwal.
Menampilkan update draft jadwal.
Menampilkan log generate secara langsung.
```

Contoh:

```text
Admin klik Generate.
Halaman log terbuka.
Log bertambah otomatis tanpa refresh.
```

Namun untuk MVP, realtime bisa ditunda.

---

## 22. Tampilan Halaman

### 22.1 Dashboard

Isi dashboard:

- Tahun akademik aktif.
- Total kelas aktif.
- Total kelas putra.
- Total kelas putri.
- Total dosen aktif.
- Total mata kuliah.
- Jadwal hari ini.
- Jadwal belum lengkap.
- Warning terakhir dari generate.
- Dosen dengan beban terbanyak.
- Kelas dengan jadwal belum lengkap.

### 22.2 Halaman Kelas

Filter:

```text
Tahun Akademik
Semester
Jenis: Putra / Putri
Paralel: A / B / kosong
Status
```

Kolom:

```text
Nama Kelas
Semester
Jenis
Paralel
Jumlah Mahasantri
Status
```

### 22.3 Halaman Kurikulum per Kelas

Filter:

```text
Tahun Akademik
Semester
Jenis
Kelas
```

Form input:

```text
Kelas
Mata Kuliah
Pertemuan per minggu
Prioritas
Status wajib
```

### 22.4 Halaman Ketersediaan Dosen

Tampilan berupa tabel checklist:

| Hari | Pagi 1 | Pagi 2 | Sore | Malam |
|---|---|---|---|---|
| Sabtu | ✓ | ✓ | - | - |
| Ahad | ✓ | ✓ | ✓ | - |
| Senin | - | ✓ | ✓ | ✓ |

### 22.5 Halaman Generate Jadwal

Field:

```text
Tahun Akademik
Target Gender: Semua / Putra / Putri
Semester: Semua / Semester tertentu
Kelas: Semua / Kelas tertentu
Mode Generate
```

Mode:

```text
Generate dari kosong
Generate slot kosong saja
Generate ulang hasil sistem
Jangan ubah jadwal locked
```

Tombol:

```text
Cek Kelayakan
Generate Jadwal
Lihat Log
Lihat Draft
```

### 22.6 Halaman Hasil Generate

Ringkasan:

```text
Status: Partial
Total kebutuhan: 180
Berhasil dijadwalkan: 167
Gagal: 13
Warning: 24
```

Tabel hasil:

```text
Kelas
Mata Kuliah
Dosen
Hari
Slot
Status
Warning
```

Tombol:

```text
Edit
Lock
Unlock
Finalisasi
Batalkan
Regenerate Slot Kosong
```

### 22.7 Halaman Jadwal per Kelas

Contoh tampilan:

```text
JADWAL KULIAH MA'HAD ALY AN-NUR 2
Tahun Akademik: 2026/2027
Kelas: Semester 1 A Putra
```

| Hari | Pagi 1 | Pagi 2 | Sore | Malam |
|---|---|---|---|---|
| Sabtu | Fikih - KH. Ahmad | Nahwu - Ust. Zaid | Akhlak - Ust. Umar | Mantiq - Ust. Ali |
| Ahad | Tafsir - Ust. Umar | Sharaf - Ust. Zaid | - | - |
| Senin | ... | ... | ... | ... |
| Kamis | ... | ... | ... | - |
| Jumat | - | - | - | Bahtsul Masail |

### 22.8 Halaman Jadwal per Dosen

Menampilkan jadwal semua kelas yang diajar dosen.

Kolom:

```text
Hari
Slot
Mata Kuliah
Kelas
Ruang
Status
```

---

## 23. Struktur Menu

```text
Dashboard

Data Master
- Tahun Akademik
- Semester
- Kelas
- Dosen
- Kategori Dosen
- Mata Kuliah
- Ruang
- Hari
- Slot Waktu
- Status Slot

Kurikulum
- Kurikulum per Kelas
- Dosen Pengampu
- Prioritas Waktu Mata Kuliah
- Aturan Kategori Dosen per Semester

Ketersediaan
- Ketersediaan Dosen
- Batas Mengajar Dosen
- Pengecualian Dosen per Kelas

Jadwal
- Generate Jadwal
- Draft Jadwal
- Jadwal Manual
- Jadwal Putra
- Jadwal Putri
- Jadwal per Kelas
- Jadwal per Dosen
- Jadwal Locked
- Cek Bentrok

Laporan
- Rekap Beban Dosen
- Mata Kuliah Belum Terjadwal
- Log Generate
- Export PDF
- Export Excel

Pengaturan
- User
- Role & Permission
- Bobot Aturan Generate
```

---

## 24. Alur Penggunaan Sistem

### 24.1 Setup Awal

```text
1. Super Admin membuat tahun akademik.
2. Admin membuat semester.
3. Admin membuat kelas putra dan putri.
4. Admin menentukan kelas A dan B jika ada.
5. Admin memasukkan kategori dosen.
6. Admin memasukkan dosen.
7. Admin memasukkan mata kuliah.
8. Admin memasukkan kurikulum per kelas.
9. Admin memasukkan dosen pengampu mata kuliah.
10. Admin mengisi ketersediaan dosen.
11. Admin mengatur slot aktif, cadangan, dan terblokir.
12. Admin mengatur prioritas waktu mata kuliah.
13. Admin mengatur kategori dosen per semester.
```

### 24.2 Alur Generate Jadwal

```text
1. Admin membuka menu Generate Jadwal.
2. Admin memilih tahun akademik.
3. Admin memilih target: Semua / Putra / Putri.
4. Admin memilih semester atau kelas.
5. Admin klik Cek Kelayakan.
6. Sistem menampilkan hasil validasi.
7. Jika tidak ada error fatal, admin klik Generate Jadwal.
8. Sistem membuat jadwal draft.
9. Sistem menampilkan ringkasan hasil generate.
10. Admin melihat warning dan error.
11. Admin mengedit jadwal jika perlu.
12. Admin mengunci jadwal penting.
13. Admin menyimpan jadwal sebagai final.
14. Admin mencetak jadwal.
```

### 24.3 Alur Generate Ulang

```text
1. Admin membuka hasil jadwal.
2. Admin mengunci jadwal yang sudah disepakati.
3. Admin memilih Generate Ulang.
4. Sistem hanya mengubah jadwal yang tidak locked.
5. Jadwal locked tetap aman.
6. Sistem membuat draft baru.
7. Admin meninjau hasilnya.
```

---

## 25. MVP

### 25.1 MVP Tahap 1 — Data Master

Fitur:

```text
Login
Role sederhana
Tahun Akademik
Semester
Kelas Putra/Putri
Kelas A/B
Dosen
Kategori Dosen
Mata Kuliah
Hari
Slot Waktu
Slot Aktif/Cadangan/Terblokir
```

### 25.2 MVP Tahap 2 — Kurikulum dan Aturan

Fitur:

```text
Kurikulum per Kelas
Dosen Pengampu Mata Kuliah
Ketersediaan Dosen
Prioritas Waktu Mata Kuliah
Kategori Dosen per Semester
Batas Mengajar Dosen
Pengecualian Dosen per Kelas
```

### 25.3 MVP Tahap 3 — Jadwal Manual

Fitur:

```text
Input Jadwal Manual
Validasi Bentrok Kelas
Validasi Bentrok Dosen
Validasi Slot Terblokir
Validasi Dosen Pengampu
Validasi Ketersediaan Dosen
Jadwal per Kelas
Jadwal per Dosen
Jadwal Putra
Jadwal Putri
```

### 25.4 MVP Tahap 4 — Generate Otomatis

Fitur:

```text
Cek Kelayakan
Generate Jadwal
Greedy + Scoring
Draft Jadwal
Warning dan Error
Log Generate
Lock Jadwal
Regenerate Slot Kosong
Finalisasi Jadwal
```

### 25.5 MVP Tahap 5 — Laporan

Fitur:

```text
Export PDF
Export Excel
Rekap Beban Dosen
Rekap Mata Kuliah Belum Terjadwal
Rekap Warning Generate
```

---

## 26. Roadmap Lanjutan

### 26.1 Versi 2

Fitur:

```text
Import data dosen dari Excel
Import kurikulum dari Excel
Import ketersediaan dosen dari Excel
Riwayat perubahan jadwal
Dashboard analitik
Filter lanjutan
```

### 26.2 Versi 3

Fitur:

```text
Optimasi jadwal dengan Python OR-Tools
Rekomendasi perbaikan otomatis
Simulasi beberapa versi jadwal
Perbandingan hasil generate
```

### 26.3 Versi 4

Fitur:

```text
Notifikasi WhatsApp ke dosen
Portal dosen
Portal mahasiswa
Integrasi absensi
Integrasi kalender
```

---

## 27. Kriteria Keberhasilan Produk

Produk dianggap berhasil jika:

1. Admin dapat login menggunakan Supabase Auth atau login aplikasi yang terhubung ke Supabase.
2. User memiliki role di tabel profiles.
3. RLS membatasi akses sesuai role.
4. Admin dapat mengelola data tahun akademik.
5. Admin dapat mengelola semester.
6. Admin dapat mengelola kelas putra dan putri.
7. Admin dapat mengelola kelas A dan B.
8. Admin dapat mengelola dosen.
9. Admin dapat mengelola kategori dosen.
10. Admin dapat mengelola mata kuliah.
11. Admin dapat mengelola kurikulum per kelas.
12. Admin dapat mengelola dosen pengampu.
13. Admin dapat mengelola ketersediaan dosen.
14. Admin dapat mengelola aturan kategori dosen per semester.
15. Admin dapat mengelola prioritas waktu mata kuliah.
16. Sistem dapat membuat jadwal otomatis tanpa bentrok kelas.
17. Sistem dapat membuat jadwal otomatis tanpa bentrok dosen.
18. Sistem tidak menggunakan slot terblokir.
19. Sistem memperhatikan putra/putri.
20. Sistem memperhatikan kelas A/B.
21. Sistem memperhatikan dosen pakar untuk semester atas.
22. Sistem menyimpan draft jadwal.
23. Sistem menyimpan log generate.
24. Admin dapat mengunci jadwal.
25. Generate ulang tidak mengubah jadwal locked.
26. Jadwal dapat diekspor ke PDF/Excel.
27. File export dapat disimpan di Supabase Storage.

---

## 28. Risiko dan Antisipasi

### Risiko 1: Data aturan belum lengkap

Contoh:

```text
Dosen belum punya ketersediaan.
Mata kuliah belum punya pengampu.
Kelas belum punya kurikulum.
```

Antisipasi:

```text
Fitur Cek Kelayakan wajib dibuat sebelum generate.
```

### Risiko 2: Generator gagal membuat jadwal penuh

Penyebab:

```text
Slot tidak cukup.
Dosen tidak cukup.
Aturan terlalu ketat.
Dosen pakar terbatas.
```

Antisipasi:

```text
Hasil generate boleh partial.
Sistem menyimpan error.
Admin bisa memperbaiki data lalu generate ulang.
```

### Risiko 3: Jadwal valid tapi kurang ideal

Contoh:

```text
Dosen terlalu padat.
Mata kuliah berat di malam.
Kelas terlalu padat di satu hari.
```

Antisipasi:

```text
Gunakan scoring dan aturan prioritas.
Tampilkan warning.
Admin bisa edit manual.
```

### Risiko 4: Generate ulang merusak jadwal yang sudah disetujui

Antisipasi:

```text
Fitur locked schedule wajib ada.
```

### Risiko 5: Dosen pakar habis untuk semester bawah

Antisipasi:

```text
Generate semester atas lebih dulu.
Beri bobot tinggi untuk semester 7 dan 8.
Batasi penggunaan dosen pakar di semester bawah.
```

### Risiko 6: RLS Supabase salah konfigurasi

Antisipasi:

```text
Aktifkan RLS pada semua tabel public.
Buat role policy dengan hati-hati.
Jangan taruh service role key di frontend.
Testing akses untuk setiap role.
```

---

## 29. Catatan Implementasi Penting

### 29.1 Jangan Simpan Service Role Key di Frontend

Service role key hanya boleh berada di:

```text
Supabase Edge Function
Next.js Server/API Route
Laravel .env
```

### 29.2 Semua Tabel Sensitif Harus RLS

Minimal tabel yang wajib RLS:

```text
profiles
academic_years
semesters
classrooms
lecturers
lecturer_categories
courses
curriculum_items
lecturer_courses
lecturer_availabilities
course_time_preferences
semester_lecturer_category_rules
lecturer_class_rules
rooms
schedules
schedule_generation_batches
schedule_generation_logs
```

### 29.3 Gunakan Draft Sebelum Final

Generator tidak langsung mengubah jadwal final.

Alur aman:

```text
Generate
↓
Draft
↓
Review Admin
↓
Edit / Lock
↓
Finalisasi
```

### 29.4 Jadwal Locked Wajib Dihormati

Saat generate ulang:

```text
Jadwal locked tetap dianggap slot terpakai.
Jadwal locked tidak boleh dihapus.
Jadwal locked tidak boleh dipindah.
Jadwal locked tidak boleh diganti dosennya.
```

### 29.5 Gunakan Log untuk Semua Keputusan Penting

Setiap generate harus menyimpan:

```text
Mata kuliah yang berhasil dijadwalkan.
Mata kuliah yang gagal.
Alasan pemilihan dosen.
Alasan pemilihan slot.
Warning aturan prioritas yang tidak terpenuhi.
Error aturan wajib yang tidak bisa dipenuhi.
```

---

## 30. Kesimpulan

SIMKURMA An-Nur 2 adalah sistem informasi kurikulum dan jadwal kuliah yang dirancang khusus untuk kebutuhan Ma’had Aly An-Nur 2.

Sistem ini tidak hanya menyimpan jadwal, tetapi juga mampu membuat jadwal otomatis berdasarkan aturan:

```text
Dosen
Mata Kuliah
Semester
Kelas Putra/Putri
Kelas A/B
Ketersediaan Dosen
Kategori Dosen
Prioritas Waktu
Slot Terblokir
Batas Mengajar
Aturan Akademik
```

Perubahan utama versi Supabase:

```text
MySQL diganti Supabase PostgreSQL.
Auth dapat menggunakan Supabase Auth.
Role user disimpan di tabel profiles.
Keamanan menggunakan Row Level Security.
Primary key disarankan UUID.
Export file dapat disimpan di Supabase Storage.
Generate jadwal dapat dijalankan lewat Edge Function, Laravel Service, atau API Route.
Log generate dapat ditampilkan realtime jika dibutuhkan.
```

Rekomendasi implementasi paling aman untuk MVP internal:

```text
Laravel + Filament + Supabase PostgreSQL + Laravel Scheduler Service
```

Rekomendasi implementasi paling modern:

```text
Next.js + Supabase
```

Untuk tahap awal, fokuskan pada:

```text
Data Master
Kurikulum per Kelas
Aturan Generate
Jadwal Manual
Generate Otomatis
Draft Jadwal
Lock Jadwal
Log Generate
Export Jadwal
```
