/**
 * Tahun Akademik Module
 * CRUD untuk tabel academic_years
 */

var academicYearsData = [];
var editingAcademicYearId = null;

function initAcademicYearsModule() {
  var addBtn = document.getElementById('addAyBtn');
  if (addBtn) addBtn.addEventListener('click', function () { openAcademicYearModal(); });
  
  var closeBtn = document.getElementById('closeAyModal');
  if (closeBtn) closeBtn.addEventListener('click', closeAcademicYearModal);
  
  var cancelBtn = document.getElementById('cancelAyBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeAcademicYearModal);
  
  var saveBtn = document.getElementById('saveAyBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveAcademicYear);
  
  var modal = document.getElementById('ayModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeAcademicYearModal(); });

  // Auto-generate name from years
  var startInp = document.getElementById('ayStartDate');
  var endInp = document.getElementById('ayEndDate');
  if (startInp) startInp.addEventListener('change', autoGenerateAYName);
  if (endInp) endInp.addEventListener('change', autoGenerateAYName);
}

function autoGenerateAYName() {
  var startVal = document.getElementById('ayStartDate').value;
  var endVal = document.getElementById('ayEndDate').value;
  if (startVal && endVal) {
    var sYear = new Date(startVal).getFullYear();
    var eYear = new Date(endVal).getFullYear();
    document.getElementById('ayName').value = sYear + '/' + eYear;
  }
}

function openAcademicYearModalById(id) {
  var data = academicYearsData.find(function (y) { return y.id === id; });
  openAcademicYearModal(data);
}

function openAcademicYearModal(data) {
  editingAcademicYearId = data ? data.id : null;
  document.getElementById('ayModalTitle').textContent = data ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik';
  document.getElementById('ayName').value = data ? (data.name || '') : '';
  document.getElementById('ayStartDate').value = data && data.start_year ? data.start_year + '-01-01' : '';
  document.getElementById('ayEndDate').value = data && data.end_year ? data.end_year + '-01-01' : '';
  document.getElementById('ayIsActive').checked = data ? !!data.is_active : false;
  document.getElementById('ayModal').style.display = 'flex';
}

function closeAcademicYearModal() {
  document.getElementById('ayModal').style.display = 'none';
  editingAcademicYearId = null;
}

async function saveAcademicYear() {
  var name = document.getElementById('ayName').value.trim();
  var startVal = document.getElementById('ayStartDate').value;
  var endVal = document.getElementById('ayEndDate').value;
  var isActive = document.getElementById('ayIsActive').checked;

  if (!name || !startVal || !endVal) {
    showToast('Lengkapi semua field yang wajib', 'warning');
    return;
  }

  var start = new Date(startVal).getFullYear();
  var end = new Date(endVal).getFullYear();

  if (end <= start) {
    showToast('Tahun selesai harus lebih besar dari tahun mulai', 'warning');
    return;
  }

  showLoading();
  try {
    if (isActive) {
      await _sb.from('academic_years').update({ is_active: false }).eq('is_active', true);
    }

    var payload = { name: name, start_year: start, end_year: end, is_active: isActive };

    if (editingAcademicYearId) {
      var { error } = await _sb.from('academic_years').update(payload).eq('id', editingAcademicYearId);
      if (error) throw error;
      showToast('Tahun akademik berhasil diperbarui', 'success');
    } else {
      var { error } = await _sb.from('academic_years').insert(payload);
      if (error) throw error;
      showToast('Tahun akademik berhasil ditambahkan', 'success');
    }
    closeAcademicYearModal();
    await loadAcademicYears();
  } catch (err) {
    console.error('Save academic year error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function deleteAcademicYear(id) {
  if (!confirm('Yakin ingin menghapus tahun akademik ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('academic_years').delete().eq('id', id);
    if (error) throw error;
    showToast('Tahun akademik berhasil dihapus', 'success');
    await loadAcademicYears();
  } catch (err) {
    console.error('Delete academic year error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function loadAcademicYears() {
  try {
    var { data, error } = await _sb
      .from('academic_years')
      .select('*')
      .order('start_year', { ascending: false });
    if (error) throw error;
    academicYearsData = data || [];
    renderAcademicYearsTable();
    SimkurmaCache.academicYears = academicYearsData;
  } catch (err) {
    console.error('Load academic years error:', err);
    document.getElementById('ayTableBody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--danger);">Gagal memuat data</td></tr>';
  }
}

function renderAcademicYearsTable() {
  var tbody = document.getElementById('ayTableBody');
  if (!tbody) return;
  if (!academicYearsData.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);">Belum ada data tahun akademik</td></tr>';
    return;
  }

  tbody.innerHTML = academicYearsData.map(function (y) {
    var statusBadge = y.is_active
      ? '<span class="badge badge-success">Aktif</span>'
      : '<span class="badge badge-neutral">Nonaktif</span>';
    return '<tr>' +
      '<td><strong>' + escapeHtml(y.name) + '</strong></td>' +
      '<td>' + y.start_year + '</td>' +
      '<td>' + y.end_year + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="openAcademicYearModalById(\'' + y.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          (y.is_active ? '' :
            '<button class="btn btn-sm btn-ghost" onclick="deleteAcademicYear(\'' + y.id + '\')" title="Hapus" style="color:var(--danger);">' +
              '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
            '</button>'
          ) +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}