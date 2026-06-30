/**
 * Attendance Module — Rekap Bulanan
 * 1 baris = 1 dosen + 1 matkul + 1 hari + 1 sesi (deduplikasi antar semester)
 */

var attendanceMonthlyData = [];

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function loadAttendance() {
  var tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;

  var month = parseInt(document.getElementById('filterAttendanceMonth')?.value) || getCurrentMonth();
  var year  = parseInt(document.getElementById('filterAttendanceYear')?.value)  || getCurrentYear();

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';

  try {
    // 1. Ambil semua jadwal aktif, deduplikasi per lecturer+matkul+hari+sesi
    const { data: schedules, error: schErr } = await _sb
      .from('schedules')
      .select('lecturer_id, mata_kuliah_id, day_of_week, session_slot, mata_kuliah')
      .is('deleted_at', null)
      .not('lecturer_id', 'is', null);  // hanya jadwal yang punya dosen
    if (schErr) throw schErr;

    if (!schedules || schedules.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);">Belum ada jadwal.</td></tr>';
      return;
    }

    // Deduplikasi: key = lecturer_id|matkul_id|hari|sesi
    var seen = {};
    var unique = [];
    schedules.forEach(function(s) {
      var key = [s.lecturer_id, s.mata_kuliah_id||'', s.day_of_week, s.session_slot].join('|');
      if (!seen[key]) {
        seen[key] = true;
        unique.push(s);
      }
    });

    // 2. Hitung total pertemuan per hari dalam bulan
    var meetingsInMonth = countMeetingsInMonth(month, year);

    // 3. Ambil data attendance yang sudah ada di DB untuk menghindari duplikasi
    const { data: existingAtt, error: extErr } = await _sb
      .from('attendance_monthly')
      .select('lecturer_id, mata_kuliah_id, day_of_week, session_slot')
      .eq('period_month', month)
      .eq('period_year', year);
    if (extErr) throw extErr;

    var existingMap = {};
    (existingAtt || []).forEach(function(e) {
      var key = [e.lecturer_id, e.mata_kuliah_id||'', e.day_of_week, e.session_slot].join('|');
      existingMap[key] = true;
    });

    // 4. Generate attendance_monthly jika belum ada
    var toInsert = unique.filter(function(s) {
      var key = [s.lecturer_id, s.mata_kuliah_id||'', s.day_of_week, s.session_slot].join('|');
      return !existingMap[key];
    }).map(function(s) {
      return {
        lecturer_id:    s.lecturer_id,
        mata_kuliah_id: s.mata_kuliah_id || null,
        day_of_week:    s.day_of_week,
        session_slot:   s.session_slot,
        period_month:   month,
        period_year:    year,
        total_meetings: meetingsInMonth[s.day_of_week] || 4,
        total_hadir:    0
      };
    });

    if (toInsert.length > 0) {
      const { error: insErr } = await _sb.from('attendance_monthly').insert(toInsert);
      if (insErr) throw insErr;
    }

    // 5. Ambil data attendance bulan ini via view
    const { data: attData, error: attErr } = await _sb
      .from('v_attendance_monthly')
      .select('*')
      .eq('period_month', month)
      .eq('period_year', year)
      .order('lecturer_name')
      .order('day_of_week')
      .order('session_slot');
    if (attErr) throw attErr;

    attendanceMonthlyData = attData || [];
    renderAttendanceTable();

  } catch(err) {
    console.error('loadAttendance error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data presensi</td></tr>';
    showToast('Gagal memuat data presensi', 'error');
  }
}

// Hitung berapa kali setiap hari muncul dalam bulan
function countMeetingsInMonth(month, year) {
  var HARI_MAP = {0:'Ahad',1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu'};
  var counts = {};
  var daysInMonth = new Date(year, month, 0).getDate();
  for (var d = 1; d <= daysInMonth; d++) {
    var dayName = HARI_MAP[new Date(year, month - 1, d).getDay()];
    counts[dayName] = (counts[dayName] || 0) + 1;
  }
  return counts;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderAttendanceTable() {
  var tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;

  if (attendanceMonthlyData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);">Tidak ada data</td></tr>';
    return;
  }

  // Ringkasan cepat
  var totalJadwal  = attendanceMonthlyData.length;
  var totalHadir   = attendanceMonthlyData.reduce(function(s,a) { return s + (a.total_hadir||0); }, 0);
  var totalMeeting = attendanceMonthlyData.reduce(function(s,a) { return s + (a.total_meetings||0); }, 0);
  var summary = document.getElementById('attendanceQuickSummary');
  if (summary) {
    summary.innerHTML =
      '<span class="badge badge-blue">' + totalJadwal + ' Jadwal</span> ' +
      '<span class="badge badge-green">' + totalHadir + ' Total Hadir</span> ' +
      '<span class="badge badge-gray">' + totalMeeting + ' Total Pertemuan</span>';
  }

  var SESI_LABEL = {1:'Pagi 1', 2:'Pagi 2', 3:'Sore', 4:'Malam'};

  // Group per dosen berdasarkan lecturer_id
  var byLecturer = {};
  var lecturerOrder = [];
  attendanceMonthlyData.forEach(function(a) {
    var lid = a.lecturer_id;
    if (!byLecturer[lid]) {
      byLecturer[lid] = {
        name: a.lecturer_name || '-',
        nidn: a.nidn || '',
        rows: []
      };
      lecturerOrder.push(lid);
    }
    byLecturer[lid].rows.push(a);
  });

  // Urutkan lecturer berdasarkan nama dosen
  lecturerOrder.sort(function(a, b) {
    return byLecturer[a].name.localeCompare(byLecturer[b].name, 'id');
  });

  var html = '';
  lecturerOrder.forEach(function(lid) {
    var group = byLecturer[lid];
    var rows = group.rows;
    rows.forEach(function(a, idx) {
      var meetings = a.total_meetings || 0;
      var hadir    = a.total_hadir    || 0;
      var pct      = meetings > 0 ? Math.round((hadir/meetings)*100) : 0;
      var barColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
      var tarif    = parseFloat(a.tarif_per_jam || 0);
      var tarifTxt = tarif > 0
        ? '<span class="badge badge-blue" style="font-size:10px;">' + escapeHtml(a.category_code||'?') + ' — ' + formatCurrency(tarif) + '</span>'
        : '<span class="badge badge-gray" style="font-size:10px;">Tarif belum diset</span>';

      html += '<tr data-att-id="' + escapeHtml(a.id) + '">';

      // Nama dosen (rowspan)
      if (idx === 0) {
        html += '<td rowspan="' + rows.length + '" style="vertical-align:middle;font-weight:600;border-right:2px solid var(--card-border);">' +
          escapeHtml(group.name) + '<br><small class="text-secondary">' + escapeHtml(group.nidn) + '</small>' +
        '</td>';
      }

      html += '<td>' +
        '<span class="badge badge-blue" style="margin-right:4px;">' + escapeHtml(SESI_LABEL[a.session_slot]||'Jam '+a.session_slot) + '</span>' +
        '<small class="text-secondary">' + escapeHtml(a.day_of_week||'') + '</small>' +
      '</td>';

      html += '<td>' +
        '<div style="font-size:13px;">' + escapeHtml(a.matkul_nama||a.mata_kuliah||'-') + '</div>' +
        '<div style="margin-top:2px;">' + tarifTxt + '</div>' +
      '</td>';

      html += '<td style="text-align:center;">' +
        '<input type="number" class="input meetings-input" data-field="meetings" ' +
          'value="' + meetings + '" min="0" max="10" ' +
          'style="width:55px;text-align:center;padding:4px;" ' +
          'onchange="updateHadirMax(this)">' +
      '</td>';

      html += '<td style="text-align:center;">' +
        '<input type="number" class="input hadir-input" data-field="hadir" ' +
          'value="' + hadir + '" min="0" max="' + meetings + '" ' +
          'style="width:55px;text-align:center;padding:4px;" ' +
          'onchange="updatePctDisplay(this)">' +
      '</td>';

      html += '<td style="min-width:110px;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<div class="progress-track" style="flex:1;">' +
            '<div class="progress-fill pct-bar" style="width:' + pct + '%;background:' + barColor + ';"></div>' +
          '</div>' +
          '<span class="pct-text" style="font-size:11px;font-weight:600;color:' + barColor + ';width:32px;">' + pct + '%</span>' +
        '</div>' +
      '</td>';

      html += '</tr>';
    });
  });

  tbody.innerHTML = html;
}

function updateHadirMax(inp) {
  var row = inp.closest('tr');
  var hadirInp = row.querySelector('[data-field="hadir"]');
  var max = parseInt(inp.value) || 0;
  hadirInp.max = max;
  if (parseInt(hadirInp.value) > max) hadirInp.value = max;
  updatePctDisplay(hadirInp);
}

function updatePctDisplay(inp) {
  var row = inp.closest('tr');
  var meetInp = row.querySelector('[data-field="meetings"]');
  var meetings = parseInt(meetInp?.value) || 0;
  var hadir    = parseInt(inp.value) || 0;
  var pct      = meetings > 0 ? Math.round((hadir/meetings)*100) : 0;
  var barColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
  var bar  = row.querySelector('.pct-bar');
  var text = row.querySelector('.pct-text');
  if (bar)  { bar.style.width = pct + '%'; bar.style.background = barColor; }
  if (text) { text.textContent = pct + '%'; text.style.color = barColor; }
}

// ── MARK ALL PRESENT ──────────────────────────────────────────────────────────
function markAllPresent() {
  var rows = document.querySelectorAll('#attendanceTableBody tr[data-att-id]');
  rows.forEach(function(row) {
    var meetInp  = row.querySelector('[data-field="meetings"]');
    var hadirInp = row.querySelector('[data-field="hadir"]');
    if (!meetInp || !hadirInp) return;
    hadirInp.value = meetInp.value;
    updatePctDisplay(hadirInp);
  });
  showToast('Semua jadwal ditandai Hadir penuh', 'success');
}

// ── RESET ─────────────────────────────────────────────────────────────────────
async function resetAttendance() {
  var rows = document.querySelectorAll('#attendanceTableBody tr[data-att-id]');
  if (rows.length === 0) { showToast('Tidak ada data untuk direset', 'warning'); return; }
  if (!confirm('Reset semua hadir menjadi 0 untuk periode ini?')) return;
  try {
    showLoading();
    var promises = [];
    rows.forEach(function(row) {
      promises.push(
        _sb.from('attendance_monthly')
          .update({ total_hadir: 0, updated_at: new Date().toISOString() })
          .eq('id', row.dataset.attId)
      );
      var hadirInp = row.querySelector('[data-field="hadir"]');
      if (hadirInp) { hadirInp.value = 0; updatePctDisplay(hadirInp); }
    });
    var results = await Promise.all(promises);
    var errs = results.filter(function(r) { return r.error; });
    if (errs.length > 0) throw errs[0].error;
    showToast('Presensi berhasil direset ke 0', 'success');
  } catch(err) {
    showToast(err.message || 'Gagal mereset presensi', 'error');
  } finally { hideLoading(); }
}

async function saveAttendance() {
  var rows = document.querySelectorAll('#attendanceTableBody tr[data-att-id]');
  if (rows.length === 0) { showToast('Tidak ada data untuk disimpan', 'warning'); return; }
  try {
    showLoading();
    var promises = [];
    rows.forEach(function(row) {
      var id       = row.dataset.attId;
      var meetings = parseInt(row.querySelector('[data-field="meetings"]')?.value) || 0;
      var hadir    = parseInt(row.querySelector('[data-field="hadir"]')?.value)    || 0;
      if (hadir > meetings) hadir = meetings;
      promises.push(
        _sb.from('attendance_monthly')
          .update({ total_meetings: meetings, total_hadir: hadir, updated_at: new Date().toISOString() })
          .eq('id', id)
      );
    });
    var results = await Promise.all(promises);
    var errs = results.filter(function(r) { return r.error; });
    if (errs.length > 0) throw errs[0].error;
    showToast('Presensi ' + rows.length + ' jadwal berhasil disimpan', 'success');
  } catch(err) {
    console.error('saveAttendance error:', err);
    showToast(err.message || 'Gagal menyimpan presensi', 'error');
  } finally { hideLoading(); }
}

// ── REKAP ─────────────────────────────────────────────────────────────────────
async function loadAttendanceSummary() {
  var container = document.getElementById('attendanceSummaryContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></div>';
  try {
    var month = parseInt(document.getElementById('summaryMonth')?.value) || getCurrentMonth();
    var year  = parseInt(document.getElementById('summaryYear')?.value)  || getCurrentYear();

    const { data, error } = await _sb.from('v_attendance_monthly')
      .select('lecturer_name, nidn, total_meetings, total_hadir')
      .eq('period_month', month).eq('period_year', year)
      .order('lecturer_name');
    if (error) throw error;

    var byLec = {};
    (data || []).forEach(function(a) {
      var n = a.lecturer_name;
      if (!byLec[n]) byLec[n] = { nidn: a.nidn, meetings: 0, hadir: 0 };
      byLec[n].meetings += a.total_meetings || 0;
      byLec[n].hadir    += a.total_hadir    || 0;
    });

    var names = Object.keys(byLec).sort();
    if (names.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:var(--space-8);">Belum ada data presensi untuk periode ini</div>';
      return;
    }

    var html = '<div class="table-container"><table class="table">' +
      '<thead><tr><th>Dosen</th><th style="text-align:center;">Total Pertemuan</th>' +
      '<th style="text-align:center;">Total Hadir</th><th>% Kehadiran</th></tr></thead><tbody>';

    names.forEach(function(n) {
      var d = byLec[n];
      var pct = d.meetings > 0 ? Math.round((d.hadir/d.meetings)*100) : 0;
      var barColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
      html += '<tr>' +
        '<td><strong>' + escapeHtml(n) + '</strong><br><small class="text-secondary">' + escapeHtml(d.nidn||'') + '</small></td>' +
        '<td style="text-align:center;">' + d.meetings + '</td>' +
        '<td style="text-align:center;"><span class="badge badge-green">' + d.hadir + '</span></td>' +
        '<td style="min-width:140px;"><div style="display:flex;align-items:center;gap:8px;">' +
          '<div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
          '<span style="font-size:12px;font-weight:600;color:' + barColor + ';width:36px;">' + pct + '%</span>' +
        '</div></td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat rekap</div>';
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initAttendanceModule() {
  var applyBtn = document.getElementById('applyAttendanceFilter');
  if (applyBtn) applyBtn.addEventListener('click', loadAttendance);
  var markAllBtn = document.getElementById('markAllPresentBtn');
  if (markAllBtn) markAllBtn.addEventListener('click', markAllPresent);
  var resetBtn = document.getElementById('resetAttendanceBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetAttendance);
  var saveBtn = document.getElementById('saveAttendanceBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveAttendance);

  var summaryTab = document.getElementById('attendanceSummaryTab');
  var inputTab   = document.getElementById('attendanceInputTab');
  if (summaryTab) summaryTab.addEventListener('click', function() {
    document.getElementById('attendanceInputPanel').style.display  = 'none';
    document.getElementById('attendanceSummaryPanel').style.display = 'block';
    summaryTab.classList.add('active');
    if (inputTab) inputTab.classList.remove('active');
    loadAttendanceSummary();
  });
  if (inputTab) inputTab.addEventListener('click', function() {
    document.getElementById('attendanceSummaryPanel').style.display = 'none';
    document.getElementById('attendanceInputPanel').style.display   = 'block';
    inputTab.classList.add('active');
    if (summaryTab) summaryTab.classList.remove('active');
  });
  var loadSummaryBtn = document.getElementById('loadSummaryBtn');
  if (loadSummaryBtn) loadSummaryBtn.addEventListener('click', loadAttendanceSummary);
}
