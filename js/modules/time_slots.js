/**
 * Hari & Slot Waktu Module
 * CRUD untuk tabel time_slots dengan visual grid
 */

var timeSlotsData = [];
var editingTimeSlotId = null;

function initTimeSlotsModule() {
  var addBtn = document.getElementById('addTsBtn');
  if (addBtn) addBtn.addEventListener('click', function () { openTimeSlotModal(); });
  
  var closeBtn = document.getElementById('closeTsModal');
  if (closeBtn) closeBtn.addEventListener('click', closeTimeSlotModal);
  
  var cancelBtn = document.getElementById('cancelTsBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeTimeSlotModal);
  
  var saveBtn = document.getElementById('saveTsBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveTimeSlot);
  
  var modal = document.getElementById('tsModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeTimeSlotModal(); });
}

function openTimeSlotModalById(id) {
  var data = timeSlotsData.find(function (t) { return t.id === id; });
  openTimeSlotModal(data);
}

function openTimeSlotModal(data) {
  editingTimeSlotId = data ? data.id : null;
  document.getElementById('tsModalTitle').textContent = data ? 'Edit Jam Pelajaran' : 'Tambah Jam Pelajaran';
  document.getElementById('tsSessionName').value = data ? (data.code || '') : '';
  document.getElementById('tsStartTime').value = data ? (data.start_time || '') : '';
  document.getElementById('tsEndTime').value = data ? (data.end_time || '') : '';
  document.getElementById('tsModal').style.display = 'flex';
}

function closeTimeSlotModal() {
  document.getElementById('tsModal').style.display = 'none';
  editingTimeSlotId = null;
}

async function saveTimeSlot() {
  var sessionName = document.getElementById('tsSessionName').value.trim();
  var startTime = document.getElementById('tsStartTime').value;
  var endTime = document.getElementById('tsEndTime').value;

  if (!sessionName || !startTime || !endTime) {
    showToast('Semua field wajib diisi', 'warning');
    return;
  }

  showLoading();
  try {
    var payload = {
      code: sessionName,
      start_time: startTime,
      end_time: endTime,
      is_active: true,
      is_break: false
    };

    if (editingTimeSlotId) {
      var { error } = await _sb.from('time_slots').update(payload).eq('id', editingTimeSlotId);
      if (error) throw error;
      showToast('Slot waktu berhasil diperbarui', 'success');
    } else {
      // Hitung session_number berdasarkan jumlah slot yang ada + 1
      var nextNum = timeSlotsData.length + 1;
      payload.session_number = nextNum;
      
      var { error } = await _sb.from('time_slots').insert(payload);
      if (error) throw error;
      showToast('Slot waktu berhasil ditambahkan', 'success');
    }
    closeTimeSlotModal();
    await loadTimeSlots();
  } catch (err) {
    console.error('Save time slot error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function deleteTimeSlot(id) {
  if (!confirm('Yakin ingin menghapus slot waktu ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('time_slots').delete().eq('id', id);
    if (error) throw error;
    showToast('Slot waktu berhasil dihapus', 'success');
    await loadTimeSlots();
  } catch (err) {
    console.error('Delete time slot error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function loadTimeSlots() {
  try {
    var { data, error } = await _sb
      .from('time_slots')
      .select('*')
      .order('session_number', { ascending: true });
    if (error) throw error;
    timeSlotsData = data || [];
    SimkurmaCache.timeSlots = timeSlotsData;
    renderTimeSlotsTable();
    renderTimeSlotGridPreview();
  } catch (err) {
    console.error('Load time slots error:', err);
    document.getElementById('tsTableBody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--danger);">Gagal memuat data</td></tr>';
  }
}

function renderTimeSlotsTable() {
  var tbody = document.getElementById('tsTableBody');
  if (!tbody) return;
  if (!timeSlotsData.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);">Belum ada data slot waktu</td></tr>';
    return;
  }

  tbody.innerHTML = timeSlotsData.map(function (t) {
    var statusBadge = t.is_active
      ? '<span class="badge badge-success">Aktif</span>'
      : '<span class="badge badge-neutral">Nonaktif</span>';
    var timeLabel = t.start_time.substring(0, 5) + ' - ' + t.end_time.substring(0, 5);
    return '<tr>' +
      '<td><strong>' + escapeHtml(t.code) + '</strong></td>' +
      '<td>' + escapeHtml(t.start_time) + '</td>' +
      '<td>' + escapeHtml(t.end_time) + '</td>' +
      '<td style="text-align:center;">' + t.session_number + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="openTimeSlotModalById(\'' + t.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="deleteTimeSlot(\'' + t.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function renderTimeSlotGridPreview() {
  var container = document.getElementById('timeSlotGridPreview');
  if (!container) return;
  var days = [{ name: 'Senin' }, { name: 'Selasa' }, { name: 'Rabu' }, { name: 'Kamis' }, { name: 'Jumat' }, { name: 'Sabtu' }];
  if (!timeSlotsData.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:var(--space-4);">Tidak ada slot</p>';
    return;
  }
  var headerRow = '<th class="text-center" style="min-width:60px;font-size:0.75rem;">Jam</th>' +
    days.map(function (d) {
      return '<th class="text-center" style="min-width:50px;font-size:0.75rem;">' + d.name + '</th>';
    }).join('');

  var bodyRows = timeSlotsData.filter(function (t) { return t.is_active; }).map(function (t) {
    var cells = days.map(function () {
      return '<td class="text-center" style="background:var(--gray-950);color:var(--gray-500);font-size:0.7rem;">Tersedia</td>';
    }).join('');
    return '<tr>' +
      '<td class="text-center" style="font-weight:600;font-size:0.7rem;white-space:nowrap;">' + escapeHtml(t.code) + '<br><span style="font-weight:400;color:var(--gray-400);">' + escapeHtml(t.start_time) + ' - ' + escapeHtml(t.end_time) + '</span></td>' +
      cells +
    '</tr>';
  }).join('');

  container.innerHTML = '<div style="overflow-x:auto;">' +
    '<table class="data-table" style="font-size:0.75rem;">' +
      '<thead><tr>' + headerRow + '</tr></thead>' +
      '<tbody>' + bodyRows + '</tbody>' +
    '</table>' +
  '</div>';
}