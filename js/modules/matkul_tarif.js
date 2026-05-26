/**
 * Matkul Tarif Module â€” Supabase
 * Kategori per mata kuliah per semester
 * Tarif diambil dari categories.hourly_rate
 */

var matkulTarifData = [];
var categoriesData  = [];
var TARIF_SEMESTERS = ['2','4','6','8'];
var TARIF_SEM_LABEL = {'2':'2 (2A & 2B)', '4':'4', '6':'6', '8':'8'};

// â”€â”€ LOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadMatkulTarif() {
  var container = document.getElementById('matkulTarifContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></div>';

  try {
    const [mkRes, tarifRes, catRes] = await Promise.all([
      // Hanya matkul yang ada di jadwal aktif
      _sb.from('schedules')
        .select('mata_kuliah_id, mata_kuliah')
        .is('deleted_at', null)
        .not('mata_kuliah_id', 'is', null),
      _sb.from('matkul_tarif').select('*'),
      _sb.from('categories').select('id, category_code, hourly_rate').is('deleted_at', null).order('category_code')
    ]);
    if (mkRes.error)    throw mkRes.error;
    if (tarifRes.error) throw tarifRes.error;
    if (catRes.error)   throw catRes.error;

    // Deduplikasi matkul dari jadwal
    var mkSeen = {};
    var matkuls = [];
    (mkRes.data || []).forEach(function(s) {
      if (!mkSeen[s.mata_kuliah_id]) {
        mkSeen[s.mata_kuliah_id] = true;
        matkuls.push({ id: s.mata_kuliah_id, nama: s.mata_kuliah, kode: '' });
      }
    });
    // Sort by nama
    matkuls.sort(function(a,b) { return (a.nama||'').localeCompare(b.nama||''); });
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

    // ── Bungkus dengan data-table-wrapper seperti tabel lain ──────────────────
    var html = '<div class="data-table-wrapper">';

    // Header aksi
    html += '<div class="data-table-header" style="justify-content:space-between;align-items:center;">' +
      '<div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">';
    categoriesData.forEach(function(c) {
      html += '<span class="badge badge-blue" style="font-size:12px;">Kat ' + c.category_code +
        ' = ' + formatCurrency(c.hourly_rate) + '/jam</span>';
    });
    html += '</div>' +
      '<div style="display:flex;gap:var(--space-2);">' +
        '<button class="btn btn-secondary btn-sm" onclick="loadMatkulTarif()">Reset</button>' +
        '<button class="btn btn-primary btn-sm" onclick="saveAllTarif()">' +
          '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>' +
          ' Simpan Semua' +
        '</button>' +
      '</div>' +
    '</div>';

    // Tabel
    html += '<div class="table-container"><table class="table" style="table-layout:fixed;">';

    // Header
    html += '<thead><tr>';
    html += '<th style="width:200px;">Mata Kuliah</th>';
    TARIF_SEMESTERS.forEach(function(sm) {
      html += '<th style="text-align:center;">Semester ' + TARIF_SEM_LABEL[sm] + '</th>';
    });
    html += '</tr></thead><tbody>';

    matkuls.forEach(function(mk) {
      html += '<tr>';
      html += '<td><strong>' + mk.nama + '</strong></td>';

      TARIF_SEMESTERS.forEach(function(sm) {
        var tarif   = tarifMap[mk.id] && tarifMap[mk.id][sm];
        var catId   = tarif ? tarif.category_id : '';
        var tarifId = tarif ? tarif.id : '';
        var catObj  = categoriesData.find(function(c) { return c.id === catId; });
        var rateText = catObj ? formatCurrency(catObj.hourly_rate) + '/jam' : '';

        html += '<td style="text-align:center;vertical-align:middle;padding:var(--space-3) var(--space-4);">';

        if (!tarif) {
          // Tidak ada jadwal untuk kombinasi ini — tampilkan tanda strip
          html += '<span style="color:var(--text-tertiary);font-size:13px;">—</span>';
        } else {
          html += '<select class="select tarif-cat-select" ' +
              'data-matkul-id="' + mk.id + '" ' +
              'data-semester="' + sm + '" ' +
              'data-tarif-id="' + tarifId + '" ' +
              'style="font-size:13px;height:36px;" ' +
              'onchange="updateTarifRateDisplay(this)">' +
              catOptions.replace('value="' + catId + '"', 'value="' + catId + '" selected') +
            '</select>' +
            '<div class="tarif-rate-display" style="font-size:11px;color:var(--text-tertiary);margin-top:3px;">' +
              rateText +
            '</div>';
        }

        html += '</td>';
      });

      html += '</tr>';
    });

    html += '</tbody></table></div></div>'; // end table-container + data-table-wrapper

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

// â”€â”€ SAVE ALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      // Kosong â†’ hapus tarif jika ada
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

// â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initMatkulTarifModule() {
  // tidak perlu event listener global
}

