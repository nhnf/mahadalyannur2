/**
 * Dosen Pengampu Module
 * Mengelola penugasan dosen pengampu per kelas (pengampu_assignments)
 * Fitur: Assign dosen ke kelas, validasi gender match, bulk assign
 */

var pengampuData = [];
var paSelectedClassroomId = null;

function initPengampuModule() {
  var aySelect = document.getElementById('paAcademicYearSelect');
  var classSelect = document.getElementById('paClassroomSelect');
  var addBtn = document.getElementById('addPengampuBtn');
  var closeBtn = document.getElementById('closePengampuModal');
  var cancelBtn = document.getElementById('cancelPengampuBtn');
  var saveBtn = document.getElementById('savePengampuBtn');
  var modal = document.getElementById('pengampuModal');
  var closeBulkBtn = document.getElementById('closePaBulkModal');
  var cancelBulkBtn = document.getElementById('cancelPaBulkBtn');
  var confirmBulkBtn = document.getElementById('confirmPaBulkBtn');
  var bulkModal = document.getElementById('paBulkModal');

  if (aySelect) aySelect.addEventListener('change', onPaAcademicYearChange);
  if (classSelect) classSelect.addEventListener('change', onPaClassroomChange);
  if (addBtn) addBtn.addEventListener('click', function () { openPengampuModal(); });
  if (closeBtn) closeBtn.addEventListener('click', closePengampuModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePengampuModal);
  if (saveBtn) saveBtn.addEventListener('click', savePengampu);
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closePengampuModal(); });
  if (closeBulkBtn) closeBulkBtn.addEventListener('click', closePaBulkModal);
  if (cancelBulkBtn) cancelBulkBtn.addEventListener('click', closePaBulkModal);
  if (confirmBulkBtn) confirmBulkBtn.addEventListener('click', confirmPaBulk);
  if (bulkModal) bulkModal.addEventListener('click', function (e) { if (e.target === this) closePaBulkModal(); });

  // Bulk assign button
  var bulkBtn = document.getElementById('paBulkAssignBtn');
  if (bulkBtn) bulkBtn.addEventListener('click', function () { openPaBulkModal(); });
}

async function populatePaAcademicYears() {
  var sel = document.getElementById('paAcademicYearSelect');
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
  if (sel.value) onPaAcademicYearChange();
}

async function onPaAcademicYearChange() {
  var ayId = document.getElementById('paAcademicYearSelect').value || null;
  await SimkurmaHelpers.fetchClassrooms({ academic_year_id: ayId });
  var sel = document.getElementById('paClassroomSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Kelas</option>';
  SimkurmaCache.classrooms.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name + (c.parallel ? ' ' + c.parallel : '') + ' (Sem ' + c.semester_number + ', ' + (c.gender_type === 'putri' ? 'Putri' : 'Putra') + ')';
    opt.dataset.gender = c.gender_type;
    sel.appendChild(opt);
  });
  paSelectedClassroomId = null;
  document.getElementById('pengampuTableBody').innerHTML =
    '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);">Pilih kelas terlebih dahulu</td></tr>';
}

async function onPaClassroomChange() {
  paSelectedClassroomId = document.getElementById('paClassroomSelect').value || null;
  if (!paSelectedClassroomId) {
    document.getElementById('pengampuTableBody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);">Pilih kelas terlebih dahulu</td></tr>';
    return;
  }
  await loadPengampu();
}

async function loadPengampu() {
  if (!paSelectedClassroomId) return;
  showLoading();
  try {
    var { data, error } = await _sb
      .from('pengampu_assignments')
      .select('*, lecturers(id, name, nidn, gender), courses(id, code, name, sks)')
      .eq('classroom_id', paSelectedClassroomId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    pengampuData = data || [];
    renderPengampuTable();
  } catch (err) {
    console.error('Load pengampu error:', err);
    showToast('Gagal memuat data pengampu: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderPengampuTable() {
  var tbody = document.getElementById('pengampuTableBody');
  if (!pengampuData.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);color:var(--gray-400);">Belum ada dosen pengampu di kelas ini</td></tr>';
    return;
  }

  tbody.innerHTML = pengampuData.map(function (p, i) {
    var lecturer = p.lecturers || {};
    var course = p.courses || {};
    var genderBadge = lecturer.gender === 'putri'
      ? '<span class="badge" style="background:var(--pink-100);color:var(--pink-800);">Putri</span>'
      : '<span class="badge" style="background:var(--primary-bg);color:var(--primary-text);">Putra</span>';
    return '<tr>' +
      '<td style="text-align:center;">' + (i + 1) + '</td>' +
      '<td>' +
        '<div><strong>' + escapeHtml(lecturer.name || '—') + '</strong></div>' +
        '<div style="font-size:var(--text-xs);color:var(--gray-400);">' + escapeHtml(lecturer.nidn || '—') + '</div>' +
      '</td>' +
      '<td>' + genderBadge + '</td>' +
      '<td>' +
        '<div><code>' + escapeHtml(course.code || '—') + '</code></div>' +
        '<div style="font-size:var(--text-xs);color:var(--gray-400);">' + escapeHtml(course.name || '') + '</div>' +
      '</td>' +
      '<td style="text-align:center;">' + (course.sks || '—') + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="removePengampu(\'' + p.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function openPengampuModal() {
  if (!paSelectedClassroomId) {
    showToast('Pilih kelas terlebih dahulu', 'warning');
    return;
  }
  // Get classroom gender type for validation hint
  var classOpt = document.getElementById('paClassroomSelect').selectedOptions[0];
  var classGender = classOpt ? classOpt.dataset.gender : 'putra';
  var hint = document.getElementById('paGenderHint');
  if (hint) {
    hint.textContent = 'Kelas ini untuk ' + (classGender === 'putri' ? 'Putri' : 'Putra') + '. Dosen dengan gender sesuai akan ditandai.';
  }

  // Populate lecturer dropdown - filter by gender if needed
  var lectSel = document.getElementById('paLecturerSelect');
  lectSel.innerHTML = '<option value="">Pilih Dosen</option>';
  SimkurmaCache.lecturers.forEach(function (l) {
    var opt = document.createElement('option');
    opt.value = l.id;
    var genderMark = '';
    if (classGender === 'putra' && l.can_teach_putra) genderMark = ' ✓ Putra';
    else if (classGender === 'putri' && l.can_teach_putri) genderMark = ' ✓ Putri';
    else genderMark = ' ✗';
    opt.textContent = l.name + ' (' + (l.nidn || '—') + ')' + genderMark;
    opt.dataset.canTeach = classGender === 'putri' ? (l.can_teach_putri ? '1' : '0') : (l.can_teach_putra ? '1' : '0');
    lectSel.appendChild(opt);
  });

  // Populate course dropdown from kurikulum_kelas of this classroom
  var courseSel = document.getElementById('paCourseSelect');
  courseSel.innerHTML = '<option value="">Pilih Mata Kuliah</option>';
  // Load kurikulum_kelas for this classroom
  _sb.from('kurikulum_kelas')
    .select('courses(id, code, name, sks)')
    .eq('classroom_id', paSelectedClassroomId)
    .then(function (result) {
      var kks = (result.data || []);
      kks.forEach(function (kk) {
        if (!kk.courses) return;
        var opt = document.createElement('option');
        opt.value = kk.courses.id;
        opt.textContent = kk.courses.code + ' — ' + kk.courses.name + ' (' + kk.courses.sks + ' SKS)';
        courseSel.appendChild(opt);
      });
    });

  document.getElementById('pengampuModal').style.display = 'flex';
}

function closePengampuModal() {
  document.getElementById('pengampuModal').style.display = 'none';
}

async function savePengampu() {
  var lecturerId = document.getElementById('paLecturerSelect').value;
  var courseId = document.getElementById('paCourseSelect').value;
  if (!lecturerId || !courseId) {
    showToast('Pilih dosen dan mata kuliah', 'warning');
    return;
  }

  // Check duplicate
  var exists = pengampuData.some(function (p) {
    return p.lecturer_id === lecturerId && p.course_id === courseId;
  });
  if (exists) {
    showToast('Dosen sudah ditugaskan untuk mata kuliah ini', 'warning');
    return;
  }

  // Gender validation
  var classOpt = document.getElementById('paClassroomSelect').selectedOptions[0];
  var classGender = classOpt ? classOpt.dataset.gender : 'putra';
  var lecturer = SimkurmaCache.lecturers.find(function (l) { return l.id === lecturerId; });
  if (lecturer) {
    if (classGender === 'putra' && !lecturer.can_teach_putra) {
      if (!confirm('Peringatan: Dosen ' + lecturer.name + ' tidak bisa mengajar kelas Putra. Lanjutkan?')) return;
    }
    if (classGender === 'putri' && !lecturer.can_teach_putri) {
      if (!confirm('Peringatan: Dosen ' + lecturer.name + ' tidak bisa mengajar kelas Putri. Lanjutkan?')) return;
    }
  }

  showLoading();
  try {
    var { error } = await _sb.from('pengampu_assignments').insert({
      classroom_id: paSelectedClassroomId,
      lecturer_id: lecturerId,
      course_id: courseId
    });
    if (error) throw error;
    showToast('Pengampu berhasil ditambahkan', 'success');
    closePengampuModal();
    await loadPengampu();
  } catch (err) {
    console.error('Save pengampu error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function removePengampu(id) {
  if (!confirm('Yakin ingin menghapus penugasan pengampu ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('pengampu_assignments').delete().eq('id', id);
    if (error) throw error;
    showToast('Pengampu berhasil dihapus', 'success');
    await loadPengampu();
  } catch (err) {
    console.error('Remove pengampu error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

// --- Bulk Assign (copy pengampu from one class to others) ---
function openPaBulkModal() {
  if (!paSelectedClassroomId) {
    showToast('Pilih kelas sumber terlebih dahulu', 'warning');
    return;
  }
  if (!pengampuData.length) {
    showToast('Kelas sumber belum memiliki pengampu', 'warning');
    return;
  }
  var sourceName = document.getElementById('paClassroomSelect').selectedOptions[0].textContent;
  document.getElementById('paBulkSourceInfo').textContent = 'Sumber: ' + sourceName + ' (' + pengampuData.length + ' pengampu)';

  var container = document.getElementById('paBulkTargetCheckboxes');
  container.innerHTML = '';
  SimkurmaCache.classrooms.forEach(function (c) {
    if (c.id === paSelectedClassroomId) return;
    var label = c.name + (c.parallel ? ' ' + c.parallel : '') + ' (Sem ' + c.semester_number + ')';
    container.innerHTML +=
      '<label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2);cursor:pointer;border-radius:var(--radius-md);transition:background 0.15s;" onmouseover="this.style.background=\'var(--gray-800)\'" onmouseout="this.style.background=\'transparent\'">' +
        '<input type="checkbox" value="' + c.id + '" class="pa-bulk-target">' +
        '<span>' + escapeHtml(label) + '</span>' +
      '</label>';
  });

  document.getElementById('paBulkModal').style.display = 'flex';
}

function closePaBulkModal() {
  document.getElementById('paBulkModal').style.display = 'none';
}

async function confirmPaBulk() {
  var checkboxes = document.querySelectorAll('.pa-bulk-target:checked');
  if (!checkboxes.length) {
    showToast('Pilih minimal satu kelas target', 'warning');
    return;
  }
  var targetIds = Array.from(checkboxes).map(function (cb) { return cb.value; });

  showLoading();
  try {
    var totalInserted = 0;
    for (var i = 0; i < targetIds.length; i++) {
      var targetId = targetIds[i];
      var { data: existing } = await _sb
        .from('pengampu_assignments')
        .select('lecturer_id, course_id')
        .eq('classroom_id', targetId);
      var existingSet = new Set((existing || []).map(function (e) { return e.lecturer_id + '|' + e.course_id; }));

      var toInsert = pengampuData
        .filter(function (p) { return !existingSet.has(p.lecturer_id + '|' + p.course_id); })
        .map(function (p) { return { classroom_id: targetId, lecturer_id: p.lecturer_id, course_id: p.course_id }; });

      if (toInsert.length) {
        var { error } = await _sb.from('pengampu_assignments').insert(toInsert);
        if (error) throw error;
        totalInserted += toInsert.length;
      }
    }
    showToast('Berhasil menyalin ' + totalInserted + ' pengampu ke ' + targetIds.length + ' kelas', 'success');
    closePaBulkModal();
  } catch (err) {
    console.error('Bulk assign error:', err);
    showToast('Gagal bulk assign: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
