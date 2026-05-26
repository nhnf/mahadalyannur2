/**
 * Schedules Module — Supabase
 * Tampilan tabel: baris = Hari+Sesi, kolom = Semester (2A,2B,4,6,8)
 */

var schedulesData = [];
var HARI_ORDER   = ['Sabtu','Ahad','Senin','Selasa','Rabu','Kamis'];
var SESI_LABEL   = {1:'Pagi 1', 2:'Pagi 2', 3:'Sore', 4:'Malam'};
var SEMESTERS    = ['2A','2B','4','6','8'];
var SEM_DISPLAY  = {'2A':'2A', '2B':'2B', '4':'4', '6':'6', '8':'8'};

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

  // Build grid[hari][sesi][bucket] = [entries]
  var grid = {};
  HARI_ORDER.forEach(function(h) {
    grid[h] = {};
    [1,2,3,4].forEach(function(sl) {
      grid[h][sl] = {};
      SEMESTERS.forEach(function(sm) { grid[h][sl][sm] = []; });
    });
  });

  schedulesData.forEach(function(s) {
    var h      = s.day_of_week;
    var sl     = s.session_slot;
    var bucket = s.semester;
    if (!grid[h] || !grid[h][sl] || grid[h][sl][bucket] === undefined) return;
    grid[h][sl][bucket].push(s);
  });

  var hariAda = HARI_ORDER.filter(function(h) {
    return [1,2,3,4].some(function(sl) {
      return SEMESTERS.some(function(sm) { return grid[h][sl][sm].length > 0; });
    });
  });

  if (hariAda.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:var(--space-8);">Belum ada jadwal</div>';
    return;
  }

  var html = '<div class="table-container"><table class="table schedule-grid-table">';
  html += '<thead><tr>';
  html += '<th style="text-align:center;width:70px;">HARI</th>';
  html += '<th style="text-align:center;width:65px;">WAKTU</th>';
  SEMESTERS.forEach(function(sm) {
    html += '<th style="text-align:center;">Semester ' + escapeHtml(SEM_DISPLAY[sm]) + '</th>';
  });
  html += '</tr></thead><tbody>';

  hariAda.forEach(function(hari) {
    var sesiAda = [1,2,3,4].filter(function(sl) {
      return SEMESTERS.some(function(sm) { return grid[hari][sl][sm].length > 0; });
    });
    if (sesiAda.length === 0) return;

    sesiAda.forEach(function(sl, idx) {
      html += '<tr>';

      if (idx === 0) {
        html += '<td rowspan="' + sesiAda.length + '" ' +
          'style="text-align:center;font-weight:700;vertical-align:middle;' +
          'background:var(--primary-50);color:var(--primary-700);' +
          'border-right:2px solid var(--primary-200);white-space:nowrap;">' +
          escapeHtml(hari) + '</td>';
      }

      html += '<td style="text-align:center;white-space:nowrap;font-size:12px;' +
        'font-weight:600;color:var(--text-secondary);background:var(--surface-2);' +
        'border-right:1px solid var(--card-border);vertical-align:middle;">' +
        escapeHtml(SESI_LABEL[sl]) + '</td>';

      SEMESTERS.forEach(function(sm) {
        var entries = grid[hari][sl][sm];
        html += '<td style="vertical-align:top;padding:6px;">';
        if (entries.length === 0) {
          html += '<span style="color:var(--text-tertiary);font-size:12px;">-</span>';
        } else {
          entries.forEach(function(s) {
            var hasDosen    = s.lecturer_id !== null && s.lecturer_name !== '—';
            var statusColor = s.status === 'hadir' ? 'var(--success)' :
                              s.status === 'absen' ? 'var(--danger)'  : 'var(--warning)';
            var bgStyle     = hasDosen ? '' : 'background:var(--surface-2);';

            html += '<div class="schedule-dosen-card" style="border-left:3px solid ' + statusColor + ';margin-bottom:4px;' + bgStyle + '">' +
              '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;">' +
                '<div style="flex:1;min-width:0;">';

            if (hasDosen) {
              html += '<div class="schedule-dosen-name">' + escapeHtml(s.lecturer_name) + '</div>';
            } else {
              html += '<div class="schedule-dosen-name" style="color:var(--text-tertiary);font-style:italic;font-size:11px;">Tanpa Dosen</div>';
            }

            html +=   '<div class="schedule-dosen-matkul">' + escapeHtml(s.mata_kuliah||'-') + '</div>' +
                      '<div style="font-size:10px;color:var(--text-tertiary);margin-top:2px;">Sem ' + escapeHtml(s.semester||'-') + '</div>' +
                    '</div>' +
                    '<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;">' +
                      '<button class="btn-icon" style="width:22px;height:22px;background:var(--info-bg);" ' +
                        'onclick="editSchedule(\'' + escapeHtml(s.id) + '\')" title="Edit">' +
                        '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
                      '</button>' +
                      '<button class="btn-icon" style="width:22px;height:22px;background:var(--danger-bg);" ' +
                        'onclick="deleteSchedule(\'' + escapeHtml(s.id) + '\')" title="Hapus">' +
                        '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
                      '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>';
          });
        }
        html += '</td>';
      });

      html += '</tr>';
    });

    html += '<tr><td colspan="7" style="padding:0;background:var(--primary-100);height:3px;"></td></tr>';
  });

  html += '</tbody></table></div>';

  html += '<div style="display:flex;gap:var(--space-4);margin-top:var(--space-3);font-size:12px;color:var(--text-secondary);">' +
    '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--warning);border-radius:2px;display:inline-block;"></span> Pending</span>' +
    '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--success);border-radius:2px;display:inline-block;"></span> Hadir</span>' +
    '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--danger);border-radius:2px;display:inline-block;"></span> Absen</span>' +
    '</div>';

  container.innerHTML = html;
}

// ── MODAL TAMBAH ──────────────────────────────────────────────────────────────
function showAddScheduleModal() {
  document.getElementById('scheduleModalTitle').textContent = 'Tambah Jadwal';
  document.getElementById('scheduleForm').reset();
  document.getElementById('scheduleId').value = '';
  document.querySelectorAll('input[name="sessionSlot"]').forEach(function(cb) { cb.disabled = false; });
  var sesiGroup = document.getElementById('sesiGroup');
  if (sesiGroup) sesiGroup.style.display = 'block';
  document.getElementById('scheduleModal').style.display = 'flex';
}

// ── EDIT ──────────────────────────────────────────────────────────────────────
async function editSchedule(id) {
  var s = schedulesData.find(function(x) { return x.id === id; });
  if (!s) { showToast('Jadwal tidak ditemukan', 'error'); return; }

  document.getElementById('scheduleModalTitle').textContent = 'Edit Jadwal';
  document.getElementById('scheduleId').value = s.id;

  document.getElementById('scheduleLecturer').value = s.lecturer_id || '';
  document.getElementById('scheduleDay').value      = s.day_of_week || '';
  document.getElementById('scheduleSemester').value = s.semester    || '';
  document.getElementById('scheduleMatkul').value   = s.mata_kuliah || '';
  document.getElementById('scheduleNotes').value    = s.notes       || '';

  var matkulSel = document.getElementById('scheduleMatkulId');
  if (matkulSel && s.mata_kuliah_id) {
    matkulSel.value = s.mata_kuliah_id;
  }

  // Saat edit, sesi tidak bisa diubah — sembunyikan
  var sesiGroup = document.getElementById('sesiGroup');
  if (sesiGroup) sesiGroup.style.display = 'none';

  document.getElementById('scheduleModal').style.display = 'flex';
}

function closeScheduleModal() {
  document.getElementById('scheduleModal').style.display = 'none';
  document.getElementById('scheduleForm').reset();
  document.getElementById('scheduleId').value = '';
  var sesiGroup = document.getElementById('sesiGroup');
  if (sesiGroup) sesiGroup.style.display = 'block';
}

// ── SAVE (tambah & edit) ──────────────────────────────────────────────────────
async function saveSchedule() {
  var id         = document.getElementById('scheduleId').value;
  var lecturerId = document.getElementById('scheduleLecturer').value;
  var dayOfWeek  = document.getElementById('scheduleDay').value;
  var semester   = document.getElementById('scheduleSemester').value;
  var matkul     = document.getElementById('scheduleMatkul').value.trim();
  var matkulId   = document.getElementById('scheduleMatkulId')?.value || null;
  var notes      = document.getElementById('scheduleNotes').value.trim();

  if (!dayOfWeek)  { showToast('Pilih hari terlebih dahulu', 'error'); return; }
  if (!semester)   { showToast('Pilih semester terlebih dahulu', 'error'); return; }

  try {
    showLoading();

    if (id) {
      // ── MODE EDIT ──
      var updatePayload = {
        lecturer_id:    lecturerId || null,
        day_of_week:    dayOfWeek,
        semester:       semester,
        mata_kuliah:    matkul || null,
        mata_kuliah_id: matkulId || null,
        notes:          notes || null
      };
      const { error } = await _sb.from('schedules').update(updatePayload).eq('id', id);
      if (error) {
        if (error.code === '23505') showToast('Jadwal sudah ada untuk kombinasi tersebut', 'warning');
        else throw error;
      } else {
        showToast('Jadwal berhasil diperbarui', 'success');
      }

    } else {
      // ── MODE TAMBAH ──
      var checked = document.querySelectorAll('input[name="sessionSlot"]:checked');
      var slots   = Array.prototype.map.call(checked, function(cb) { return parseInt(cb.value); });
      if (slots.length === 0) { showToast('Pilih minimal satu sesi jam', 'error'); hideLoading(); return; }

      var rows = slots.map(function(slot) {
        return {
          lecturer_id:    lecturerId || null,
          day_of_week:    dayOfWeek,
          session_slot:   slot,
          semester:       semester,
          mata_kuliah:    matkul || null,
          mata_kuliah_id: matkulId || null,
          status:         'pending',
          notes:          notes || null
        };
      });
      const { error } = await _sb.from('schedules').insert(rows);
      if (error) {
        if (error.code === '23505') showToast('Jadwal sudah ada untuk kombinasi tersebut', 'warning');
        else throw error;
      } else {
        showToast(slots.length + ' jadwal berhasil ditambahkan', 'success');
      }
    }

    closeScheduleModal();
    loadSchedules();
  } catch(err) {
    console.error('saveSchedule error:', err);
    showToast(err.message || 'Gagal menyimpan jadwal', 'error');
  } finally { hideLoading(); }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
async function deleteSchedule(id) {
  if (!confirm('Hapus jadwal ini?')) return;
  try {
    showLoading();
    const { error } = await _sb.from('schedules')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
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
