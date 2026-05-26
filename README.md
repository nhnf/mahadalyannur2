# Sistem Akumulasi Gaji Dosen

Platform web untuk mengotomatisasi perhitungan, manajemen, dan akumulasi gaji dosen bulanan.

## Fitur Utama

- **Manajemen Master Data**: Kategori dosen dan data dosen
- **Jadwal Mengajar**: Input dan manajemen jadwal perkuliahan
- **Presensi**: Tracking kehadiran dosen
- **Payroll Otomatis**: Kalkulasi gaji dengan formula:
  - 50% Gaji Tetap (berdasarkan jadwal)
  - 50% Gaji Kehadiran (berdasarkan presensi)
  - Transportasi Progresif (Rp15.000 jam pertama, +Rp5.000 per jam tambahan)
- **Laporan**: Export Excel dan cetak slip gaji PDF

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Design**: Modern dashboard dengan sidebar gelap dan warna utama biru

## Setup Lokal

1. Clone repository
2. Copy `.env.example` ke `.env` dan isi dengan kredensial Supabase Anda
3. Install Supabase CLI: `npm install -g supabase`
4. Link project: `supabase link --project-ref your-project-ref`
5. Push migrations: `supabase db push`
6. Buka `index.html` di browser atau gunakan live server

## Struktur Proyek

```
GajiDosen/
├── index.html              # Landing page & login
├── dashboard-admin.html    # Dashboard Admin/HR
├── dashboard-finance.html  # Dashboard Finance
├── dashboard-lecturer.html # Dashboard Dosen
├── styles/
│   ├── design-system.css   # Design tokens & variables
│   ├── layout.css          # Layout & grid system
│   └── components.css      # UI components
├── js/
│   ├── supabase-client.js  # Supabase initialization
│   ├── utils.js            # Utility functions
│   └── modules/            # Feature modules
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge Functions
└── assets/                 # Images & static files
```

## User Roles

- **Admin/HR**: Full access untuk semua fitur
- **Finance**: Read-only master data, full access payroll
- **Dosen**: View slip gaji dan riwayat kehadiran sendiri

## License

Proprietary - Internal Use Only
