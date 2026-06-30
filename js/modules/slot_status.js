/**
 * Slot Status Module
 * Mengelola status slot (tersedia, diblokir, terisi) untuk setiap kelas
 * Tabel: slot_status (classroom_id, day_id, time_slot_id, status, notes)
 */

var slotStatusData = [];
var ssSelectedClassroomId = null;

function initSlotStatusModule() {
  var aySelect = document.getElementById('ssAcademicYearSelect');
  var classSelect = document.getElementById('ssClassroomSelect');
  var saveBtn = document.getElementById('saveSlotStatusBtn');
  var resetBtn = document.getElementById('resetSlotStatusBtn');

  if (aySelect) aySelect.addEventListener('change', onSsAcademicYearChange);
  if (classSelect) classSelect.addEventListener('change', onSsClassroomChange);
  if (saveBtn) saveBtn.addEventListener('click', saveSlotStatus);
  if (resetBtn) resetBtn.addEventListener('click', function () { loadSlotStatusGrid(); });
}

async function populateSsAcademicYears() {
  var sel = document.getElementById('ssAcademicYearSelect');
  if (!sel) return;
  await SimkurmaHelpers.fetchAcademicYears();
  sel.innerHTML = '<option value="">Pilih Tahun Akademik</option>';
  SimkurmaCache.academicYears.forEach(function (ay) {
    var opt = document.createElement('option');
    opt.value = ay.id;
    opt.textContent = ay.name + (ay.is_active ? ' (Aktif)' : '');
    if (ay.is_active) opt.selected = true;
    sel.appendChild(opt);
  });
  if (sel.value) onSsAcademicYearChange();
}

async function onSsAcademicYearChange() {
  var ayId = document.getElementById('ssAcademicYearSelect').value || null;
  await SimkurmaHelpers.fetchClassrooms(ayId);
  var sel = document.getElementById('ssClassroomSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Kelas</option>';
  SimkurmaCache.classrooms.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name + (c.parallel ? ' ' + c.parallel : '') + ' (Sem ' + c.semester_number + ')';
    sel.appendChild(opt);
  });
  ssSelectedClassroomId = null;
  var grid = document.getElementById('slotStatusGrid');
  if (grid) grid.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:var(--space-8);">Pilih kelas untuk mengelola slot</p>';
}

async function onSsClassroomChange() {
  ssSelectedClassroomId = document.getElementById('ssClassroomSelect').value || null;
  if (!ssSelectedClassroomId) {
    document.getElementById('slotStatusGrid').innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:var(--space-8);">Pilih kelas untuk mengelola slot</p>';
    return;
  }
  await loadSlotStatusGrid();
}

async function loadSlotStatusGrid() {
  if (!ssSelectedClassroomId) return;
  showLoading();
  try {
    await SimkurmaHelpers.fetchDays();
    await SimkurmaHelpers.fetchTimeSlots();
    var { data, error } = await _sb
      .from('slot_status')
      .select('*')
      .eq('classroom_id', ssSelectedClassroomId);
    if (error) throw error;
    slotStatusData = data || [];
    renderSlotStatusGrid();
  } catch (err) {
    console.error('Load slot status error:', err);
    showToast('Gagal memuat slot status: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderSlotStatusGrid() {
  var container = document.getElementById('slotStatusGrid');
  if (!container) return;
  var days = SimkurmaCache.days || [];
  var slots = SimkurmaCache.timeSlots || [];
  if (!days.length || !slots.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:var(--space-8);">Data hari atau slot waktu belum tersedia</p>';
    return;
  }

  // Build lookup
  var lookup = {};
  slotStatusData.forEach(function (s) {
    lookup[s.day_id + '-' + s.time_slot_id] = s;
  });

  var blockedSlots = { '4-4': true, '5-1': true, '5-2': true, '5-4': true };

  var headerRow = '<th class="text-center" style="min-width:70px;font-size:0.75rem;">Sesi</th>';
  days.forEach(function (d) {
    headerRow += '<th class="text-center" style="min-width:60px;font-size:0.75rem;">' + escapeHtml(d.name) + '</th>';
  });

  var bodyRows = slots.map(function (slot) {
    var row = '<td class="text-center" style="font-size:0.7rem;white-space:nowrap;font-weight:600;">' +
      escapeHtml(slot.session_name) + '<br>' +
      '<span style="font-weight:400;color:var(--gray-400);font-size:0.65rem;">' + escapeHtml(slot.start_time) + '-' + escapeHtml(slot.end_time) + '</span>' +
    '</td>';

    days.forEach(function (day) {
      var key = day.id + '-' + slot.id;
      var lookupKey = day.sort_order + '-' + slot.sort_order;
      var isBlocked = blockedSlots[lookupKey];
      var entry = lookup[key];
      var status = entry ? entry.status : 'tersedia';

      var cellStyle = 'font-size:0.7rem;cursor:pointer;text-align:center;padding:var(--space-2);min-width:60px;transition:all 0.15s;';

      if (isBlocked) {
        row += '<td style="' + cellStyle + 'background:var(--danger-bg);color:var(--danger);font-weight:600;">BLOKIR</td>';
      } else {
        var display = status === 'tersedia' ? '✓ Tersedia' : status === 'diblokir' ? '✗ Blokir' : '● Terisi';
        var bg = status === 'tersedia' ? 'var(--success-bg)' : status === 'diblokir' ? 'var(--gray-800)' : 'var(--warning-bg)';
        var color = status === 'tersedia' ? 'var(--success)' : status === 'diblokir' ? 'var(--gray-500)' : 'var(--warning)';
        row += '<td class="ss-cell" data-day-id="' + day.id + '" data-slot-id="' + slot.id + '" data-status="' + status + '" ' +
          'data-entry-id="' + (entry ? entry.id : '') + '" ' +
          'style="' + cellStyle + 'background:' + bg + ';color:' + color + ';">' + display + '</td>';
      }
    });

    return '<tr>' + row + '</tr>';
  }).join('');

  container.innerHTML =
    '<div style="margin-bottom:var(--space-3);font-size:var(--text-sm);color:var(--gray-400);">Klik sel untuk mengubah status: Tersedia → Diblokir → Tersedia. Slot terisi hanya ditampilkan.</div>' +
    '<div style="overflow-x:auto;">' +
    '<table class="data-table" id="ssGridTable" style="font-size:0.75rem;">' +
      '<thead><tr>' + headerRow + '</tr></thead>' +
      '<tbody>' + bodyRows + '</tbody>' +
    '</table>' +
    '</div>';

  document.querySelectorAll('.ss-cell').forEach(function (cell) {
    cell.addEventListener('click', function () {
      var current = this.dataset.status;
      if (current === 'terisi') return; // Can't change filled slots
      var next = current === 'tersedia' ? 'diblokir' : 'tersedia';
      this.dataset.status = next;
      var display = next === 'tersedia' ? '✓ Tersedia' : '✗ Blokir';
      var bg = next === 'tersedia' ? 'var(--success-bg)' : 'var(--gray-800)';
      var color = next === 'tersedia' ? 'var(--success)' : 'var(--gray-500)';
      this.style.background = bg;
      this.style.color = color;
      this.textContent = display;
    });
  });
}

async function saveSlotStatus() {
  if (!ssSelectedClassroomId) {
    showToast('Pilih kelas terlebih dahulu', 'warning');
    return;
  }
  var cells = document.querySelectorAll('.ss-cell');
  if (!cells.length) {
    showToast('Tidak ada data untuk disimpan', 'warning');
    return;
  }
  showLoading();
  try {
    var upserts = [];
    cells.forEach(function (cell) {
      upserts.push({
        id: cell.dataset.entryId || undefined,
        classroom_id: ssSelectedClassroomId,
        day_id: cell.dataset.dayId,
        time_slot_id: cell.dataset.slotId,
        status: cell.dataset.status,
        notes: null
      });
    });
    var { error } = await _sb
      .from('slot_status')
      .upsert(upserts, { onConflict: 'classroom_id,day_id,time_slot_id' });
    if (error) throw error;
    showToast('Status slot berhasil disimpan', 'success');
    await loadSlotStatusGrid();
  } catch (err) {
    console.error('Save slot status error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
