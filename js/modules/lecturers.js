/**
 * Lecturers Module — Supabase
 */
var lecturersData    = [];
var filteredLecturers = [];

async function loadLecturers() {
  var tbody = document.getElementById('lecturersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';
  try {
    const { data, error } = await _sb.from('v_lecturers_with_category').select('*').order('name');
    if (error) throw error;
    lecturersData     = data || [];
    filteredLecturers = lecturersData.slice();
    renderLecturersTable();
    populateLecturerDropdowns(lecturersData);
  } catch(err) {
    console.error('loadLecturers error:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data dosen</td></tr>';
    showToast('Gagal memuat data dosen', 'error');
  }
}

function renderLecturersTable() {
  var tbody = document.getElementById('lecturersTableBody');
  if (!tbody) return;
  if (filteredLecturers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);">Tidak ada data dosen</td></tr>';
    return;
  }
  tbody.innerHTML = filteredLecturers.map(function(l) {
    var badge = l.is_active ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-gray">Tidak Aktif</span>';
    return '<tr>' +
      '<td><strong>' + (l.nidn||'-') + '</strong></td>' +
      '<td>' + (l.name||'-') + '</td>' +
      '<td>' + (l.email||'-') + '</td>' +
      '<td>' + (l.phone||'-') + '</td>' +
      '<td>' + badge + '</td>' +
      '<td>' +
        '<button class="btn-icon" onclick="editLecturer(\'' + l.id + '\')" title="Edit">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
        '</button>' +
        '<button class="btn-icon" onclick="deleteLecturer(\'' + l.id + '\')" title="Hapus">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function populateLecturerDropdowns(lecturers) {
  var active = lecturers.filter(function(l) { return l.is_active; });
  var schedSel = document.getElementById('scheduleLecturer');
  if (schedSel) {
    schedSel.innerHTML = '<option value="">Pilih Dosen</option>' +
      active.map(function(l) { return '<option value="' + l.id + '">' + l.name + ' (' + l.nidn + ')</option>'; }).join('');
  }
  var filterSel = document.getElementById('filterScheduleLecturer');
  if (filterSel) {
    filterSel.innerHTML = '<option value="">Semua Dosen</option>' +
      active.map(function(l) { return '<option value="' + l.id + '">' + l.name + '</option>'; }).join('');
  }
}

function filterLecturers() {
  var search = (document.getElementById('searchLecturer')?.value || '').toLowerCase();
  filteredLecturers = lecturersData.filter(function(l) {
    return !search ||
      (l.name  && l.name.toLowerCase().includes(search)) ||
      (l.nidn  && l.nidn.toLowerCase().includes(search)) ||
      (l.email && l.email.toLowerCase().includes(search));
  });
  renderLecturersTable();
}

function showAddLecturerModal() {
  document.getElementById('lecturerModalTitle').textContent = 'Tambah Dosen';
  document.getElementById('lecturerForm').reset();
  document.getElementById('lecturerId').value = '';
  document.getElementById('lecturerModal').style.display = 'flex';
  document.getElementById('lecturerNidn').focus();
}

async function editLecturer(id) {
  var l = lecturersData.find(function(x) { return x.id === id; });
  if (!l) { showToast('Dosen tidak ditemukan', 'error'); return; }
  document.getElementById('lecturerModalTitle').textContent = 'Edit Dosen';
  document.getElementById('lecturerId').value    = l.id;
  document.getElementById('lecturerNidn').value  = l.nidn  || '';
  document.getElementById('lecturerName').value  = l.name  || '';
  document.getElementById('lecturerEmail').value = l.email || '';
  document.getElementById('lecturerPhone').value = l.phone || '';
  document.getElementById('lecturerModal').style.display = 'flex';
  document.getElementById('lecturerNidn').focus();
}

function closeLecturerModal() {
  document.getElementById('lecturerModal').style.display = 'none';
  document.getElementById('lecturerForm').reset();
}

async function saveLecturer() {
  var id         = document.getElementById('lecturerId').value;
  var nidn       = document.getElementById('lecturerNidn').value.trim();
  var name       = document.getElementById('lecturerName').value.trim();
  var email      = document.getElementById('lecturerEmail').value.trim();
  var phone      = document.getElementById('lecturerPhone').value.trim();

  if (!nidn)                    { showToast('NIDN harus diisi', 'error'); return; }
  if (!/^\d{10}$/.test(nidn))   { showToast('NIDN harus 10 digit angka', 'error'); return; }
  if (!name)                    { showToast('Nama harus diisi', 'error'); return; }
  if (email && !validateEmail(email)) { showToast('Format email tidak valid', 'error'); return; }

  var payload = { nidn, name, email: email||null, phone: phone||null, is_active: true };

  try {
    showLoading();
    if (id) {
      const { error } = await _sb.from('lecturers').update(payload).eq('id', id);
      if (error) throw error;
      showToast('Data dosen berhasil diperbarui', 'success');
    } else {
      const { error } = await _sb.from('lecturers').insert(payload);
      if (error) throw error;
      showToast('Dosen berhasil ditambahkan', 'success');
    }
    closeLecturerModal();
    loadLecturers();
  } catch(err) {
    console.error('saveLecturer error:', err);
    if (err.code === '23505') showToast('NIDN sudah terdaftar', 'error');
    else showToast(err.message || 'Gagal menyimpan data dosen', 'error');
  } finally { hideLoading(); }
}

async function deleteLecturer(id) {
  if (!confirm('Hapus dosen ini? Data jadwal dan payroll terkait tetap tersimpan.')) return;
  try {
    showLoading();
    const { error } = await _sb.from('lecturers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    showToast('Dosen berhasil dihapus', 'success');
    loadLecturers();
  } catch(err) {
    showToast(err.message || 'Gagal menghapus dosen', 'error');
  } finally { hideLoading(); }
}

function initLecturersModule() {
  var addBtn = document.getElementById('addLecturerBtn');
  if (addBtn) addBtn.addEventListener('click', showAddLecturerModal);
  var closeBtn = document.getElementById('closeLecturerModal');
  if (closeBtn) closeBtn.addEventListener('click', closeLecturerModal);
  var cancelBtn = document.getElementById('cancelLecturerBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeLecturerModal);
  var saveBtn = document.getElementById('saveLecturerBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveLecturer);
  var searchInput = document.getElementById('searchLecturer');
  if (searchInput) searchInput.addEventListener('input', debounce(filterLecturers, 300));
  var modal = document.getElementById('lecturerModal');
  if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeLecturerModal(); });
}
