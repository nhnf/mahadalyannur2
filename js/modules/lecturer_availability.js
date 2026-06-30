/**
 * Ketersediaan Dosen Module
 * Mengelola ketersediaan dosen per slot waktu (lecturer_availability)
 * Fitur: Grid interaktif dosen × slot, toggle availability
 */

var availabilityData = [];
var avSelectedLecturerId = null;

function initAvailabilityModule() {
  var lecturerSelect = document.getElementById('avLecturerSelect');
  var saveBtn = document.getElementById('saveAvailabilityBtn');
  var resetBtn = document.getElementById('resetAvailabilityBtn');

  if (lecturerSelect) lecturerSelect.addEventListener('change', onAvLecturerChange);
  if (saveBtn) saveBtn.addEventListener('click', saveAvailability);
  if (resetBtn) resetBtn.addEventListener('click', function () { loadAvailabilityGrid(); });
}

async function populateAvLecturers() {
  var sel = document.getElementById('avLecturerSelect');
  if (!sel) return;
  await SimkurmaHelpers.fetchLecturers();
  sel.innerHTML = '<option value="">Pilih Dosen</option>';
  SimkurmaCache.lecturers.forEach(function (l) {
    var opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.name + ' (' + (l.nidn || '—') + ')';
    sel.appendChild(opt);
  });
}

async function onAvLecturerChange() {
  avSelectedLecturerId = document.getElementById('avLecturerSelect').value || null;
  if (!avSelectedLecturerId) {
    document.getElementById('availabilityGrid').innerHTML =
      '<p style="text-align:center;color:var(--gray-400);padding:var(--space-8);">Pilih dosen untuk mengelola ketersediaan</p>';
    return;
  }
  await loadAvailabilityGrid();
}

async function loadAvailabilityGrid() {
  if (!avSelectedLecturerId) return;

  showLoading();
  try {
    // Fetch days and time slots
    await SimkurmaHelpers.fetchDays();
    await SimkurmaHelpers.fetchTimeSlots();

    // Fetch existing availability for this lecturer
    var { data, error } = await _sb
      .from('lecturer_availability')
      .select('*')
      .eq('lecturer_id', avSelectedLecturerId);
    if (error) throw error;
    availabilityData = data || [];

    renderAvailabilityGrid();
  } catch (err) {
    console.error('Load availability error:', err);
    showToast('Gagal memuat ketersediaan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderAvailabilityGrid() {
  var container = document.getElementById('availabilityGrid');
  if (!container) return;

  var days = SimkurmaCache.days || [];
  var slots = SimkurmaCache.timeSlots || [];
  if (!days.length || !slots.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:var(--space-8);">Data hari atau slot waktu belum tersedia</p>';
    return;
  }

  // Build availability lookup: day_id-slot_id -> { available, id }
  var lookup = {};
  availabilityData.forEach(function (a) {
    lookup[a.day_id + '-' + a.time_slot_id] = { available: a.is_available, id: a.id };
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
      var isAvailable = entry ? entry.available : true;

      var cellStyle = 'font-size:0.7rem;cursor:pointer;text-align:center;padding:var(--space-2);min-width:60px;transition:all 0.15s;';

      if (isBlocked) {
        row += '<td style="' + cellStyle + 'background:var(--danger-bg);color:var(--danger);font-weight:600;">BLOKIR</td>';
      } else if (isAvailable) {
        row += '<td class="av-cell av-available" data-day-id="' + day.id + '" data-slot-id="' + slot.id + '" data-available="true" style="' + cellStyle + 'background:var(--success-bg);color:var(--success);">✓ Tersedia</td>';
      } else {
        row += '<td class="av-cell av-unavailable" data-day-id="' + day.id + '" data-slot-id="' + slot.id + '" data-available="false" style="' + cellStyle + 'background:var(--gray-800);color:var(--gray-500);">✗ Sibuk</td>';
      }
    });

    return '<tr>' + row + '</tr>';
  }).join('');

  container.innerHTML =
    '<div style="margin-bottom:var(--space-3);font-size:var(--text-sm);color:var(--gray-400);">Klik sel untuk mengubah ketersediaan. Slot yang diblokir (Kamis Malam, Jumat) tidak bisa diubah.</div>' +
    '<div style="overflow-x:auto;">' +
    '<table class="data-table" id="avGridTable" style="font-size:0.75rem;">' +
      '<thead><tr>' + headerRow + '</tr></thead>' +
      '<tbody>' + bodyRows + '</tbody>' +
    '</table>' +
    '</div>';

  // Attach click handlers
  document.querySelectorAll('.av-cell').forEach(function (cell) {
    cell.addEventListener('click', function () {
      var current = this.dataset.available === 'true';
      this.dataset.available = current ? 'false' : 'true';
      if (current) {
        this.className = 'av-cell av-unavailable';
        this.style.background = 'var(--gray-800)';
        this.style.color = 'var(--gray-500)';
        this.textContent = '✗ Sibuk';
      } else {
        this.className = 'av-cell av-available';
        this.style.background = 'var(--success-bg)';
        this.style.color = 'var(--success)';
        this.textContent = '✓ Tersedia';
      }
    });
  });
}

async function saveAvailability() {
  if (!avSelectedLecturerId) {
    showToast('Pilih dosen terlebih dahulu', 'warning');
    return;
  }

  var cells = document.querySelectorAll('.av-cell');
  if (!cells.length) {
    showToast('Tidak ada data untuk disimpan', 'warning');
    return;
  }

  showLoading();
  try {
    // Collect all cell states
    var upserts = [];
    cells.forEach(function (cell) {
      var dayId = cell.dataset.dayId;
      var slotId = cell.dataset.slotId;
      var isAvailable = cell.dataset.available === 'true';
      var existing = availabilityData.find(function (a) {
        return a.day_id === dayId && a.time_slot_id === slotId;
      });

      upserts.push({
        id: existing ? existing.id : undefined,
        lecturer_id: avSelectedLecturerId,
        day_id: dayId,
        time_slot_id: slotId,
        is_available: isAvailable
      });
    });

    // Upsert in batches
    var { error } = await _sb
      .from('lecturer_availability')
      .upsert(upserts, { onConflict: 'lecturer_id,day_id,time_slot_id' });
    if (error) throw error;

    showToast('Ketersediaan dosen berhasil disimpan', 'success');
    await loadAvailabilityGrid();
  } catch (err) {
    console.error('Save availability error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
