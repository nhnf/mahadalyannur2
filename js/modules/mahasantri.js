/**
 * Mahasantri Module — Supabase CRUD
 * Compatible with corrected migration 014: semester VARCHAR, classroom VARCHAR
 * Mirrors lecturers.js pattern
 */
var mahasantriData     = [];
var filteredMahasantri = [];

// ── LOAD ────────────────────────────────────────────────────────
async function loadMahasantri() {
  var tbody = document.getElementById('mahasantriTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';
  try {
    var res = await _sb.from('mahasantri')
      .select('id, nim, nama, angkatan, semester, classroom, gender, phone, email, is_active')
      .is('deleted_at', null)
      .order('nama');

    if (res.error) throw res.error;

    mahasantriData     = res.data || [];
    filteredMahasantri = mahasantriData.slice();
    renderMahasantriTable();
  } catch(err) {
    console.error('loadMahasantri error:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data mahasantri</td></tr>';
    showToast('Gagal memuat data mahasantri', 'error');
  }
}

// ── RENDER TABLE ────────────────────────────────────────────────
function renderMahasantriTable() {
  var tbody = document.getElementById('mahasantriTableBody');
  if (!tbody) return;
  if (filteredMahasantri.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);">Tidak ada data mahasantri</td></tr>';
    return;
  }
  tbody.innerHTML = filteredMahasantri.map(function(m) {
    var badge = m.is_active
      ? '<span class="badge badge-green">Aktif</span>'
      : '<span class="badge badge-gray">Non-aktif</span>';
    return '<tr>' +
      '<td><strong>' + escapeHtml(m.nim || '-') + '</strong></td>' +
      '<td>' + escapeHtml(m.nama || '-') + '</td>' +
      '<td><span class="badge badge-blue">' + escapeHtml(m.semester || '-') + '</span></td>' +
      '<td>' + escapeHtml(m.classroom || '-') + '</td>' +
      '<td>' + escapeHtml(m.email || '-') + '</td>' +
      '<td>' + badge + '</td>' +
      '<td>' +
        '<button class="btn-icon" onclick="editMahasantri(\'' + m.id + '\')" title="Edit">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
        '</button>' +
        '<button class="btn-icon" onclick="deleteMahasantri(\'' + m.id + '\')" title="Hapus">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// ── FILTER / SEARCH ─────────────────────────────────────────────
function filterMahasantri() {
  var search = (document.getElementById('searchMahasantri')?.value || '').toLowerCase();
  filteredMahasantri = mahasantriData.filter(function(m) {
    return !search ||
      (m.nama     && m.nama.toLowerCase().includes(search)) ||
      (m.nim      && m.nim.toLowerCase().includes(search)) ||
      (m.email    && m.email.toLowerCase().includes(search)) ||
      (m.semester && m.semester.toLowerCase().includes(search)) ||
      (m.classroom && m.classroom.toLowerCase().includes(search));
  });
  renderMahasantriTable();
}

// ── MODAL: ADD ──────────────────────────────────────────────────
function showAddMahasantriModal() {
  document.getElementById('mahasantriModalTitle').textContent = 'Tambah Mahasantri';
  document.getElementById('mahasantriForm').reset();
  document.getElementById('mahasantriId').value = '';
  document.getElementById('mahasantriModal').style.display = 'flex';
  document.getElementById('mahasantriNim').focus();
}

// ── MODAL: EDIT ─────────────────────────────────────────────────
function editMahasantri(id) {
  var m = mahasantriData.find(function(x) { return x.id === id; });
  if (!m) { showToast('Mahasantri tidak ditemukan', 'error'); return; }
  document.getElementById('mahasantriModalTitle').textContent = 'Edit Mahasantri';
  document.getElementById('mahasantriId').value         = m.id;
  document.getElementById('mahasantriNim').value        = m.nim   || '';
  document.getElementById('mahasantriName').value       = m.nama  || '';
  document.getElementById('mahasantriEmail').value      = m.email || '';
  document.getElementById('mahasantriPhone').value      = m.phone || '';
  var semSel   = document.getElementById('mahasantriSemester');
  var classSel = document.getElementById('mahasantriClassroom');
  if (semSel)   semSel.value   = m.semester  || '';
  if (classSel) classSel.value = m.classroom || '';
  document.getElementById('mahasantriModal').style.display = 'flex';
  document.getElementById('mahasantriNim').focus();
}

// ── MODAL: CLOSE ────────────────────────────────────────────────
function closeMahasantriModal() {
  document.getElementById('mahasantriModal').style.display = 'none';
  document.getElementById('mahasantriForm').reset();
}

// ── SAVE ────────────────────────────────────────────────────────
async function saveMahasantri() {
  var id        = document.getElementById('mahasantriId').value;
  var nim       = document.getElementById('mahasantriNim').value.trim();
  var nama      = document.getElementById('mahasantriName').value.trim();
  var semester  = document.getElementById('mahasantriSemester').value;
  var classroom = document.getElementById('mahasantriClassroom').value;
  var email     = document.getElementById('mahasantriEmail').value.trim();
  var phone     = document.getElementById('mahasantriPhone').value.trim();

  if (!nim)                           { showToast('NIM harus diisi', 'error'); return; }
  if (!nama)                          { showToast('Nama harus diisi', 'error'); return; }
  if (!semester)                      { showToast('Semester harus dipilih', 'error'); return; }
  if (!classroom)                     { showToast('Kelas harus dipilih', 'error'); return; }
  if (email && !validateEmail(email)) { showToast('Format email tidak valid', 'error'); return; }

  var payload = {
    nim:       nim,
    nama:      nama,
    semester:  semester  || null,
    classroom: classroom || null,
    email:     email     || null,
    phone:     phone     || null,
    is_active: true
  };

  try {
    showLoading();
    if (id) {
      var res = await _sb.from('mahasantri').update(payload).eq('id', id);
      if (res.error) throw res.error;
      showToast('Data mahasantri berhasil diperbarui', 'success');
    } else {
      var res = await _sb.from('mahasantri').insert(payload);
      if (res.error) throw res.error;
      showToast('Mahasantri berhasil ditambahkan', 'success');
    }
    closeMahasantriModal();
    loadMahasantri();
  } catch(err) {
    console.error('saveMahasantri error:', err);
    if (err.code === '23505') showToast('NIM sudah terdaftar', 'error');
    else showToast(err.message || 'Gagal menyimpan data mahasantri', 'error');
  } finally { hideLoading(); }
}

// ── DELETE (soft) ───────────────────────────────────────────────
async function deleteMahasantri(id) {
  if (!confirm('Hapus mahasantri ini? Data terkait tetap tersimpan.')) return;
  try {
    showLoading();
    var res = await _sb.from('mahasantri')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (res.error) throw res.error;
    showToast('Mahasantri berhasil dihapus', 'success');
    loadMahasantri();
  } catch(err) {
    showToast(err.message || 'Gagal menghapus mahasantri', 'error');
  } finally { hideLoading(); }
}

// ── INIT ────────────────────────────────────────────────────────
function initMahasantriModule() {
  var addBtn    = document.getElementById('addMahasantriBtn');
  var closeBtn  = document.getElementById('closeMahasantriModal');
  var cancelBtn = document.getElementById('cancelMahasantriBtn');
  var saveBtn   = document.getElementById('saveMahasantriBtn');
  var searchIn  = document.getElementById('searchMahasantri');

  if (addBtn)    addBtn.addEventListener('click', showAddMahasantriModal);
  if (closeBtn)  closeBtn.addEventListener('click', closeMahasantriModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeMahasantriModal);
  if (saveBtn)   saveBtn.addEventListener('click', saveMahasantri);
  if (searchIn)  searchIn.addEventListener('input', debounce(filterMahasantri, 300));

  var modal = document.getElementById('mahasantriModal');
  if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeMahasantriModal(); });
}
