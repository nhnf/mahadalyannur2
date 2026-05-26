/**
 * Matkul Tarif Module — Supabase
 * Kategori per mata kuliah per semester
 * Tarif diambil dari categories.hourly_rate
 */

var matkulTarifData = [];
var categoriesData  = [];
var SEMESTERS = ['2','4','6','8'];

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function loadMatkulTarif() {
  var container = document.getElementById('matkulTarifContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></div>';

  try {
    const [mkRes, tarifRes, catRes] = await Promise.all([
      _sb.from('mata_kuliah').select('id, kode, nama').is('deleted_at', null).order('nama'),
      _sb.from('matkul_tarif').select('*'),
      _sb.from('categories').select('id, category_code, hourly_rate').is('deleted_at', null).order('category_code')
    ]);
    if (mkRes.error)    throw mkRes.error;
    if (tarifRes.error) throw tarifRes.error;
    if (catRes.error)   throw catRes.error;

    var matkuls    = mkRes.data    || [];
    matkulTarifData = tarifRes.data || [];
    categoriesData  = catRes.data   || [];

    // Build lookup: tarifMap[matkul_id][semester] = {id, category_id, hourly_rate}
    var tarifMap = {};
    matkulTarifData.forEach(function(t) {
      if (!tarifMap[t.mata_kuliah_id]) tarifMap[t.mata_kuliah_id] = {};
      tarifMap[t.mata_kuliah_id][t.semester] = t;
    });

    if (matkuls.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:var(--space-8);">Belum ada mata kuliah.</div>';
      return;
    }

    // Build opsi kategori untuk dropdown
    var catOptions = '<option value="">-- Pilih --</option>' +
      categoriesData.map(function(c) {
        return '<option value="' + c.id + '">' +
          c.category_code + ' (Rp ' + Number(c.hourly_rate).toLocaleString('id-ID') + '/jam)' +
          '</option>';
      }).join('');

    // Tabel: baris = matkul, kolom = semester
    var html = '<div style="overflow-x:auto;"><table class="table schedule-grid-table">';
    html += '<thead><tr>';
    html += '<th style="min-width:180px;">Mata Kuliah</th>';
    SEMESTERS.forEach(function(sm) {
      html += '<th style="text-align:center;min-width:160px;">Semester ' + sm +
        (sm === '2' ? ' <small style="font-weight:normal;">(2A &amp; 2B)</small>' : '') +
        '</th>';
    });
    html += '</tr></thead><tbody>';

    matkuls.forEach(function(mk) {
      html += '<tr>';
      html += '<td>' +
        '<strong>' + mk.nama + '</strong><br>' +
        '<small class="text-secondary" style="font-family:monospace;">' + mk.kode + '</small>' +
        '</td>';

      SEMESTERS.forEach(function(sm) {
        var tarif    = tarifMap[mk.id] && tarifMap[mk.id][sm];
        var catId    = tarif ? tarif.category_id : '';
        var tarifId  = tarif ? tarif.id : '';
        var rate     = tarif ? tarif.hourly_rate : '';

        // Cari category_code untuk tampilan
        var catObj   = categoriesData.find(function(c) { return c.id === catId; });
        var rateText = catObj ? 'Rp ' + Number(catObj.hourly_rate).toLocaleString('id-ID') : '';

        html += '<td style="padding:4px 8px;vertical-align:middle;">' +
          '<select class="select tarif-cat-select" ' +
            'data-matkul-id="' + mk.id + '" ' +
            'data-semester="' + sm + '" ' +
            'data-tarif-id="' + tarifId + '" ' +
            'style="font-size:13px;" ' +
            'onchange="updateTarifRateDisplay(this)">' +
            catOptions.replace('value="' + catId + '"', 'value="' + catId + '" selected') +
          '</select>' +
          '<div class="tarif-rate-display" style="font-size:11px;color:var(--text-tertiary);margin-top:2px;text-align:center;">' +
            rateText +
          '</div>' +
        '</td>';
      });

      html += '</tr>';
    });

    html += '</tbody></table></div>';

    // Legenda kategori
    html += '<div style="margin-top:var(--space-4);display:flex;gap:var(--space-4);flex-wrap:wrap;">';
    categoriesData.forEach(function(c) {
      html += '<span class="badge badge-blue">Kategori ' + c.category_code +
        ' = Rp ' + Number(c.hourly_rate).toLocaleString('id-ID') + '/jam</span>';
    });
    html += '</div>';

    // Tombol simpan
    html += '<div style="margin-top:var(--space-5);display:flex;justify-content:flex-end;gap:var(--space-3);">' +
      '<button class="btn btn-secondary btn-sm" onclick="loadMatkulTarif()">Reset</button>' +
      '<button class="btn btn-primary" onclick="saveAllTarif()">' +
        '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>' +
        ' Simpan Semua' +
      '</button>' +
    '</div>';

    container.innerHTML = html;

  } catch(err) {
    console.error('loadMatkulTarif error:', err);
    container.innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data tarif</div>';
    showToast('Gagal memuat data tarif', 'error');
  }
}

// Update tampilan tarif saat kategori dipilih
function updateTarifRateDisplay(selectEl) {
  var catId  = selectEl.value;
  var catObj = categoriesData.find(function(c) { return c.id === catId; });
  var display = selectEl.parentElement.querySelector('.tarif-rate-display');
  if (display) {
    display.textContent = catObj
      ? 'Rp ' + Number(catObj.hourly_rate).toLocaleString('id-ID') + '/jam'
      : '';
  }
}

// ── SAVE ALL ──────────────────────────────────────────────────────────────────
async function saveAllTarif() {
  var selects  = document.querySelectorAll('.tarif-cat-select');
  var toUpsert = [];
  var toDelete = [];

  selects.forEach(function(sel) {
    var catId   = sel.value;
    var tarifId = sel.dataset.tarifId;
    var mkId    = sel.dataset.matkulId;
    var sem     = sel.dataset.semester;

    if (!catId) {
      // Kosong → hapus tarif jika ada
      if (tarifId) toDelete.push(tarifId);
      return;
    }

    // Cari hourly_rate dari kategori
    var catObj = categoriesData.find(function(c) { return c.id === catId; });
    var rate   = catObj ? parseFloat(catObj.hourly_rate) : 0;

    var row = {
      mata_kuliah_id: mkId,
      semester:       sem,
      category_id:    catId,
      hourly_rate:    rate
    };
    if (tarifId) row.id = tarifId;
    toUpsert.push(row);
  });

  try {
    showLoading();

    // Hapus yang dikosongkan
    if (toDelete.length > 0) {
      const { error } = await _sb.from('matkul_tarif').delete().in('id', toDelete);
      if (error) throw error;
    }

    // Upsert yang diisi
    if (toUpsert.length > 0) {
      const { error } = await _sb.from('matkul_tarif').upsert(toUpsert, {
        onConflict: 'mata_kuliah_id,semester'
      });
      if (error) throw error;
    }

    showToast(toUpsert.length + ' tarif disimpan' + (toDelete.length > 0 ? ', ' + toDelete.length + ' dihapus' : ''), 'success');
    loadMatkulTarif();
  } catch(err) {
    console.error('saveAllTarif error:', err);
    showToast(err.message || 'Gagal menyimpan tarif', 'error');
  } finally { hideLoading(); }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function initMatkulTarifModule() {
  // tidak perlu event listener global
}
