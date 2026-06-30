/**
 * Kurikulum Kelas Module
 * Mengelola kurikulum per kelas dengan fitur duplikasi antar kelas paralel
 * Tabel: kurikulum_kelas (classroom_id, course_id, semester_number)
 */

var kurikulumKelasData = [];
var kkSelectedAcademicYearId = null;
var kkSelectedClassroomId = null;

function initKurikulumKelasModule() {
  var aySelect = document.getElementById('kkAcademicYearSelect');
  var classSelect = document.getElementById('kkClassroomSelect');
  var addBtn = document.getElementById('addKurikulumBtn');
  var dupBtn = document.getElementById('kkDuplicateBtn');
  var closeBtn = document.getElementById('closeKurikulumModal');
  var cancelBtn = document.getElementById('cancelKurikulumBtn');
  var saveBtn = document.getElementById('saveKurikulumBtn');
  var modal = document.getElementById('kurikulumModal');
  var closeDupBtn = document.getElementById('closeKkDuplicateModal');
  var cancelDupBtn = document.getElementById('cancelKkDuplicateBtn');
  var confirmDupBtn = document.getElementById('confirmKkDuplicateBtn');
  var dupModal = document.getElementById('kkDuplicateModal');

  if (aySelect) aySelect.addEventListener('change', onKkAcademicYearChange);
  if (classSelect) classSelect.addEventListener('change', onKkClassroomChange);
  if (addBtn) addBtn.addEventListener('click', function () { openKurikulumModal(); });
  if (dupBtn) dupBtn.addEventListener('click', function () { openKkDuplicateModal(); });
  if (closeBtn) closeBtn.addEventListener('click', closeKurikulumModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeKurikulumModal);
  if (saveBtn) saveBtn.addEventListener('click', saveKurikulum);
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeKurikulumModal(); });
  if (closeDupBtn) closeDupBtn.addEventListener('click', closeKkDuplicateModal);
  if (cancelDupBtn) cancelDupBtn.addEventListener('click', closeKkDuplicateModal);
  if (confirmDupBtn) confirmDupBtn.addEventListener('click', confirmKkDuplicate);
  if (dupModal) dupModal.addEventListener('click', function (e) { if (e.target === this) closeKkDuplicateModal(); });
}

async function populateKkAcademicYears() {
  var sel = document.getElementById('kkAcademicYearSelect');
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
  if (sel.value) onKkAcademicYearChange();
}

async function onKkAcademicYearChange() {
  kkSelectedAcademicYearId = document.getElementById('kkAcademicYearSelect').value || null;
  await SimkurmaHelpers.fetchClassrooms({ academic_year_id: kkSelectedAcademicYearId });
  var sel = document.getElementById('kkClassroomSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Kelas</option>';
  SimkurmaCache.classrooms.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.id;
    var label = c.name + (c.parallel ? ' ' + c.parallel : '') + ' (Sem ' + c.semester_number + ', ' + (c.gender_type === 'putri' ? 'Putri' : 'Putra') + ')';
    opt.textContent = label;
    sel.appendChild(opt);
  });
  kkSelectedClassroomId = null;
  document.getElementById('kurikulumTableBody').innerHTML =
    '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);">Pilih kelas terlebih dahulu</td></tr>';
}

async function onKkClassroomChange() {
  kkSelectedClassroomId = document.getElementById('kkClassroomSelect').value || null;
  if (!kkSelectedClassroomId) {
    document.getElementById('kurikulumTableBody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);">Pilih kelas terlebih dahulu</td></tr>';
    return;
  }
  await loadKurikulumKelas();
}

async function loadKurikulumKelas() {
  if (!kkSelectedClassroomId) return;
  showLoading();
  try {
    var { data, error } = await _sb
      .from('kurikulum_kelas')
      .select('*, courses(id, code, name, sks, semester_number)')
      .eq('classroom_id', kkSelectedClassroomId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    kurikulumKelasData = data || [];
    renderKurikulumTable();
  } catch (err) {
    console.error('Load kurikulum_kelas error:', err);
    showToast('Gagal memuat kurikulum kelas: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderKurikulumTable() {
  var tbody = document.getElementById('kurikulumTableBody');
  if (!kurikulumKelasData.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);color:var(--gray-400);">Belum ada mata kuliah di kelas ini</td></tr>';
    return;
  }

  tbody.innerHTML = kurikulumKelasData.map(function (kk, i) {
    var course = kk.courses || {};
    return '<tr>' +
      '<td style="text-align:center;">' + (i + 1) + '</td>' +
      '<td><code>' + escapeHtml(course.code || '—') + '</code></td>' +
      '<td><strong>' + escapeHtml(course.name || 'Tidak Diketahui') + '</strong></td>' +
      '<td style="text-align:center;">' + (course.sks || '—') + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="removeKurikulumItem(\'' + kk.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function openKurikulumModal() {
  if (!kkSelectedClassroomId) {
    showToast('Pilih kelas terlebih dahulu', 'warning');
    return;
  }
  // Populate course dropdown
  var sel = document.getElementById('kkCourseSelect');
  sel.innerHTML = '<option value="">Pilih Mata Kuliah</option>';
  SimkurmaCache.courses.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.code + ' — ' + c.name + ' (' + c.sks + ' SKS, Sem ' + c.semester_number + ')';
    sel.appendChild(opt);
  });
  document.getElementById('kurikulumModal').style.display = 'flex';
}

function closeKurikulumModal() {
  document.getElementById('kurikulumModal').style.display = 'none';
}

async function saveKurikulum() {
  var courseId = document.getElementById('kkCourseSelect').value;
  if (!courseId) {
    showToast('Pilih mata kuliah', 'warning');
    return;
  }
  // Check duplicate
  var exists = kurikulumKelasData.some(function (kk) { return kk.course_id === courseId; });
  if (exists) {
    showToast('Mata kuliah sudah ada di kelas ini', 'warning');
    return;
  }

  showLoading();
  try {
    var { error } = await _sb.from('kurikulum_kelas').insert({
      classroom_id: kkSelectedClassroomId,
      course_id: courseId
    });
    if (error) throw error;
    showToast('Mata kuliah berhasil ditambahkan ke kurikulum', 'success');
    closeKurikulumModal();
    await loadKurikulumKelas();
  } catch (err) {
    console.error('Save kurikulum error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function removeKurikulumItem(id) {
  if (!confirm('Yakin ingin menghapus mata kuliah ini dari kurikulum?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('kurikulum_kelas').delete().eq('id', id);
    if (error) throw error;
    showToast('Mata kuliah berhasil dihapus dari kurikulum', 'success');
    await loadKurikulumKelas();
  } catch (err) {
    console.error('Remove kurikulum item error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

// --- Duplikasi Kurikulum ---
function openKkDuplicateModal() {
  if (!kkSelectedClassroomId) {
    showToast('Pilih kelas sumber terlebih dahulu', 'warning');
    return;
  }
  if (!kurikulumKelasData.length) {
    showToast('Kelas sumber belum memiliki kurikulum', 'warning');
    return;
  }
  var sourceName = document.getElementById('kkClassroomSelect').options[document.getElementById('kkClassroomSelect').selectedIndex].textContent;
  document.getElementById('kkDupSourceInfo').textContent = 'Sumber: ' + sourceName + ' (' + kurikulumKelasData.length + ' mata kuliah)';

  // Populate target class list (exclude source)
  var container = document.getElementById('kkDupTargetCheckboxes');
  container.innerHTML = '';
  SimkurmaCache.classrooms.forEach(function (c) {
    if (c.id === kkSelectedClassroomId) return;
    var label = c.name + (c.parallel ? ' ' + c.parallel : '') + ' (Sem ' + c.semester_number + ', ' + (c.gender_type === 'putri' ? 'Putri' : 'Putra') + ')';
    var checked = c.semester_number === SimkurmaCache.classrooms.find(function (cl) { return cl.id === kkSelectedClassroomId; }).semester_number ? 'checked' : '';
    container.innerHTML +=
      '<label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2);cursor:pointer;border-radius:var(--radius-md);transition:background 0.15s;" onmouseover="this.style.background=\'var(--gray-800)\'" onmouseout="this.style.background=\'transparent\'">' +
        '<input type="checkbox" value="' + c.id + '" class="kk-dup-target" ' + checked + '>' +
        '<span>' + escapeHtml(label) + '</span>' +
      '</label>';
  });

  document.getElementById('kkDuplicateModal').style.display = 'flex';
}

function closeKkDuplicateModal() {
  document.getElementById('kkDuplicateModal').style.display = 'none';
}

async function confirmKkDuplicate() {
  var checkboxes = document.querySelectorAll('.kk-dup-target:checked');
  if (!checkboxes.length) {
    showToast('Pilih minimal satu kelas target', 'warning');
    return;
  }
  var targetIds = Array.from(checkboxes).map(function (cb) { return cb.value; });
  var sourceCourseIds = kurikulumKelasData.map(function (kk) { return kk.course_id; });

  showLoading();
  try {
    var totalInserted = 0;
    for (var i = 0; i < targetIds.length; i++) {
      var targetId = targetIds[i];
      // Get existing kurikulum for target
      var { data: existing } = await _sb
        .from('kurikulum_kelas')
        .select('course_id')
        .eq('classroom_id', targetId);
      var existingIds = (existing || []).map(function (e) { return e.course_id; });

      var toInsert = sourceCourseIds
        .filter(function (cid) { return existingIds.indexOf(cid) === -1; })
        .map(function (cid) { return { classroom_id: targetId, course_id: cid }; });

      if (toInsert.length) {
        var { error } = await _sb.from('kurikulum_kelas').insert(toInsert);
        if (error) throw error;
        totalInserted += toInsert.length;
      }
    }
    showToast('Berhasil menduplikasi ' + totalInserted + ' mata kuliah ke ' + targetIds.length + ' kelas', 'success');
    closeKkDuplicateModal();
  } catch (err) {
    console.error('Duplicate kurikulum error:', err);
    showToast('Gagal menduplikasi: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
