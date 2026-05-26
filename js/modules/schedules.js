/**
 * Schedules Module — Supabase
 * Tampilan tabel: baris = Hari+Sesi, kolom = Semester (2A,2B,4,6,8)
 */

var schedulesData = [];
var HARI_ORDER   = ['Sabtu','Ahad','Senin','Selasa','Rabu','Kamis'];
var SESI_LABEL   = {1:'Pagi 1', 2:'Pagi 2', 3:'Sore', 4:'Malam'};
// Semester 2A dan 2B digabung jadi satu kolom "2" di tampilan
// tapi data di DB tetap '2A' dan '2B'
var SEMESTERS    = ['2','4','6','8'];
var SEM_DISPLAY  = {'2':'2 (2A & 2B)', '4':'4', '6':'6', '8':'8'};
var SEM_MATCH    = {'2':['2A','2B'],    '4':['4'],'6':['6'],'8':['8']};

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function loadSchedules() {
  var container = document.getElementById('scheduleTableContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></div>';

  try {
    var query = _sb.from('v_schedules_with_lecturer').select('*');
    var lecturerId = document.getElementById('filterScheduleLecturer') ?
      document.getElementById('filterScheduleLecturer').value : '';
    if (lecturerId) query = query.eq('lecturer_id', lecturerId);

    const { data, error } = await query;
    if (error) throw error;
    schedulesData = data || [];
    renderScheduleGrid();
  } catch(err) {
    console.error('loadSchedules error:', err);
    container.innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data jadwal</div>';
    showToast('Gagal memuat data jadwal', 'error');
  }
}

// ── RENDER GRID ───────────────────────────────────────────────────────────────
function renderScheduleGrid() {
  var container = document.getElementById('scheduleTableContainer');
  if (!container) return;

  if (schedulesData.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:var(--space-8);">Belum ada jadwal</div>';
    return;
  }

  // Build lookup: grid[hari][sesi][semester_bucket] = [entries]
  var grid = {};
  HARI_ORDER.forEach(function(h) {
    grid[h] = {};
    [1,2,3,4].forEach(function(sl) {
      grid[h][sl] = {};
      SEMESTERS.forEach(function(sm) { grid[h][sl][sm] = []; });
    });
  });

  schedulesData.forEach(function(s) {
    var h  = s.day_of_week;
    var sl = s.session_slot;
    var rawSem = s.semester;
    // 2A dan 2B masuk ke bucket '2'
    var bucket = (rawSem === '2A' || rawSem === '2B') ? '2' : rawSem;
    if (!grid[h] || !grid[h][sl] || grid[h][sl][bucket] === undefined) return;
    grid[h][sl][bucket].push(s);
  });

  // Tentukan hari & sesi yang punya data
  var hariAda = HARI_ORDER.filter(function(h) {
    return [1,2,3,4].some(function(sl) {
      return SEMESTERS.some(function(sm) { return grid[h][sl][sm].length > 0; });
    });
  });

  if (hariAda.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:var(--space-8);">Belum ada jadwal</div>';
    return;
  }

  // ── Bangun HTML tabel ──────────────────────────────────────────────────────
  var html = '<div class="table-container"><table class="table schedule-grid-table">';

  // Header: HARI | WAKTU | 2A | 2B | 4 | 6 | 8
  html += '<thead><tr>';
  html += '<th style="text-align:center;width:70px;">HARI</th>';
  html += '<th style="text-align:center;width:65px;">WAKTU</th>';
  SEMESTERS.forEach(function(sm) {
    html += '<th style="text-align:center;">Semester ' + SEM_DISPLAY[sm] + '</th>';
  });
  html += '</tr></thead><tbody>';

  hariAda.forEach(function(hari) {
    var sesiAda = [1,2,3,4].filter(function(sl) {
      return SEMESTERS.some(function(sm) { return grid[hari][sl][sm].length > 0; });
    });
    if (sesiAda.length === 0) return;

    sesiAda.forEach(function(sl, idx) {
      html += '<tr>';

      // Kolom HARI (rowspan)
      if (idx === 0) {
        html += '<td rowspan="' + sesiAda.length + '" ' +
          'style="text-align:center;font-weight:700;vertical-align:middle;' +
          'background:var(--primary-50);color:var(--primary-700);' +
          'border-right:2px solid var(--primary-200);white-space:nowrap;">' +
          hari + '</td>';
      }

      // Kolom WAKTU
      html += '<td style="text-align:center;white-space:nowrap;font-size:12px;' +
        'font-weight:600;color:var(--text-secondary);background:var(--surface-2);' +
        'border-right:1px solid var(--card-border);vertical-align:middle;">' +
        SESI_LABEL[sl] + '</td>';

      // Kolom per Semester
      SEMESTERS.forEach(function(sm) {
        var entries = grid[hari][sl][sm];
        html += '<td style="vertical-align:top;padding:6px;">';
        if (entries.length === 0) {
          html += '<span style="color:var(--text-tertiary);font-size:12px;">-</span>';
        } else {
          entries.forEach(function(s) {
            var statusColor = s.status === 'hadir' ? 'var(--success)' :
                              s.status === 'absen' ? 'var(--danger)'  : 'var(--warning)';
            html += '<div class="schedule-dosen-card" style="border-left:3px solid ' + statusColor + ';margin-bottom:4px;">' +
              '<div class="schedule-dosen-name">' + (s.lecturer_name||'-') + '</div>' +
              '<div class="schedule-dosen-matkul">' + (s.mata_kuliah||'-') + '</div>' +
              '</div>';
          });
        }
        html += '</td>';
      });

      html += '</tr>';
    });

    // Garis pemisah antar hari (HARI + WAKTU + 4 semester = 6 kolom)
    html += '<tr><td colspan="6" style="padding:0;background:var(--primary-100);height:3px;"></td></tr>';
  });

  html += '</tbody></table></div>';

  // Legenda
  html += '<div style="display:flex;gap:var(--space-4);margin-top:var(--space-3);font-size:12px;color:var(--text-secondary);">' +
    '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--warning);border-radius:2px;display:inline-block;"></span> Pending</span>' +
    '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--success);border-radius:2px;display:inline-block;"></span> Hadir</span>' +
    '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--danger);border-radius:2px;display:inline-block;"></span> Absen</span>' +
    '</div>';

  container.innerHTML = html;
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function showAddScheduleModal() {
  document.getElementById('scheduleForm').reset();
  document.getElementById('scheduleModal').style.display = 'flex';
}

function closeScheduleModal() {
  document.getElementById('scheduleModal').style.display = 'none';
  document.getElementById('scheduleForm').reset();
}

async function saveSchedule() {
  var lecturerId = document.getElementById('scheduleLecturer').value;
  var dayOfWeek  = document.getElementById('scheduleDay').value;
  var semester   = document.getElementById('scheduleSemester').value;
  var matkul     = document.getElementById('scheduleMatkul').value.trim();
  var notes      = document.getElementById('scheduleNotes').value.trim();
  var checked    = document.querySelectorAll('input[name="sessionSlot"]:checked');
  var slots      = Array.prototype.map.call(checked, function(cb) { return parseInt(cb.value); });

  if (!lecturerId) { showToast('Pilih dosen terlebih dahulu', 'error'); return; }
  if (!dayOfWeek)  { showToast('Pilih hari terlebih dahulu', 'error'); return; }
  if (!semester)   { showToast('Pilih semester terlebih dahulu', 'error'); return; }
  if (slots.length === 0) { showToast('Pilih minimal satu sesi jam', 'error'); return; }

  try {
    showLoading();
    var rows = slots.map(function(slot) {
      return { lecturer_id: lecturerId, day_of_week: dayOfWeek, session_slot: slot,
               semester: semester, mata_kuliah: matkul||null, status: 'pending', notes: notes||null };
    });
    const { error } = await _sb.from('schedules').insert(rows);
    if (error) {
      if (error.code === '23505') showToast('Jadwal sudah ada untuk kombinasi tersebut', 'warning');
      else throw error;
    } else {
      showToast(slots.length + ' jadwal berhasil ditambahkan', 'success');
    }
    closeScheduleModal();
    loadSchedules();
  } catch(err) {
    console.error('saveSchedule error:', err);
    showToast(err.message || 'Gagal menyimpan jadwal', 'error');
  } finally { hideLoading(); }
}

async function deleteSchedule(id) {
  if (!confirm('Hapus jadwal ini?')) return;
  try {
    showLoading();
    const { error } = await _sb.from('schedules').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    showToast('Jadwal berhasil dihapus', 'success');
    loadSchedules();
  } catch(err) {
    showToast(err.message || 'Gagal menghapus jadwal', 'error');
  } finally { hideLoading(); }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initSchedulesModule() {
  var addBtn = document.getElementById('addScheduleBtn');
  if (addBtn) addBtn.addEventListener('click', showAddScheduleModal);
  var closeBtn = document.getElementById('closeScheduleModal');
  if (closeBtn) closeBtn.addEventListener('click', closeScheduleModal);
  var cancelBtn = document.getElementById('cancelScheduleBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeScheduleModal);
  var saveBtn = document.getElementById('saveScheduleBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveSchedule);
  var filterSel = document.getElementById('filterScheduleLecturer');
  if (filterSel) filterSel.addEventListener('change', loadSchedules);
  var modal = document.getElementById('scheduleModal');
  if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeScheduleModal(); });
}
