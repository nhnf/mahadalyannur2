/**
 * Penjadwalan Lanjutan (Schedule Management) Module
 * Mengelola slot jadwal, konflik, cetak, dan finalisasi
 * Tables: schedule_slots, schedules
 * RPCs: check_schedule_conflict, finalize_generation_batch, lock_schedule
 */

var smSlotsData = [];
var smFilterData = { classrooms: [], timeSlots: [], days: [] };

function initScheduleManagementModule() {
  var loadBtn = document.getElementById('smLoadBtn');
  var conflictBtn = document.getElementById('smCheckConflictBtn');
  var finalizeBtn = document.getElementById('smFinalizeBtn');
  var lockBtn = document.getElementById('smLockBtn');
  var printBtn = document.getElementById('smPrintBtn');

  if (loadBtn) loadBtn.addEventListener('click', loadScheduleSlots);
  if (conflictBtn) conflictBtn.addEventListener('click', checkScheduleConflicts);
  if (finalizeBtn) finalizeBtn.addEventListener('click', finalizeSchedule);
  if (lockBtn) lockBtn.addEventListener('click', lockSchedule);
  if (printBtn) printBtn.addEventListener('click', printSchedule);

  // Cascade filters
  var aySelect = document.getElementById('smAcademicYearSelect');
  if (aySelect) {
    aySelect.addEventListener('change', async function () {
      var ayId = this.value;
      if (ayId) {
        await SimkurmaHelpers.fetchClassrooms(ayId);
        SimkurmaHelpers.populateClassroomDropdown('smClassroomFilter', SimkurmaCache.classrooms, 'Semua Kelas');
      } else {
        SimkurmaHelpers.populateClassroomDropdown('smClassroomFilter', []);
      }
    });
  }
}

async function populateSmAcademicYears() {
  await SimkurmaHelpers.fetchAcademicYears();
  SimkurmaHelpers.populateAcademicYearDropdown('smAcademicYearSelect', SimkurmaCache.academicYears);
  SimkurmaHelpers.populateDayDropdown('smDayFilter', SimkurmaCache.days, 'Semua Hari');
  SimkurmaHelpers.populateTimeSlotDropdown('smTimeSlotFilter', SimkurmaCache.timeSlots, 'Semua Jam');
}

async function loadScheduleSlots() {
  var ayId = document.getElementById('smAcademicYearSelect').value;
  var classroomId = document.getElementById('smClassroomFilter').value;
  var dayId = document.getElementById('smDayFilter').value;
  var tsId = document.getElementById('smTimeSlotFilter').value;

  if (!ayId) {
    showToast('Pilih tahun akademik terlebih dahulu', 'warning');
    return;
  }

  showLoading();
  try {
    var query = _sb
      .from('schedule_slots')
      .select('*, schedules:schedule_id (id, status, academic_year_id, generated_by_system), courses:course_id (id, code, name), lecturers:lecturer_id (id, name), classrooms:classroom_id (id, name), time_slots:time_slot_id (id, code, start_time, end_time), days:day_id (id, name)')
      .eq('schedules.academic_year_id', ayId)
      .is('deleted_at', null);

    if (classroomId) query = query.eq('classroom_id', classroomId);
    if (dayId) query = query.eq('day_id', dayId);
    if (tsId) query = query.eq('time_slot_id', tsId);

    var { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;

    smSlotsData = data || [];
    renderScheduleSlotsTable();
    updateSmSummary();
  } catch (err) {
    console.error('Load schedule slots error:', err);
    showToast('Gagal memuat data jadwal: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderScheduleSlotsTable() {
  var tbody = document.getElementById('smTableBody');
  if (!tbody) return;

  if (!smSlotsData.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:var(--space-8);">' +
      '<div class="empty-state"><div class="empty-state-title">Belum Ada Slot Jadwal</div>' +
      '<div class="empty-state-description">Jalankan Generate Jadwal terlebih dahulu untuk membuat slot</div></div></td></tr>';
    return;
  }

  var statusBadge = { locked: 'badge-danger', draft: 'badge-neutral', conflict: 'badge-warning', manual_edit: 'badge-primary' };

  tbody.innerHTML = smSlotsData.map(function (item) {
    var course = item.courses || {};
    var lec = item.lecturers || {};
    var cls = item.classrooms || {};
    var ts = item.time_slots || {};
    var day = item.days || {};
    var sched = item.schedules || {};
    var st = item.status || 'draft';
    var slotLabel = ts.start_time ? ts.start_time + ' - ' + ts.end_time : (ts.code || '—');

    return '<tr>' +
      '<td>' + escapeHtml(day.name || '—') + '</td>' +
      '<td>' + escapeHtml(slotLabel) + '</td>' +
      '<td>' + escapeHtml(cls.name || '—') + '</td>' +
      '<td><strong>' + escapeHtml(course.code || '') + '</strong> ' + escapeHtml(course.name || '') + '</td>' +
      '<td>' + escapeHtml(lec.name || '—') + '</td>' +
      '<td>' + escapeHtml(item.class_letter || '—') + '</td>' +
      '<td><span class="badge ' + (statusBadge[st] || 'badge-neutral') + '">' + escapeHtml(st) + '</span></td>' +
      '<td>' +
        (st === 'locked' ? '<span class="text-secondary" style="font-size:0.75rem;">🔒 Terkunci</span>' :
          '<button class="btn btn-sm btn-ghost" onclick="deleteScheduleSlot(\'' + item.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>') +
      '</td>' +
    '</tr>';
  }).join('');
}

function updateSmSummary() {
  var totalSlots = smSlotsData.length;
  var conflictCount = smSlotsData.filter(function (s) { return s.status === 'conflict'; }).length;
  var lockedCount = smSlotsData.filter(function (s) { return s.status === 'locked'; }).length;

  var totalEl = document.getElementById('smTotalSlots');
  var conflictEl = document.getElementById('smConflictCount');
  var lockedEl = document.getElementById('smLockedCount');

  if (totalEl) totalEl.textContent = totalSlots;
  if (conflictEl) conflictEl.textContent = conflictCount;
  if (lockedEl) lockedEl.textContent = lockedCount;
}

async function checkScheduleConflicts() {
  var ayId = document.getElementById('smAcademicYearSelect').value;
  if (!ayId) {
    showToast('Pilih tahun akademik terlebih dahulu', 'warning');
    return;
  }

  showLoading();
  try {
    // Find all schedules for this AY
    var { data: schedules, error: sErr } = await _sb
      .from('schedules')
      .select('id')
      .eq('academic_year_id', ayId)
      .is('deleted_at', null);

    if (sErr) throw sErr;
    if (!schedules || !schedules.length) {
      showToast('Tidak ada jadwal ditemukan', 'info');
      return;
    }

    var scheduleId = schedules[0].id;

    var { data: conflicts, error } = await _sb.rpc('check_schedule_conflict', { p_schedule_id: scheduleId });
    if (error) throw error;

    if (!conflicts || !conflicts.length) {
      showToast('✅ Tidak ditemukan konflik jadwal!', 'success');
    } else {
      showToast('⚠️ Ditemukan ' + conflicts.length + ' konflik jadwal!', 'warning');
      // Display conflicts in a simple list
      var conflictHtml = conflicts.map(function (c) {
        return '<div style="padding:var(--space-2);background:var(--warning-light);border-radius:var(--radius-md);margin-bottom:var(--space-1);font-size:0.85rem;">' +
          '<strong>' + escapeHtml(c.conflict_type || 'Konflik') + ':</strong> ' + escapeHtml(c.description || JSON.stringify(c)) +
          '</div>';
      }).join('');
      var container = document.getElementById('smConflictList');
      if (container) {
        container.innerHTML = conflictHtml;
        container.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Check conflicts error:', err);
    showToast('Gagal cek konflik: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function finalizeSchedule() {
  var ayId = document.getElementById('smAcademicYearSelect').value;
  if (!ayId) return;

  if (!confirm('Finalisasi akan mengunci slot yang valid. Lanjutkan?')) return;

  showLoading();
  try {
    var { data: schedules } = await _sb.from('schedules').select('id').eq('academic_year_id', ayId).is('deleted_at', null);
    if (!schedules || !schedules.length) throw new Error('Tidak ada jadwal ditemukan');

    var scheduleId = schedules[0].id;
    var { data, error } = await _sb.rpc('finalize_generation_batch', { p_schedule_id: scheduleId, p_batch_size: 50 });
    if (error) throw error;

    showToast('✅ Finalisasi batch berhasil: ' + (data || 0) + ' slot diproses', 'success');
    await loadScheduleSlots();
  } catch (err) {
    console.error('Finalize error:', err);
    showToast('Gagal finalisasi: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function lockSchedule() {
  var ayId = document.getElementById('smAcademicYearSelect').value;
  if (!ayId) return;

  if (!confirm('⚠️ Mengunci jadwal akan mencegah perubahan. Lanjutkan?')) return;

  showLoading();
  try {
    var { data: schedules } = await _sb.from('schedules').select('id').eq('academic_year_id', ayId).is('deleted_at', null);
    if (!schedules || !schedules.length) throw new Error('Tidak ada jadwal ditemukan');

    var scheduleId = schedules[0].id;
    var { error } = await _sb.rpc('lock_schedule', { p_schedule_id: scheduleId });
    if (error) throw error;

    showToast('🔒 Jadwal berhasil dikunci', 'success');
    await loadScheduleSlots();
  } catch (err) {
    console.error('Lock error:', err);
    showToast('Gagal mengunci: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function printSchedule() {
  var table = document.getElementById('smTable');
  if (!table) return;

  var printWindow = window.open('', '_blank');
  printWindow.document.write('<html><head><title>Cetak Jadwal</title>');
  printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px;} th{background:#f5f5f5;font-weight:bold;} h2{margin-bottom:4px;} .info{color:#666;font-size:13px;margin-bottom:16px;}</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write('<h2>Jadwal Kuliah — Simkurma</h2>');
  printWindow.document.write('<div class="info">Dicetak: ' + new Date().toLocaleString('id-ID') + '</div>');
  printWindow.document.write(table.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
}

async function deleteScheduleSlot(id) {
  if (!confirm('Yakin ingin menghapus slot jadwal ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('schedule_slots').delete().eq('id', id);
    if (error) throw error;
    showToast('Slot jadwal berhasil dihapus', 'success');
    await loadScheduleSlots();
  } catch (err) {
    console.error('Delete schedule slot error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
