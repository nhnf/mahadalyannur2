/**
 * Aturan Kategori Dosen per Semester Module
 * Mengelola aturan prioritas kategori dosen per semester (required/preferred/alternative)
 * Tabel: semester_category_rules
 */

var scrData = [];
var editingScrId = null;

function initSemesterCategoryRulesModule() {
  var loadBtn = document.getElementById('scrLoadBtn');
  var addBtn = document.getElementById('addScrBtn');
  var saveBtn = document.getElementById('saveScrBtn');
  var cancelBtn = document.getElementById('cancelScrBtn');
  var closeBtn = document.getElementById('closeScrModal');

  if (loadBtn) loadBtn.addEventListener('click', loadSemesterCategoryRules);
  if (addBtn) addBtn.addEventListener('click', function () { openScrModal(); });
  if (saveBtn) saveBtn.addEventListener('click', saveSemesterCategoryRule);
  if (cancelBtn) cancelBtn.addEventListener('click', closeScrModal);
  if (closeBtn) closeBtn.addEventListener('click', closeScrModal);

  var modal = document.getElementById('scrModal');
  if (modal) modal.addEventListener('click', function (e) { if (e.target === this) closeScrModal(); });
}

async function populateScrSemesters() {
  await SimkurmaHelpers.fetchSemesters();
  SimkurmaHelpers.populateSemesterDropdown('scrSemesterSelect', SimkurmaCache.semesters, 'Pilih Semester');
}

async function loadSemesterCategoryRules() {
  var semId = document.getElementById('scrSemesterSelect').value;
  if (!semId) {
    showToast('Pilih semester terlebih dahulu', 'warning');
    return;
  }

  showLoading();
  try {
    var { data, error } = await _sb
      .from('semester_category_rules')
      .select('*, semesters:semester_id (id, number, name), lecturer_categories:lecturer_category_id (id, name, level)')
      .eq('semester_id', semId)
      .is('deleted_at', null)
      .order('priority_weight', { ascending: false });

    if (error) throw error;
    scrData = data || [];
    renderScrTable();
  } catch (err) {
    console.error('Load semester category rules error:', err);
    showToast('Gagal memuat data: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderScrTable() {
  var tbody = document.getElementById('scrTableBody');
  if (!tbody) return;

  if (!scrData.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);">' +
      '<div class="empty-state"><div class="empty-state-title">Belum Ada Aturan</div>' +
      '<div class="empty-state-description">Tambahkan aturan kategori dosen untuk semester ini</div></div></td></tr>';
    return;
  }

  var ruleTypeLabels = { required: 'Wajib', preferred: 'Utama', alternative: 'Alternatif' };
  var ruleTypeBadge = { required: 'badge-danger', preferred: 'badge-success', alternative: 'badge-neutral' };

  tbody.innerHTML = scrData.map(function (item) {
    var sem = item.semesters || {};
    var cat = item.lecturer_categories || {};
    var ruleLabel = ruleTypeLabels[item.rule_type] || item.rule_type || 'preferred';
    var ruleBadge = ruleTypeBadge[item.rule_type] || 'badge-neutral';

    return '<tr>' +
      '<td>Semester ' + escapeHtml(String(sem.number || '')) + ' — ' + escapeHtml(sem.name || '') + '</td>' +
      '<td><strong>' + escapeHtml(cat.name || '—') + '</strong></td>' +
      '<td><span class="badge ' + ruleBadge + '">' + escapeHtml(ruleLabel) + '</span></td>' +
      '<td style="text-align:center;">' + (item.priority_weight || 0) + '</td>' +
      '<td>' + escapeHtml(item.notes || '—') + '</td>' +
      '<td>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-sm btn-ghost" onclick="openScrModalById(\'' + item.id + '\')" title="Edit">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
          '</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="deleteSemesterCategoryRule(\'' + item.id + '\')" title="Hapus" style="color:var(--danger);">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function openScrModalById(id) {
  var data = scrData.find(function (item) { return item.id === id; });
  openScrModal(data);
}

async function openScrModal(data) {
  editingScrId = data ? data.id : null;
  var modal = document.getElementById('scrModal');
  var title = document.getElementById('scrModalTitle');

  if (title) title.textContent = data ? 'Edit Aturan Kategori' : 'Tambah Aturan Kategori';

  // Populate lecturer categories dropdown
  try {
    var { data: categories } = await _sb.from('lecturer_categories').select('*').order('level', { ascending: true });
    var catSelect = document.getElementById('scr_lecturer_category_id');
    if (catSelect) {
      catSelect.innerHTML = '<option value="">Pilih Kategori Dosen</option>';
      (categories || []).forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + (c.level ? ' (Level ' + c.level + ')' : '');
        catSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Error fetching categories:', e);
  }

  if (data) {
    var catSel = document.getElementById('scr_lecturer_category_id');
    var ruleSel = document.getElementById('scr_rule_type');
    var weightIn = document.getElementById('scr_priority_weight');
    var notesIn = document.getElementById('scr_notes');

    if (catSel) catSel.value = data.lecturer_category_id || '';
    if (ruleSel) ruleSel.value = data.rule_type || 'preferred';
    if (weightIn) weightIn.value = data.priority_weight || 50;
    if (notesIn) notesIn.value = data.notes || '';
  } else {
    var ruleSel2 = document.getElementById('scr_rule_type');
    var weightIn2 = document.getElementById('scr_priority_weight');
    var notesIn2 = document.getElementById('scr_notes');
    if (ruleSel2) ruleSel2.value = 'preferred';
    if (weightIn2) weightIn2.value = '50';
    if (notesIn2) notesIn2.value = '';
  }

  if (modal) modal.style.display = 'flex';
}

function closeScrModal() {
  var modal = document.getElementById('scrModal');
  if (modal) modal.style.display = 'none';
  editingScrId = null;
}

async function saveSemesterCategoryRule() {
  var semId = document.getElementById('scrSemesterSelect').value;
  var catId = document.getElementById('scr_lecturer_category_id').value;
  var ruleType = document.getElementById('scr_rule_type').value;
  var weight = parseInt(document.getElementById('scr_priority_weight').value) || 50;
  var notes = document.getElementById('scr_notes').value.trim();

  if (!semId || !catId) {
    showToast('Lengkapi semua field yang wajib', 'warning');
    return;
  }

  showLoading();
  try {
    var payload = {
      semester_id: semId,
      lecturer_category_id: catId,
      rule_type: ruleType,
      priority_weight: weight,
      notes: notes || null
    };

    if (editingScrId) {
      var { error } = await _sb.from('semester_category_rules').update(payload).eq('id', editingScrId);
      if (error) throw error;
      showToast('Aturan kategori berhasil diperbarui', 'success');
    } else {
      var { error } = await _sb.from('semester_category_rules').insert(payload);
      if (error) throw error;
      showToast('Aturan kategori berhasil ditambahkan', 'success');
    }
    closeScrModal();
    await loadSemesterCategoryRules();
  } catch (err) {
    console.error('Save semester category rule error:', err);
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function deleteSemesterCategoryRule(id) {
  if (!confirm('Yakin ingin menghapus aturan kategori ini?')) return;
  showLoading();
  try {
    var { error } = await _sb.from('semester_category_rules').delete().eq('id', id);
    if (error) throw error;
    showToast('Aturan kategori berhasil dihapus', 'success');
    await loadSemesterCategoryRules();
  } catch (err) {
    console.error('Delete semester category rule error:', err);
    showToast('Gagal menghapus: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
