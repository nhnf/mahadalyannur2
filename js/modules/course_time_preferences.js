/**
 * Prioritas Waktu Mata Kuliah Module
 * Mengatur prioritas waktu per mata kuliah (required/preferred/alternative)
 * Tabel: course_time_preferences
 */

var ctpData = [];
var editingCtpId = null;

function initCourseTimePrefModule() {
  var loadBtn = document.getElementById('ctpLoadBtn');
  var addBtn = document.getElementById('addCtpBtn');
  var saveBtn = document.getElementById('saveCtpBtn');
  var cancelBtn = document.getElementById('cancelCtpBtn');
  var closeBtn = document.getElementById('closeCtpModal');

  if (loadBtn) loadBtn.addEventListener('click', loadCourseTimePrefs);
  if (addBtn) addBtn.addEventListener('click', function () { openCtpModal(); });
  if (saveBtn) saveBtn.addEventListener('click', saveCourseTimePref);
  if (cancelBtn) cancelBtn.addEventListener('click', closeCtpModal);
  if (closeBtn) closeBtn.addEventListener('click', closeCtpModal);

  var modal = document.getElementById('ctpModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeCtpModal(); });

  // Cascade: academic year -> classrooms
  var aySelect = document.getElementById('ctpAcademicYearSelect');
  if (aySelect) {
    aySelect.addEventListener('change', async function () {
      var ayId = this.value;
      if (ayId) {
        await SimkurmaHelpers.fetchClassrooms(ayId);
        SimkurmaHelpers.populateClassroomDropdown('ctpClassroomSelect', SimkurmaCache.classrooms);
      } else {
        SimkurmaHelpers.populateClassroomDropdown('ctpClassroomSelect', []);
      }
    });
  }
}

async function populateCtpAcademicYears() {
  await SimkurmaHelpers.fetchAcademicYears();
  SimkurmaHelpers.populateAcademicYearDropdown('ctpAcademicYearSelect', SimkurmaCache.academicYears);
}

async function loadCourseTimePrefs() {
  var ayId = document.getElementById('ctpAcademicYearSelect').value;
  if (!ayId) {
    showToast('Pilih tahun akademik terlebih dahulu', 'warning');
    return;
  }

  showLoading();
  try {
    var query = _sb
      .from('course_time_preferences')
      .select('*, courses:course_id (id, code, name), time_slots:time_slot_id (id, code, start_time, end_time, session_number), days:day_id (id, name)')
      .eq('academic_year_id', ayId)
      .is('deleted_at', null)
      .order('preference_weight', { ascending: false });

    var { data, error } = await query;
    if (error) throw error;
    ctpData = data || [];
    renderCtpTable();
  } catch (err) {
    console.error('Load course time preferences error:', err);
    showToast('Gagal memuat data: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderCtpTable() {
  var tbody = document.getElementById('ctpTableBody');
  if (!tbody) return;

  if (!ctpData.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);">' +
      '<div class="empty-state"><div class="empty-state-title">Belum Ada Data</div>' +
      '<div class="empty-state-description">Tambahkan prioritas waktu mata kuliah atau pilih filter yang berbeda</div></div></td></tr>';
    return;
  }

  var ruleTypeLabels = { required: 'Wajib', preferred: 'Utama', alternative: 'Alternatif' };
  var ruleTypeBadge = { required: 'badge-danger', preferred: 'badge-success', alternative: 'badge-neutral' };

  tbody.innerHTML = ctpData.map(function (item) {
    var course = item.courses || {};
    var ts = item.time_slots || {};
    var day = item.days || {};
    var ruleLabel = ruleTypeLabels[item.rule_type] || item.rule_type;
    var ruleBadge = ruleTypeBadge[item.rule_type] || 'badge-neutral';
    var slotLabel = (ts.code || ts.start_time || '—');
    if (ts.start_time) slotLabel = ts.start_time + ' - ' + ts.end_time;

    return '<tr>' +
      '<td><strong>' + escapeHtml(course.code || '') + '</strong> ' + escapeHtml(course.name || '') + '</td>' +
      '<td>' + escapeHtml(day.name || '—') + '</td>' +
      '<td>' + escapeHtml(slotLabel) + '</td>' +
      '<td><span class="badge ' + ruleBadge + '">' + escapeHtml(ruleLabel) + '</span></td>' +
      '<td style="text-align:center;">' + (item.preference_weight || 0) + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="openCtpModalById(\'' + item.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="deleteCourseTimePref(\'' + item.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function openCtpModalById(id) {
  var data = ctpData.find(function (item) { return item.id === id; });
  openCtpModal(data);
}

function openCtpModal(data) {
  editingCtpId = data ? data.id : null;
  var modal = document.getElementById('ctpModal');
  var title = document.getElementById('ctpModalTitle');

  if (title) title.textContent = data ? 'Edit Prioritas Waktu' : 'Tambah Prioritas Waktu';

  // Populate dropdowns
  var ayId = document.getElementById('ctpAcademicYearSelect').value;
  SimkurmaHelpers.populateCourseDropdown('ctp_course_id', SimkurmaCache.courses);
  SimkurmaHelpers.populateDayDropdown('ctp_day_id', SimkurmaCache.days);
  SimkurmaHelpers.populateTimeSlotDropdown('ctp_time_slot_id', SimkurmaCache.timeSlots);

  // Set values if editing
  if (data) {
    var courseSel = document.getElementById('ctp_course_id');
    var daySel = document.getElementById('ctp_day_id');
    var tsSel = document.getElementById('ctp_time_slot_id');
    var ruleSel = document.getElementById('ctp_rule_type');
    var weightIn = document.getElementById('ctp_preference_weight');

    if (courseSel) courseSel.value = data.course_id || '';
    if (daySel) daySel.value = data.day_id || '';
    if (tsSel) tsSel.value = data.time_slot_id || '';
    if (ruleSel) ruleSel.value = data.rule_type || 'preferred';
    if (weightIn) weightIn.value = data.preference_weight || 50;
  } else {
    var ruleSel2 = document.getElementById('ctp_rule_type');
    var weightIn2 = document.getElementById('ctp_preference_weight');
    if (ruleSel2) ruleSel2.value = 'preferred';
    if (weightIn2) weightIn2.value = '50';
  }

  if (modal) modal.style.display = 'flex';
}

function closeCtpModal() {
  var modal = document.getElementById('ctpModal');
  if (modal) modal.style.display = 'none';
  editingCtpId = null;
}

async function saveCourseTimePref() {
  var ayId = document.getElementById('ctpAcademicYearSelect').value;
  var courseId = document.getElementById('ctp_course_id').value;
  var dayId = document.getElementById('ctp_day_id').value;
  var tsId = document.getElementById('ctp_time_slot_id').value;
  var ruleType = document.getElementById('ctp_rule_type').value;
  var weight = parseInt(document.getElementById('ctp_preference_weight').value) || 50;

  if (!courseId || !dayId || !tsId) {
    showToast('Lengkapi semua field yang wajib', 'warning');
    return;
  }

  showLoading();
  try {
    var payload = {
      academic_year_id: ayId,
      course_id: courseId,
      day_id: dayId,
      time_slot_id: tsId,
      rule_type: ruleType,
      preference_weight: weight
    };

    if (editingCtpId) {
      var { error } = await _sb.from('course_time_preferences').update(payload).eq('id', editingCtpId);
      if (error) throw error;
      showToast('Prioritas waktu berhasil diperbarui', 'success');
    } else {
      var { error } = await _sb.from('course_time_preferences').insert(payload);
      if (error) throw error;
      showToast('Prioritas waktu berhasil ditambahkan', 'success');
    }
    closeCtpModal();
    await loadCourseTimePrefs();
  } catch (err) {
    console.error('Save course time preference error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function deleteCourseTimePref(id) {
  if (!confirm('Yakin ingin menghapus prioritas waktu ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('course_time_preferences').delete().eq('id', id);
    if (error) throw error;
    showToast('Prioritas waktu berhasil dihapus', 'success');
    await loadCourseTimePrefs();
  } catch (err) {
    console.error('Delete course time preference error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
