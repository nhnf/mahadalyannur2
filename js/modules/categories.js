/**
 * Categories Module — Supabase
 */
var categoriesCache = [];

async function loadCategories() {
  var tbody = document.getElementById('categoriesTableBody');

  // Jika dipanggil background (init), tetap load untuk isi dropdown
  if (!tbody) {
    try {
      const { data, error } = await _sb.from('categories').select('*').is('deleted_at', null).order('category_code');
      if (error) throw error;
      categoriesCache = data || [];
      populateCategoryDropdowns(categoriesCache);
      return categoriesCache;
    } catch(err) { console.error('loadCategories bg error:', err); return []; }
  }

  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';
  try {
    const { data, error } = await _sb.from('categories').select('*').is('deleted_at', null).order('category_code');
    if (error) throw error;
    categoriesCache = data || [];

    if (categoriesCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:var(--space-8);">Belum ada data kategori</td></tr>';
      populateCategoryDropdowns([]);
      return [];
    }

    tbody.innerHTML = categoriesCache.map(function(cat) {
      return '<tr>' +
        '<td><span class="badge badge-blue">' + escapeHtml(cat.category_code) + '</span></td>' +
        '<td><strong>' + formatCurrency(cat.hourly_rate) + '</strong></td>' +
        '<td>' + escapeHtml(cat.description || '-') + '</td>' +
        '<td>' +
          '<button class="btn-icon" onclick="editCategory(\'' + escapeHtml(cat.id) + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn-icon" onclick="deleteCategory(\'' + escapeHtml(cat.id) + '\')" title="Hapus">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    populateCategoryDropdowns(categoriesCache);
    return categoriesCache;
  } catch(err) {
    console.error('loadCategories error:', err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data</td></tr>';
    showToast('Gagal memuat data kategori', 'error');
    return [];
  }
}

function populateCategoryDropdowns(categories) {
  // Dropdown untuk form dosen
  var lecturerCatSel = document.getElementById('lecturerCategory');
  if (lecturerCatSel) {
    lecturerCatSel.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
      categories.map(function(c) {
        return '<option value="' + escapeHtml(c.id) + '">' +
          escapeHtml(c.category_code) + ' — Rp ' +
          Number(c.hourly_rate).toLocaleString('id-ID') + '/jam</option>';
      }).join('');
  }

  // Dropdown filter kategori
  var filterCatSel = document.getElementById('filterCategory');
  if (filterCatSel) {
    filterCatSel.innerHTML = '<option value="">Semua Kategori</option>' +
      categories.map(function(c) {
        return '<option value="' + escapeHtml(c.id) + '">' +
          escapeHtml(c.category_code) + ' — Rp ' +
          Number(c.hourly_rate).toLocaleString('id-ID') + '/jam</option>';
      }).join('');
  }
}

function showAddCategoryModal() {
  document.getElementById('categoryModalTitle').textContent = 'Tambah Kategori';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryModal').style.display = 'flex';
  document.getElementById('categoryCode').focus();
}

async function editCategory(id) {
  var cat = categoriesCache.find(function(c) { return c.id === id; });
  if (!cat) { showToast('Kategori tidak ditemukan', 'error'); return; }
  document.getElementById('categoryModalTitle').textContent = 'Edit Kategori';
  document.getElementById('categoryId').value          = cat.id;
  document.getElementById('categoryCode').value        = cat.category_code;
  document.getElementById('hourlyRate').value          = cat.hourly_rate;
  document.getElementById('categoryDescription').value = cat.description || '';
  document.getElementById('categoryModal').style.display = 'flex';
  document.getElementById('categoryCode').focus();
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
  document.getElementById('categoryForm').reset();
}

async function saveCategory() {
  var id   = document.getElementById('categoryId').value;
  var code = document.getElementById('categoryCode').value.trim().toUpperCase();
  var rate = document.getElementById('hourlyRate').value;
  var desc = document.getElementById('categoryDescription').value.trim();

  if (!code)                          { showToast('Kode kategori harus diisi', 'error'); return; }
  if (!rate || parseFloat(rate) <= 0) { showToast('Tarif per jam harus lebih dari 0', 'error'); return; }

  var payload = { category_code: code, hourly_rate: parseFloat(rate), description: desc || null };

  try {
    showLoading();
    if (id) {
      const { error } = await _sb.from('categories').update(payload).eq('id', id);
      if (error) throw error;
      showToast('Kategori berhasil diperbarui', 'success');
    } else {
      const { error } = await _sb.from('categories').insert(payload);
      if (error) throw error;
      showToast('Kategori berhasil ditambahkan', 'success');
    }
    closeCategoryModal();
    loadCategories();
  } catch(err) {
    console.error('saveCategory error:', err);
    if (err.code === '23505') showToast('Kode kategori sudah digunakan', 'error');
    else showToast(err.message || 'Gagal menyimpan kategori', 'error');
  } finally { hideLoading(); }
}

async function deleteCategory(id) {
  if (!confirm('Hapus kategori ini?')) return;
  try {
    showLoading();
    // Cek apakah masih dipakai dosen
    const { count } = await _sb.from('lecturers').select('*', { count: 'exact', head: true })
      .eq('category_id', id).is('deleted_at', null);
    if (count > 0) {
      showToast('Kategori masih digunakan oleh ' + count + ' dosen', 'error');
      return;
    }

    const { error } = await _sb.from('categories')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    showToast('Kategori berhasil dihapus', 'success');
    loadCategories();
  } catch(err) {
    showToast(err.message || 'Gagal menghapus kategori', 'error');
  } finally { hideLoading(); }
}

function initCategoriesModule() {
  var addBtn = document.getElementById('addCategoryBtn');
  if (addBtn) addBtn.addEventListener('click', showAddCategoryModal);
  var closeBtn = document.getElementById('closeCategoryModal');
  if (closeBtn) closeBtn.addEventListener('click', closeCategoryModal);
  var cancelBtn = document.getElementById('cancelCategoryBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeCategoryModal);
  var saveBtn = document.getElementById('saveCategoryBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveCategory);
  var form = document.getElementById('categoryForm');
  if (form) form.addEventListener('submit', function(e) { e.preventDefault(); saveCategory(); });
  var modal = document.getElementById('categoryModal');
  if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeCategoryModal(); });
}
