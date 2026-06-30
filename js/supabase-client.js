/**
 * Supabase Client — menggunakan Supabase Auth (bukan custom auth)
 * JWT di-set otomatis, RLS berfungsi penuh.
 */

// Baca config dari config.js (window.__APP_CONFIG__)
var _cfg = window.__APP_CONFIG__ || {};
var SUPABASE_URL  = _cfg.SUPABASE_URL  || 'https://unyfvjugdyrdirkdrifw.supabase.co';
var SUPABASE_ANON = _cfg.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWZ2anVnZHlyZGlya2RyaWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTM2MjMsImV4cCI6MjA5NTI4OTYyM30.J9694tJehud3vlWZccqcZVyb_xsHSjO9lyvN3twPPmw';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});


function normalizeRole(rawRole) {
  var role = String(rawRole || '').trim();
  if (!role) return 'Viewer';

  var lower = role.toLowerCase();
  if (lower === 'super admin' || lower === 'super_admin' || lower === 'admin') return 'Super Admin';
  if (lower === 'admin kurikulum' || lower === 'admin_kurikulum' || lower === 'hr') return 'Admin Kurikulum';
  if (lower === 'operator jadwal' || lower === 'operator_jadwal' || lower === 'finance') return 'Operator Jadwal';
  if (lower === 'viewer' || lower === 'lecturer') return 'Viewer';
  if (lower === 'mahasantri' || lower === 'student') return 'Mahasantri';

  return role;
}

function isAdminAreaRole(role) {
  var normalized = normalizeRole(role);
  return normalized === 'Super Admin' || normalized === 'Admin Kurikulum' || normalized === 'Operator Jadwal';
}

function isScheduleOperatorRole(role) {
  var normalized = normalizeRole(role);
  return normalized === 'Super Admin' || normalized === 'Operator Jadwal';
}

// ── AUTH WRAPPER ──────────────────────────────────────────────────────────────
var auth = {
  async signInWithPassword(creds) {
    try {
      const { data, error } = await _sb.auth.signInWithPassword({
        email:    creds.email.trim().toLowerCase(),
        password: creds.password
      });
      if (error) throw error;
      const role = normalizeRole(data.user?.app_metadata?.role);
      return {
        data: { user: { id: data.user.id, email: data.user.email, role } },
        error: null
      };
    } catch (err) {
      var msg = err.message || 'Login gagal';
      if (msg.includes('Invalid login credentials')) msg = 'Email atau password salah';
      if (msg.includes('Email not confirmed'))       msg = 'Email belum dikonfirmasi';
      if (msg.includes('Too many requests'))         msg = 'Terlalu banyak percobaan login. Coba lagi nanti.';
      return { data: null, error: { message: msg } };
    }
  },

  async signInWithOtp(email) {
    try {
      const { error } = await _sb.auth.signInWithOtp({
        email: email.trim().toLowerCase()
      });
      if (error) throw error;
      return { data: { message: 'Kode OTP telah dikirim ke email Anda' }, error: null };
    } catch (err) {
      var msg = err.message || 'Gagal mengirim OTP';
      if (msg.includes('Too many requests')) msg = 'Terlalu banyak permintaan. Coba lagi nanti.';
      return { data: null, error: { message: msg } };
    }
  },

  async verifyOtp(email, token) {
    try {
      const { data, error } = await _sb.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email'
      });
      if (error) throw error;
      const role = normalizeRole(data.user?.app_metadata?.role);
      return {
        data: { user: { id: data.user.id, email: data.user.email, role } },
        error: null
      };
    } catch (err) {
      var msg = err.message || 'Kode OTP salah atau kedaluwarsa';
      if (msg.includes('Token has expired')) msg = 'Kode OTP sudah kedaluwarsa. Minta kode baru.';
      if (msg.includes('Invalid token')) msg = 'Kode OTP salah. Periksa kembali.';
      return { data: null, error: { message: msg } };
    }
  },

  async getSession() {
    const { data, error } = await _sb.auth.getSession();
    if (error || !data.session) return { data: { session: null }, error };
    const user = data.session.user;
    const role = normalizeRole(user?.app_metadata?.role);
    return {
      data: { session: { user: { id: user.id, email: user.email, role } } },
      error: null
    };
  },

  async resetPasswordForEmail(email) {
    try {
      const { error } = await _sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + '/reset-password.html'
      });
      if (error) throw error;
      return { data: { message: 'Link reset password telah dikirim ke email Anda' }, error: null };
    } catch (err) {
      var msg = err.message || 'Gagal mengirim link reset password';
      if (msg.includes('Too many requests')) msg = 'Terlalu banyak permintaan. Coba lagi nanti.';
      return { data: null, error: { message: msg } };
    }
  },

  async updateUserPassword(newPassword) {
    try {
      const { data, error } = await _sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const role = normalizeRole(data.user?.app_metadata?.role);
      return {
        data: { user: { id: data.user.id, email: data.user.email, role } },
        error: null
      };
    } catch (err) {
      var msg = err.message || 'Gagal mengubah password';
      if (msg.includes('New password should be different')) msg = 'Password baru harus berbeda dari password lama';
      if (msg.includes('Password should be at least 6')) msg = 'Password minimal 6 karakter';
      return { data: null, error: { message: msg } };
    }
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

  // Ambil semua kolom termasuk matkul dan kategori per baris
  const attRes = await _sb.from('v_attendance_monthly')
    .select('lecturer_id, day_of_week, mata_kuliah_id, matkul_nama, category_id, category_code, tarif_per_jam, total_meetings, total_hadir')
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

    // ── HITUNG GAJI PER MATKUL/KATEGORI ──────────────────────────────────
    var totalScheduled = 0, totalAttended = 0, fixed = 0, attendance = 0;
    var detailsByKey = {}; // key = mata_kuliah_id|category_id

    attList.forEach(function(a) {
      var tarif    = parseFloat(a.tarif_per_jam || 0);
      var meetings = a.total_meetings || 0;
      var hadir    = a.total_hadir    || 0;

      totalScheduled += meetings;
      totalAttended  += hadir;
      fixed      += meetings * tarif * 0.5;
      attendance += hadir    * tarif * 0.5;

      // Akumulasi per matkul+kategori untuk detail
      var key = (a.mata_kuliah_id || 'null') + '|' + (a.category_id || 'null');
      if (!detailsByKey[key]) {
        detailsByKey[key] = {
          mata_kuliah_id: a.mata_kuliah_id || null,
          matkul_nama:    a.matkul_nama    || '-',
          category_id:    a.category_id    || null,
          category_code:  a.category_code  || '-',
          tarif_per_jam:  tarif,
          total_meetings: 0,
          total_hadir:    0,
          fixed_amount:   0,
          attend_amount:  0
        };
      }
      detailsByKey[key].total_meetings += meetings;
      detailsByKey[key].total_hadir    += hadir;
      detailsByKey[key].fixed_amount   += meetings * tarif * 0.5;
      detailsByKey[key].attend_amount  += hadir    * tarif * 0.5;
    });

    // ── HITUNG TRANSPORT PER HARI ──────────────────────────────────────────
    // Per hari: sesi ke-1 hadir → Rp 15.000, sesi berikutnya → +Rp 5.000
    // Dikalikan jumlah kunjungan (minggu) dalam bulan
    var transport = 0;
    var hariList  = {};
    attList.forEach(function(a) {
      var hari = a.day_of_week || 'unknown';
      if (!hariList[hari]) hariList[hari] = [];
      hariList[hari].push(a);
    });

    Object.keys(hariList).forEach(function(hari) {
      var sesiDiHari = hariList[hari];
      var maxHadir   = Math.max.apply(null, sesiDiHari.map(function(a) { return a.total_hadir || 0; }));
      if (maxHadir > 0) {
        var sesiAktif = sesiDiHari.filter(function(a) { return (a.total_hadir || 0) > 0; }).length;
        var transportPerKunjungan = 15000 + (sesiAktif - 1) * 5000;
        transport += transportPerKunjungan * maxHadir;
      }
    });

    var total = fixed + attendance + transport;

    // ── UPSERT PAYROLL HEADER ─────────────────────────────────────────────
    const { data: payrollRow, error: payErr } = await _sb.from('payroll').upsert({
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
    }, { onConflict: 'lecturer_id,period_month,period_year' }).select('id').single();
    if (payErr) throw payErr;

    // ── UPSERT PAYROLL DETAILS (per matkul/kategori) ──────────────────────
    await _sb.from('payroll_details').delete().eq('payroll_id', payrollRow.id);

    var detailRows = Object.values(detailsByKey).map(function(d) {
      return Object.assign({}, d, {
        payroll_id:   payrollRow.id,
        lecturer_id:  lecId,
        period_month: month,
        period_year:  year
      });
    });

    if (detailRows.length > 0) {
      const { error: detErr } = await _sb.from('payroll_details').insert(detailRows);
      if (detErr) throw detErr;
    }

    processed++;
  }

  return { success: true, processed };
}

// ── EXPOSE GLOBAL ─────────────────────────────────────────────────────────────
window._sb  = _sb;
window.auth = auth;
