/**
 * Semester Module
 * CRUD untuk tabel semesters
 */

var semestersData = [];
var editingSemesterId = null;

function initSemestersModule() {
  var addBtn = document.getElementById('addSemBtn');
  if (addBtn) addBtn.addEventListener('click', function () { openSemesterModal(); });
  
  var closeBtn = document.getElementById('closeSemModal');
  if (closeBtn) closeBtn.addEventListener('click', closeSemesterModal);
  
  var cancelBtn = document.getElementById('cancelSemBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeSemesterModal);
  
  var saveBtn = document.getElementById('saveSemBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveSemester);
  
  var modal = document.getElementById('semModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeSemesterModal(); });
}

function openSemesterModalById(id) {
  var data = semestersData.find(function (s) { return s.id === id; });
  openSemesterModal(data);
}

function openSemesterModal(data) {
  editingSemesterId = data ? data.id : null;
  document.getElementById('semModalTitle').textContent = data ? 'Edit Semester' : 'Tambah Semester';
  document.getElementById('semNumber').value = data ? (data.number || '') : '';
  document.getElementById('semName').value = data ? (data.name || '') : '';
  document.getElementById('semIsActive').checked = data ? !!data.is_active : true;
  document.getElementById('semModal').style.display = 'flex';
}

function closeSemesterModal() {
  document.getElementById('semModal').style.display = 'none';
  editingSemesterId = null;
}

async function saveSemester() {
  var number = parseInt(document.getElementById('semNumber').value);
  var name = document.getElementById('semName').value.trim();
  var isActive = document.getElementById('semIsActive').checked;

  if (!name || !number) {
    showToast('Nama dan nomor semester wajib diisi', 'warning');
    return;
  }
  if (number < 1 || number > 14) {
    showToast('Nomor semester harus antara 1-14', 'warning');
    return;
  }

  showLoading();
  try {
    var payload = { code: 'SMT-' + number, name: name, number: number, is_active: isActive, priority_weight: 50 };

    if (editingSemesterId) {
      var { error } = await _sb.from('semesters').update(payload).eq('id', editingSemesterId);
      if (error) throw error;
      showToast('Semester berhasil diperbarui', 'success');
    } else {
      var { error } = await _sb.from('semesters').insert(payload);
      if (error) throw error;
      showToast('Semester berhasil ditambahkan', 'success');
    }
    closeSemesterModal();
    await loadSemesters();
  } catch (err) {
    console.error('Save semester error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function deleteSemester(id) {
  if (!confirm('Yakin ingin menghapus semester ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('semesters').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        throw new Error('Semester tidak bisa dihapus karena masih digunakan di kelas atau aturan kategori');
      }
      throw error;
    }
    showToast('Semester berhasil dihapus', 'success');
    await loadSemesters();
  } catch (err) {
    console.error('Delete semester error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function loadSemesters() {
  try {
    var { data, error } = await _sb
      .from('semesters')
      .select('*')
      .order('number', { ascending: true });
    if (error) throw error;
    semestersData = data || [];
    SimkurmaCache.semesters = semestersData;
    renderSemestersTable();
  } catch (err) {
    console.error('Load semesters error:', err);
    document.getElementById('semTableBody').innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:var(--danger);">Gagal memuat data</td></tr>';
  }
}

function renderSemestersTable() {
  var tbody = document.getElementById('semTableBody');
  if (!tbody) return;
  if (!semestersData.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:var(--space-8);">Belum ada data semester</td></tr>';
    return;
  }

  tbody.innerHTML = semestersData.map(function (s) {
    var statusBadge = s.is_active
      ? '<span class="badge badge-success">Aktif</span>'
      : '<span class="badge badge-neutral">Nonaktif</span>';
    return '<tr>' +
      '<td><strong>' + s.number + '</strong></td>' +
      '<td>' + escapeHtml(s.name) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="openSemesterModalById(\'' + s.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="deleteSemester(\'' + s.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}