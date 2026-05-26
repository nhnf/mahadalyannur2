/**
 * Supabase Client
 * Koneksi ke Supabase project.
 *
 * KONFIGURASI: Salin .env.example ke config.js dan isi nilai yang sesuai.
 * Jangan pernah commit nilai asli ke git.
 */

// Ambil konfigurasi dari window.__APP_CONFIG__ yang di-inject oleh config.js
var _cfg = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

var SUPABASE_URL  = _cfg.SUPABASE_URL  || '';
var SUPABASE_ANON = _cfg.SUPABASE_ANON || '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    '[GajiDosen] Konfigurasi Supabase tidak ditemukan.\n' +
    'Salin config.example.js ke config.js dan isi SUPABASE_URL & SUPABASE_ANON.'
  );
}

// Inisialisasi Supabase client (dari CDN)
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── AUTHENTICATION ────────────────────────────────────────────────────────────
// Autentikasi custom menggunakan tabel users (bukan Supabase Auth)
var _session = null;

var auth = {
  /**
   * Login dengan email + password
   * Verifikasi SHA-256 hex hash di tabel users
   */
  async signInWithPassword(creds) {
    try {
      // Hash password di frontend menggunakan Web Crypto API
      const encoder = new TextEncoder();
      const data     = encoder.encode(creds.password);
      const hashBuf  = await crypto.subtle.digest('SHA-256', data);
      const hashArr  = Array.from(new Uint8Array(hashBuf));
      const hashHex  = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: users, error } = await _sb
        .from('users')
        .select('id, email, role, password_hash, is_active')
        .eq('email', creds.email.trim().toLowerCase())
        .is('deleted_at', null)
        .limit(1);

      if (error) throw error;
      if (!users || users.length === 0) throw new Error('Email tidak ditemukan');

      const user = users[0];
      if (!user.is_active) throw new Error('Akun tidak aktif. Hubungi administrator.');
      if (user.password_hash !== hashHex) throw new Error('Password salah');

      _session = {
        user: { id: user.id, email: user.email, role: user.role },
        // Simpan waktu login untuk validasi expiry (8 jam)
        loginAt: Date.now()
      };
      localStorage.setItem('gd_session', JSON.stringify(_session));
      return { data: _session, error: null };

    } catch (err) {
      return { data: null, error: err };
    }
  },

  async getSession() {
    if (!_session) {
      try {
        const stored = localStorage.getItem('gd_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validasi expiry: 8 jam
          const SESSION_TTL = 8 * 60 * 60 * 1000;
          if (parsed && parsed.loginAt && (Date.now() - parsed.loginAt) < SESSION_TTL) {
            _session = parsed;
          } else {
            // Session kadaluarsa
            localStorage.removeItem('gd_session');
            _session = null;
          }
        }
      } catch(e) { _session = null; }
    }
    return { data: { session: _session }, error: null };
  },

  async signOut() {
    _session = null;
    localStorage.removeItem('gd_session');
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
        if (options.filters[k] !== null && options.filters[k] !== undefined) {
          query = query.eq(k, options.filters[k]);
        }
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
// Hitung dari attendance_monthly (1 baris = 1 dosen+matkul+hari+sesi per bulan)

async function calculatePayrollLocal(month, year) {
  const lecRes = await _sb.from('lecturers')
    .select('id').is('deleted_at', null).eq('is_active', true);
  if (lecRes.error) throw lecRes.error;

  // Ambil attendance bulan ini dengan tarif
  const attRes = await _sb.from('v_attendance_monthly')
    .select('lecturer_id, total_meetings, total_hadir, tarif_per_jam')
    .eq('period_month', month)
    .eq('period_year', year);
  if (attRes.error) throw attRes.error;

  // Group per dosen
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

    var totalScheduled = 0;
    var totalAttended  = 0;
    var fixed          = 0;
    var attendance     = 0;

    attList.forEach(function(a) {
      var tarif    = parseFloat(a.tarif_per_jam || 0);
      var meetings = a.total_meetings || 0;
      var hadir    = a.total_hadir    || 0;

      totalScheduled += meetings;
      totalAttended  += hadir;

      // Gaji tetap = total pertemuan × tarif × 50%
      fixed += meetings * tarif * 0.5;

      // Gaji kehadiran = total hadir × tarif × 50%
      attendance += hadir * tarif * 0.5;
    });

    // Transport: Rp 15.000 per pertemuan hadir
    var transport = totalAttended * 15000;

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

  return { success: true, processed: processed };
}

// ── EXPOSE GLOBAL ─────────────────────────────────────────────────────────────
window._sb  = _sb;
window.auth = auth;
