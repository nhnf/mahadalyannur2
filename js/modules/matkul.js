/**
 * Mata Kuliah Module — Supabase
 */
var matkulCache = [];

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function loadMatkul() {
  var tbody = document.getElementById('matkulTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';

  try {
    const { data, error } = await _sb
      .from('mata_kuliah')
      .select('*')
      .is('deleted_at', null)
      .order('nama');
    if (error) throw error;

    matkulCache = data || [];

    if (matkulCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);">Belum ada mata kuliah</td></tr>';
      populateMatkulDropdowns([]);
      return;
    }

    // Hitung jumlah jadwal per matkul
    const { data: schData } = await _sb
      .from('schedules')
      .select('mata_kuliah_id')
      .is('deleted_at', null)
      .not('mata_kuliah_id', 'is', null);

    var schCount = {};
    (schData || []).forEach(function(s) {
      schCount[s.mata_kuliah_id] = (schCount[s.mata_kuliah_id] || 0) + 1;
    });

    tbody.innerHTML = matkulCache.map(function(mk) {
      var jml = schCount[mk.id] || 0;
      return '<tr>' +
        '<td><span class="badge badge-blue" style="font-family:monospace;">' + mk.kode + '</span></td>' +
        '<td><strong>' + mk.nama + '</strong></td>' +
        '<td style="text-align:center;">' + (mk.sks || 0) + ' SKS</td>' +
        '<td style="text-align:center;">' +
          (jml > 0
            ? '<span class="badge badge-green">' + jml + ' jadwal</span>'
            : '<span class="badge badge-gray">-</span>') +
        '</td>' +
        '<td>' +
          '<button class="btn-icon" onclick="editMatkul(\'' + mk.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn-icon" onclick="deleteMatkul(\'' + mk.id + '\')" title="Hapus">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    populateMatkulDropdowns(matkulCache);

  } catch(err) {
    console.error('loadMatkul error:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data</td></tr>';
    showToast('Gagal memuat data mata kuliah', 'error');
  }
}

// ── POPULATE DROPDOWNS ────────────────────────────────────────────────────────
function populateMatkulDropdowns(matkuls) {
  var sel = document.getElementById('scheduleMatkulId');
  if (sel) {
    sel.innerHTML = '<option value="">-- Pilih Mata Kuliah --</option>' +
      matkuls.map(function(mk) {
        return '<option value="' + mk.id + '" data-nama="' + mk.nama + '">' +
          mk.kode + ' — ' + mk.nama + '</option>';
      }).join('');
  }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function showAddMatkulModal() {
  document.getElementById('matkulModalTitle').textContent = 'Tambah Mata Kuliah';
  document.getElementById('matkulForm').reset();
  document.getElementById('matkulId').value = '';
  document.getElementById('matkulModal').style.display = 'flex';
  document.getElementById('matkulNama').focus();
}

async function editMatkul(id) {
  var mk = matkulCache.find(function(m) { return m.id === id; });
  if (!mk) { showToast('Mata kuliah tidak ditemukan', 'error'); return; }
  document.getElementById('matkulModalTitle').textContent = 'Edit Mata Kuliah';
  document.getElementById('matkulId').value       = mk.id;
  document.getElementById('matkulKode').value     = mk.kode;
  document.getElementById('matkulNama').value     = mk.nama;
  document.getElementById('matkulSks').value      = mk.sks || 2;
  document.getElementById('matkulDeskripsi').value = mk.deskripsi || '';
  document.getElementById('matkulModal').style.display = 'flex';
  document.getElementById('matkulNama').focus();
}

function closeMatkulModal() {
  document.getElementById('matkulModal').style.display = 'none';
  document.getElementById('matkulForm').reset();
}

// ── SAVE ──────────────────────────────────────────────────────────────────────
async function saveMatkul() {
  var id       = document.getElementById('matkulId').value;
  var kode     = document.getElementById('matkulKode').value.trim().toUpperCase();
  var nama     = document.getElementById('matkulNama').value.trim();
  var sks      = parseInt(document.getElementById('matkulSks').value) || 2;
  var deskripsi = document.getElementById('matkulDeskripsi').value.trim();

  if (!kode) { showToast('Kode harus diisi', 'error'); return; }
  if (!nama) { showToast('Nama harus diisi', 'error'); return; }

  var payload = { kode, nama, sks, deskripsi: deskripsi || null };

  try {
    showLoading();
    if (id) {
      const { error } = await _sb.from('mata_kuliah').update(payload).eq('id', id);
      if (error) throw error;
      showToast('Mata kuliah berhasil diperbarui', 'success');
    } else {
      const { error } = await _sb.from('mata_kuliah').insert(payload);
      if (error) throw error;
      showToast('Mata kuliah berhasil ditambahkan', 'success');
    }
    closeMatkulModal();
    loadMatkul();
  } catch(err) {
    if (err.code === '23505') showToast('Kode sudah digunakan', 'error');
    else showToast(err.message || 'Gagal menyimpan', 'error');
  } finally { hideLoading(); }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
async function deleteMatkul(id) {
  if (!confirm('Hapus mata kuliah ini? Jadwal yang menggunakan matkul ini tidak akan terhapus.')) return;
  try {
    showLoading();
    const { error } = await _sb.from('mata_kuliah')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    showToast('Mata kuliah berhasil dihapus', 'success');
    loadMatkul();
  } catch(err) {
    showToast(err.message || 'Gagal menghapus', 'error');
  } finally { hideLoading(); }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initMatkulModule() {
  var addBtn = document.getElementById('addMatkulBtn');
  if (addBtn) addBtn.addEventListener('click', showAddMatkulModal);
  var closeBtn = document.getElementById('closeMatkulModal');
  if (closeBtn) closeBtn.addEventListener('click', closeMatkulModal);
  var cancelBtn = document.getElementById('cancelMatkulBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeMatkulModal);
  var saveBtn = document.getElementById('saveMatkulBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveMatkul);
  var form = document.getElementById('matkulForm');
  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); saveMatkul(); });
  var modal = document.getElementById('matkulModal');
  if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeMatkulModal(); });

  // Sinkronkan pilihan matkul di modal jadwal → isi field mata_kuliah (nama)
  var matkulSel = document.getElementById('scheduleMatkulId');
  if (matkulSel) {
    matkulSel.addEventListener('change', function() {
      var opt = matkulSel.options[matkulSel.selectedIndex];
      var namaInput = document.getElementById('scheduleMatkul');
      if (namaInput && opt) namaInput.value = opt.dataset.nama || '';
    });
  }
}
