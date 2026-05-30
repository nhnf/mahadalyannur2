/**
 * Supabase Client — menggunakan Supabase Auth (bukan custom auth)
 * JWT di-set otomatis, RLS berfungsi penuh.
 */

var SUPABASE_URL  = 'https://unyfvjugdyrdirkdrifw.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWZ2anVnZHlyZGlya2RyaWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTM2MjMsImV4cCI6MjA5NTI4OTYyM30.J9694tJehud3vlWZccqcZVyb_xsHSjO9lyvN3twPPmw';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// ── AUTH WRAPPER ──────────────────────────────────────────────────────────────
// Wrapper tipis di atas Supabase Auth agar kode lama tetap kompatibel

var auth = {
  /**
   * Login — pakai Supabase Auth built-in
   * Role dibaca dari app_metadata JWT
   */
  async signInWithPassword(creds) {
    try {
      const { data, error } = await _sb.auth.signInWithPassword({
        email:    creds.email.trim().toLowerCase(),
        password: creds.password
      });
      if (error) throw error;

      // Ambil role dari app_metadata
      const role = data.user?.app_metadata?.role || 'lecturer';
      return {
        data: { user: { id: data.user.id, email: data.user.email, role } },
        error: null
      };
    } catch (err) {
      // Terjemahkan pesan error Supabase ke Bahasa Indonesia
      var msg = err.message || 'Login gagal';
      if (msg.includes('Invalid login credentials')) msg = 'Email atau password salah';
      if (msg.includes('Email not confirmed'))       msg = 'Email belum dikonfirmasi';
      if (msg.includes('Too many requests'))         msg = 'Terlalu banyak percobaan login. Coba lagi nanti.';
      return { data: null, error: { message: msg } };
    }
  },

  async getSession() {
    const { data, error } = await _sb.auth.getSession();
    if (error || !data.session) return { data: { session: null }, error };

    const user = data.session.user;
    const role = user?.app_metadata?.role || 'lecturer';
    return {
      data: {
        session: { user: { id: user.id, email: user.email, role } }
      },
      error: null
    };
  },

  async signOut() {
    await _sb.auth.signOut();
    return { error: null };
  }
};

// ── DATABASE HELPERS ──────────────────────────────────────────────────────────

async function fetchData(table, options) {
  options = options || {};
  try {
    let query = _sb.from(table).select('*');
    if (options.filters) {
      Object.keys(options.filters).forEach(function(k) {
        if (options.filters[k] !== null && options.filters[k] !== undefined)
          query = query.eq(k, options.filters[k]);
      });
    }
    if (options.month)      query = query.eq('period_month', options.month);
    if (options.year)       query = query.eq('period_year',  options.year);
    if (options.date)       query = query.eq('schedule_date', options.date);
    if (options.lecturerId) query = query.eq('lecturer_id',  options.lecturerId);
    if (options.orderBy)    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending !== false });
    if (options.limit)      query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('fetchData error [' + table + ']:', err);
    throw err;
  }
}

async function insertData(table, data) {
  const { data: result, error } = await _sb.from(table).insert(data).select().single();
  if (error) throw error;
  return result;
}

async function updateData(table, id, data) {
  const { data: result, error } = await _sb.from(table).update(data).eq('id', id).select().single();
  if (error) throw error;
  return result;
}

async function softDeleteData(table, id) {
  const { error } = await _sb.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  return true;
}

// ── PAYROLL CALCULATION ───────────────────────────────────────────────────────
async function calculatePayrollLocal(month, year) {
  const lecRes = await _sb.from('lecturers')
    .select('id').is('deleted_at', null).eq('is_active', true);
  if (lecRes.error) throw lecRes.error;

  // Ambil day_of_week juga untuk hitung transport per hari
  const attRes = await _sb.from('v_attendance_monthly')
    .select('lecturer_id, day_of_week, total_meetings, total_hadir, tarif_per_jam')
    .eq('period_month', month).eq('period_year', year);
  if (attRes.error) throw attRes.error;

  var attByLec = {};
  (attRes.data || []).forEach(function(a) {
    if (!attByLec[a.lecturer_id]) attByLec[a.lecturer_id] = [];
    attByLec[a.lecturer_id].push(a);
  });

  let processed = 0;
  for (var i = 0; i < (lecRes.data || []).length; i++) {
    var lecId   = lecRes.data[i].id;
    var attList = attByLec[lecId] || [];
    if (attList.length === 0) continue;

    var totalScheduled = 0, totalAttended = 0, fixed = 0, attendance = 0;
    attList.forEach(function(a) {
      var tarif    = parseFloat(a.tarif_per_jam || 0);
      var meetings = a.total_meetings || 0;
      var hadir    = a.total_hadir    || 0;
      totalScheduled += meetings;
      totalAttended  += hadir;
      fixed      += meetings * tarif * 0.5;
      attendance += hadir    * tarif * 0.5;
    });

    // ── HITUNG TRANSPORT PER HARI ──────────────────────────────────────────
    // Logika: per hari yang ada kehadiran:
    //   sesi ke-1 hadir → Rp 15.000
    //   sesi ke-2 hadir → +Rp 5.000
    //   sesi ke-3 hadir → +Rp 5.000, dst.
    // Rumus per hari: 15.000 + (sesi_hadir_hari_itu - 1) × 5.000
    //              = 10.000 + sesi_hadir_hari_itu × 5.000
    // (hanya jika sesi_hadir_hari_itu > 0)

    // Group total_hadir per hari
    // Setiap baris attendance = 1 sesi di 1 hari, total_hadir = berapa kali hadir
    // dalam bulan itu (misal 4 pertemuan, hadir 3 → total_hadir=3)
    // Untuk transport: kita hitung per "kunjungan hari" bukan per pertemuan
    // Asumsi: 1 sesi = 1 kunjungan di hari itu (bukan per pertemuan dalam bulan)
    // Jadi group per hari, hitung berapa sesi yang punya total_hadir > 0

    var hadirPerHari = {};
    attList.forEach(function(a) {
      var hari = a.day_of_week || 'unknown';
      if (!hadirPerHari[hari]) hadirPerHari[hari] = 0;
      // Jika sesi ini punya kehadiran (total_hadir > 0), hitung sebagai 1 sesi aktif
      if ((a.total_hadir || 0) > 0) hadirPerHari[hari]++;
    });

    var transport = 0;
    Object.keys(hadirPerHari).forEach(function(hari) {
      var sesiHadir = hadirPerHari[hari];
      if (sesiHadir > 0) {
        // Sesi pertama: 15.000, sesi berikutnya: +5.000 masing-masing
        transport += 15000 + (sesiHadir - 1) * 5000;
      }
    });

    // Kalikan dengan jumlah minggu dalam bulan (total_hadir sudah akumulasi per bulan)
    // Tapi transport dihitung per kunjungan (per minggu), bukan flat per bulan
    // Perlu hitung berapa kali dosen hadir per hari dalam bulan
    // Gunakan total_hadir sebagai jumlah pertemuan hadir dalam bulan
    transport = 0;
    Object.keys(hadirPerHari).forEach(function(hari) {
      // Cari semua sesi di hari ini
      var sesiDiHari = attList.filter(function(a) { return a.day_of_week === hari; });

      // Hitung berapa pertemuan (minggu) dosen hadir di hari ini
      // Ambil max total_hadir dari semua sesi di hari ini sebagai jumlah kunjungan
      // (karena setiap minggu dosen datang 1 kali ke kampus di hari itu)
      var maxHadir = Math.max.apply(null, sesiDiHari.map(function(a) { return a.total_hadir || 0; }));

      if (maxHadir > 0) {
        // Hitung berapa sesi aktif (punya kehadiran) di hari ini
        var sesiAktif = sesiDiHari.filter(function(a) { return (a.total_hadir || 0) > 0; }).length;

        // Per kunjungan (per minggu): 15.000 + (sesiAktif-1) × 5.000
        var transportPerKunjungan = 15000 + (sesiAktif - 1) * 5000;

        // Total transport hari ini = transport per kunjungan × jumlah kunjungan (maxHadir)
        transport += transportPerKunjungan * maxHadir;
      }
    });

    var total = fixed + attendance + transport;

    const { error } = await _sb.from('payroll').upsert({
      lecturer_id:                 lecId,
      period_month:                month,
      period_year:                 year,
      total_scheduled_hours:       totalScheduled,
      total_attended_hours:        totalAttended,
      fixed_component_amount:      fixed,
      attendance_component_amount: attendance,
      transportation_amount:       transport,
      total_salary:                total,
      updated_at:                  new Date().toISOString()
    }, { onConflict: 'lecturer_id,period_month,period_year' });
    if (error) throw error;
    processed++;
  }
  return { success: true, processed };
}

// ── EXPOSE GLOBAL ─────────────────────────────────────────────────────────────
window._sb  = _sb;
window.auth = auth;
