/**
 * Aturan Kelas Dosen Module
 * Mengatur aturan kelas per dosen (misal: Ust. Fathur hanya Kelas A, KH. Zaki A+B)
 * Tabel: lecturer_class_rules
 */

var lcrData = [];
var editingLcrId = null;

function initLecturerClassRulesModule() {
  var loadBtn = document.getElementById('lcrLoadBtn');
  var addBtn = document.getElementById('addLcrBtn');
  var saveBtn = document.getElementById('saveLcrBtn');
  var cancelBtn = document.getElementById('cancelLcrBtn');
  var closeBtn = document.getElementById('closeLcrModal');

  if (loadBtn) loadBtn.addEventListener('click', loadLecturerClassRules);
  if (addBtn) addBtn.addEventListener('click', function () { openLcrModal(); });
  if (saveBtn) saveBtn.addEventListener('click', saveLecturerClassRule);
  if (cancelBtn) cancelBtn.addEventListener('click', closeLcrModal);
  if (closeBtn) closeBtn.addEventListener('click', closeLcrModal);

  var modal = document.getElementById('lcrModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeLcrModal(); });
}

async function populateLcrAcademicYears() {
  await SimkurmaHelpers.fetchAcademicYears();
  SimkurmaHelpers.populateAcademicYearDropdown('lcrAcademicYearSelect', SimkurmaCache.academicYears);
}

async function loadLecturerClassRules() {
  var ayId = document.getElementById('lcrAcademicYearSelect').value;
  if (!ayId) {
    showToast('Pilih tahun akademik terlebih dahulu', 'warning');
    return;
  }

  showLoading();
  try {
    var { data, error } = await _sb
      .from('lecturer_class_rules')
      .select('*, lecturers:lecturer_id (id, name, nidn), courses:course_id (id, code, name)')
      .eq('academic_year_id', ayId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    lcrData = data || [];
    renderLcrTable();
  } catch (err) {
    console.error('Load lecturer class rules error:', err);
    showToast('Gagal memuat data: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderLcrTable() {
  var tbody = document.getElementById('lcrTableBody');
  if (!tbody) return;

  if (!lcrData.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);">' +
      '<div class="empty-state"><div class="empty-state-title">Belum Ada Aturan Kelas</div>' +
      '<div class="empty-state-description">Tambahkan aturan kelas dosen seperti: Dosen X hanya mengajar Kelas A</div></div></td></tr>';
    return;
  }

  var ruleTypeLabels = { assign_kelas: 'Tetapkan Kelas', exclude_kelas: 'Kecualikan Kelas' };
  var ruleTypeBadge = { assign_kelas: 'badge-success', exclude_kelas: 'badge-danger' };

  tbody.innerHTML = lcrData.map(function (item) {
    var lec = item.lecturers || {};
    var course = item.courses || {};
    var ruleLabel = ruleTypeLabels[item.rule_type] || item.rule_type || 'assign_kelas';
    var ruleBadge = ruleTypeBadge[item.rule_type] || 'badge-neutral';
    var classes = Array.isArray(item.class_letters) ? item.class_letters.join(', ') : (item.class_letters || '—');
    var semLabel = item.semester_number ? 'Semester ' + item.semester_number : 'Semua';

    return '<tr>' +
      '<td><strong>' + escapeHtml(lec.name || '—') + '</strong>' + (lec.nidn ? ' <span class="text-secondary" style="font-size:0.75rem;">(' + escapeHtml(lec.nidn) + ')</span>' : '') + '</td>' +
      '<td>' + escapeHtml(course.code || '') + ' ' + escapeHtml(course.name || '—') + '</td>' +
      '<td style="text-align:center;">' + escapeHtml(semLabel) + '</td>' +
      '<td><span class="badge badge-primary">' + escapeHtml(classes) + '</span></td>' +
      '<td><span class="badge ' + ruleBadge + '">' + escapeHtml(ruleLabel) + '</span></td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="openLcrModalById(\'' + item.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="deleteLecturerClassRule(\'' + item.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function openLcrModalById(id) {
  var data = lcrData.find(function (item) { return item.id === id; });
  openLcrModal(data);
}

function openLcrModal(data) {
  editingLcrId = data ? data.id : null;
  var modal = document.getElementById('lcrModal');
  var title = document.getElementById('lcrModalTitle');

  if (title) title.textContent = data ? 'Edit Aturan Kelas Dosen' : 'Tambah Aturan Kelas Dosen';

  // Populate dropdowns
  SimkurmaHelpers.populateLecturerDropdown('lcr_lecturer_id', SimkurmaCache.lecturers);
  SimkurmaHelpers.populateCourseDropdown('lcr_course_id', SimkurmaCache.courses);

  if (data) {
    var lecSel = document.getElementById('lcr_lecturer_id');
    var courseSel = document.getElementById('lcr_course_id');
    var semIn = document.getElementById('lcr_semester_number');
    var ruleSel = document.getElementById('lcr_rule_type');
    var noteIn = document.getElementById('lcr_warning_note');

    if (lecSel) lecSel.value = data.lecturer_id || '';
    if (courseSel) courseSel.value = data.course_id || '';
    if (semIn) semIn.value = data.semester_number || '';
    if (ruleSel) ruleSel.value = data.rule_type || 'assign_kelas';
    if (noteIn) noteIn.value = data.warning_note || '';

    // Checkboxes for class letters
    var letters = Array.isArray(data.class_letters) ? data.class_letters : [];
    ['A', 'B', 'C', 'D', 'E'].forEach(function (cls) {
      var cb = document.getElementById('lcr_class_' + cls);
      if (cb) cb.checked = letters.indexOf(cls) >= 0;
    });
  } else {
    var ruleSel2 = document.getElementById('lcr_rule_type');
    var noteIn2 = document.getElementById('lcr_warning_note');
    var semIn2 = document.getElementById('lcr_semester_number');
    if (ruleSel2) ruleSel2.value = 'assign_kelas';
    if (noteIn2) noteIn2.value = '';
    if (semIn2) semIn2.value = '';
    ['A', 'B', 'C', 'D', 'E'].forEach(function (cls) {
      var cb = document.getElementById('lcr_class_' + cls);
      if (cb) cb.checked = false;
    });
  }

  if (modal) modal.style.display = 'flex';
}

function closeLcrModal() {
  var modal = document.getElementById('lcrModal');
  if (modal) modal.style.display = 'none';
  editingLcrId = null;
}

async function saveLecturerClassRule() {
  var ayId = document.getElementById('lcrAcademicYearSelect').value;
  var lecId = document.getElementById('lcr_lecturer_id').value;
  var courseId = document.getElementById('lcr_course_id').value;
  var semNum = document.getElementById('lcr_semester_number').value;
  var ruleType = document.getElementById('lcr_rule_type').value;
  var note = document.getElementById('lcr_warning_note').value.trim();

  // Collect checked class letters
  var letters = [];
  ['A', 'B', 'C', 'D', 'E'].forEach(function (cls) {
    var cb = document.getElementById('lcr_class_' + cls);
    if (cb && cb.checked) letters.push(cls);
  });

  if (!lecId || !courseId || !letters.length) {
    showToast('Lengkapi dosen, mata kuliah, dan minimal satu kelas', 'warning');
    return;
  }

  showLoading();
  try {
    var payload = {
      academic_year_id: ayId,
      lecturer_id: lecId,
      course_id: courseId,
      class_letters: letters,
      rule_type: ruleType,
      semester_number: semNum ? parseInt(semNum) : null,
      warning_note: note || null
    };

    if (editingLcrId) {
      var { error } = await _sb.from('lecturer_class_rules').update(payload).eq('id', editingLcrId);
      if (error) throw error;
      showToast('Aturan kelas berhasil diperbarui', 'success');
    } else {
      var { error } = await _sb.from('lecturer_class_rules').insert(payload);
      if (error) throw error;
      showToast('Aturan kelas berhasil ditambahkan', 'success');
    }
    closeLcrModal();
    await loadLecturerClassRules();
  } catch (err) {
    console.error('Save lecturer class rule error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function deleteLecturerClassRule(id) {
  if (!confirm('Yakin ingin menghapus aturan kelas ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('lecturer_class_rules').delete().eq('id', id);
    if (error) throw error;
    showToast('Aturan kelas berhasil dihapus', 'success');
    await loadLecturerClassRules();
  } catch (err) {
    console.error('Delete lecturer class rule error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
