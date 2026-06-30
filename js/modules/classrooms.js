/**
 * Classroom (Kelas) Module
 * CRUD untuk classrooms
 */

var classroomsData = [];
var editingClassroomId = null;

function initClassroomsModule() {
  var addBtn = document.getElementById('addCrBtn');
  if (addBtn) addBtn.addEventListener('click', function () { openClassroomModal(); });
  
  var closeBtn = document.getElementById('closeCrModal');
  if (closeBtn) closeBtn.addEventListener('click', closeClassroomModal);
  
  var cancelBtn = document.getElementById('cancelCrBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeClassroomModal);
  
  var saveBtn = document.getElementById('saveCrBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveClassroom);
  
  var modal = document.getElementById('crModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeClassroomModal(); });
}

async function populateClassroomDropdowns() {
  // Populate Semesters
  try {
    var semSelect = document.getElementById('crSemesterSelect');
    if (semSelect) {
      await SimkurmaHelpers.fetchSemesters();
      semSelect.innerHTML = '<option value="">Pilih Semester</option>';
      SimkurmaCache.semesters.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = 'Semester ' + s.number + ' � ' + s.name;
        semSelect.appendChild(opt);
      });
    }

    // Populate Academic Years
    var aySelect = document.getElementById('crAcademicYearSelect');
    if (aySelect) {
      await SimkurmaHelpers.fetchAcademicYears();
      aySelect.innerHTML = '<option value="">Pilih Tahun Akademik</option>';
      SimkurmaCache.academicYears.forEach(function(ay) {
        var opt = document.createElement('option');
        opt.value = ay.id;
        opt.textContent = ay.name + (ay.is_active ? ' (Aktif)' : '');
        if (ay.is_active && !editingClassroomId) opt.selected = true;
        aySelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Error populating classrooms form dropdowns:', e);
  }
}

function openClassroomModalById(id) {
  var data = classroomsData.find(function (c) { return c.id === id; });
  openClassroomModal(data);
}

async function openClassroomModal(data) {
  editingClassroomId = data ? data.id : null;
  await populateClassroomDropdowns();
  
  document.getElementById('crModalTitle').textContent = data ? 'Edit Kelas' : 'Tambah Kelas';
  document.getElementById('crName').value = data ? (data.name || '') : '';
  document.getElementById('crSemesterSelect').value = data ? (data.semester_id || '') : '';
  document.getElementById('crGenderType').value = data ? (data.gender || 'putra') : 'putra';
  document.getElementById('crParallel').value = data ? (data.parallel || '') : '';
  document.getElementById('crAcademicYearSelect').value = data ? (data.academic_year_id || '') : '';
  document.getElementById('crIsActive').checked = data ? !!data.is_active : true;
  document.getElementById('crModal').style.display = 'flex';
}

function closeClassroomModal() {
  document.getElementById('crModal').style.display = 'none';
  editingClassroomId = null;
}

async function saveClassroom() {
  var name = document.getElementById('crName').value.trim();
  var semesterId = document.getElementById('crSemesterSelect').value;
  var gender = document.getElementById('crGenderType').value;
  var parallel = document.getElementById('crParallel').value.trim().toUpperCase();
  var ayId = document.getElementById('crAcademicYearSelect').value;
  var isActive = document.getElementById('crIsActive').checked;

  if (!name || !semesterId || !ayId) {
    showToast('Lengkapi semua field yang wajib', 'warning');
    return;
  }

  showLoading();
  try {
    var payload = {
      name: name,
      semester_id: semesterId,
      gender: gender,
      parallel: parallel || null,
      academic_year_id: ayId,
      is_active: isActive,
      student_count: 40
    };

    if (editingClassroomId) {
      var { error } = await _sb.from('classrooms').update(payload).eq('id', editingClassroomId);
      if (error) throw error;
      showToast('Kelas berhasil diperbarui', 'success');
    } else {
      var { error } = await _sb.from('classrooms').insert(payload);
      if (error) throw error;
      showToast('Kelas berhasil ditambahkan', 'success');
    }
    closeClassroomModal();
    await loadClassrooms();
  } catch (err) {
    console.error('Save classroom error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function deleteClassroom(id) {
  if (!confirm('Yakin ingin menghapus kelas ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('classrooms').delete().eq('id', id);
    if (error) throw error;
    showToast('Kelas berhasil dihapus', 'success');
    await loadClassrooms();
  } catch (err) {
    console.error('Delete classroom error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function loadClassrooms() {
  try {
    var { data, error } = await _sb
      .from('classrooms')
      .select('*, semesters:semester_id (number, name), academic_years:academic_year_id (name)')
      .order('name', { ascending: true });
    if (error) throw error;
    classroomsData = data || [];
    SimkurmaCache.classrooms = classroomsData;
    renderClassroomsTable();
  } catch (err) {
    console.error('Load classrooms error:', err);
    document.getElementById('crTableBody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:var(--danger);">Gagal memuat data</td></tr>';
  }
}

function renderClassroomsTable() {
  var tbody = document.getElementById('crTableBody');
  if (!tbody) return;
  if (!classroomsData.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);">Belum ada data kelas</td></tr>';
    return;
  }

  tbody.innerHTML = classroomsData.map(function (c) {
    var genderBadge = c.gender === 'putri'
      ? '<span class="badge" style="background:var(--pink-100);color:var(--pink-800);">Putri</span>'
      : '<span class="badge" style="background:var(--primary-bg);color:var(--primary-text);">Putra</span>';
    var fullName = escapeHtml(c.name) + (c.parallel ? ' ' + escapeHtml(c.parallel) : '');
    var statusBadge = c.is_active
      ? '<span class="badge badge-success">Aktif</span>'
      : '<span class="badge badge-neutral">Nonaktif</span>';
    var semNum = c.semesters ? c.semesters.number : '�';
    var ayName = c.academic_years ? c.academic_years.name : '�';

    return '<tr>' +
      '<td><strong>' + fullName + '</strong></td>' +
      '<td style="text-align:center;">Sem ' + semNum + '</td>' +
      '<td style="text-align:center;">' + genderBadge + '</td>' +
      '<td style="text-align:center;">' + escapeHtml(c.parallel || '�') + '</td>' +
      '<td>' + escapeHtml(ayName) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="openClassroomModalById(\'' + c.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="deleteClassroom(\'' + c.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}