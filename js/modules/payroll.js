/**
 * Payroll Module — Supabase
 */
var payrollData = [];

async function calculatePayroll() {
  var month = parseInt(document.getElementById('filterPayrollMonth').value);
  var year  = parseInt(document.getElementById('filterPayrollYear').value);
  if (!month || !year) { showToast('Pilih bulan dan tahun terlebih dahulu', 'error'); return; }
  if (!confirm('Hitung payroll untuk ' + getMonthName(month) + ' ' + year + '?\nData yang sudah ada akan diperbarui.')) return;

  try {
    showLoading();
    var result = await calculatePayrollLocal(month, year);
    showToast('Payroll berhasil dihitung (' + result.processed + ' dosen)', 'success');
    loadPayroll();
  } catch(err) {
    console.error('calculatePayroll error:', err);
    showToast(err.message || 'Gagal menghitung payroll', 'error');
  } finally { hideLoading(); }
}

async function loadPayroll() {
  var tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';
  try {
    var month = parseInt(document.getElementById('filterPayrollMonth').value);
    var year  = parseInt(document.getElementById('filterPayrollYear').value);

    const { data, error } = await _sb.from('payroll')
      .select('*, lecturers(name, nidn, category_id, categories(category_code))')
      .eq('period_month', month)
      .eq('period_year', year)
      .order('lecturer_id');

    if (error) throw error;
    payrollData = (data || []).map(function(p) {
      return Object.assign({}, p, {
        lecturer_name: p.lecturers?.name || '-',
        nidn:          p.lecturers?.nidn || '-',
        category_code: p.lecturers?.categories?.category_code || '-'
      });
    });
    // Urutkan berdasarkan nama dosen
    payrollData.sort(function(a, b) { return a.lecturer_name.localeCompare(b.lecturer_name, 'id'); });
    renderPayrollTable();
  } catch(err) {
    console.error('loadPayroll error:', err);
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:var(--space-8);color:var(--danger);">Gagal memuat data payroll</td></tr>';
    showToast('Gagal memuat data payroll', 'error');
  }
}

function renderPayrollTable() {
  var tbody = document.getElementById('payrollTableBody');
  if (!tbody) return;
  if (payrollData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:var(--space-8);">Belum ada data. Klik "Hitung Payroll" untuk menghitung.</td></tr>';
    return;
  }
  tbody.innerHTML = payrollData.map(function(p) {
    return '<tr>' +
      '<td><strong>' + escapeHtml(p.lecturer_name) + '</strong><br><small class="text-secondary">' + escapeHtml(p.nidn) + '</small></td>' +
      '<td><span class="badge badge-blue">' + escapeHtml(p.category_code) + '</span></td>' +
      '<td style="text-align:center;">' + (p.total_scheduled_hours||0) + '</td>' +
      '<td style="text-align:center;">' + (p.total_attended_hours||0) + '</td>' +
      '<td>' + formatCurrency(p.fixed_component_amount) + '</td>' +
      '<td>' + formatCurrency(p.attendance_component_amount) + '</td>' +
      '<td>' + formatCurrency(p.transportation_amount) + '</td>' +
      '<td><strong style="color:var(--primary-500);">' + formatCurrency(p.total_salary) + '</strong></td>' +
      '<td>' +
        '<button class="btn-icon" onclick="viewPayrollDetail(\'' + escapeHtml(p.id) + '\')" title="Detail">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>' +
        '</button>' +
        '<button class="btn-icon" onclick="printSlip(\'' + escapeHtml(p.id) + '\')" title="Cetak Slip">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function viewPayrollDetail(id) {
  var p = payrollData.find(function(x) { return x.id === id; });
  if (!p) return;
  document.getElementById('detailPayrollName').textContent     = p.lecturer_name;
  document.getElementById('detailPayrollName').dataset.id      = p.id;
  document.getElementById('detailPayrollNidn').textContent     = p.nidn;
  document.getElementById('detailPayrollKategori').textContent = p.category_code;
  document.getElementById('detailPayrollPeriode').textContent  = getMonthName(p.period_month) + ' ' + p.period_year;
  document.getElementById('detailJamJadwal').textContent = (p.total_scheduled_hours||0) + ' jam';
  document.getElementById('detailJamHadir').textContent  = (p.total_attended_hours||0)  + ' jam';
  document.getElementById('detailGajiTetap').textContent = formatCurrency(p.fixed_component_amount);
  document.getElementById('detailGajiHadir').textContent = formatCurrency(p.attendance_component_amount);
  document.getElementById('detailTransport').textContent = formatCurrency(p.transportation_amount);
  document.getElementById('detailTotalGaji').textContent = formatCurrency(p.total_salary);
  document.getElementById('payrollDetailModal').style.display = 'flex';
}

function closePayrollDetailModal() {
  document.getElementById('payrollDetailModal').style.display = 'none';
}

function printSlip(id) {
  var p = payrollData.find(function(x) { return x.id === id; });
  if (!p) return;
  var month = getMonthName(p.period_month), year = p.period_year;
  var win = window.open('', '_blank', 'width=600,height=700');
  if (!win) { showToast('Popup diblokir browser. Izinkan popup untuk mencetak.', 'warning'); return; }
  // Gunakan textContent-safe string (tidak ada HTML injection karena data di-escape)
  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Slip Gaji</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:30px;color:#111;}h2{text-align:center;margin-bottom:4px;}.sub{text-align:center;color:#555;margin-bottom:20px;}table{width:100%;border-collapse:collapse;}td{padding:8px 12px;border-bottom:1px solid #eee;}td:last-child{text-align:right;}.total td{font-weight:bold;font-size:16px;border-top:2px solid #333;border-bottom:none;}.footer{margin-top:40px;text-align:center;font-size:12px;color:#888;}</style>' +
    '</head><body>' +
    '<h2>SLIP GAJI DOSEN</h2>' +
    '<div class="sub">Ma\'had Aly An-Nur II | Periode: ' + escapeHtml(month) + ' ' + escapeHtml(String(year)) + '</div>' +
    '<table>' +
      '<tr><td>Nama</td><td>' + escapeHtml(p.lecturer_name) + '</td></tr>' +
      '<tr><td>NIDN</td><td>' + escapeHtml(p.nidn) + '</td></tr>' +
      '<tr><td>Kategori</td><td>' + escapeHtml(p.category_code) + '</td></tr>' +
      '<tr><td colspan="2" style="background:#f5f5f5;font-weight:bold;">Rincian Gaji</td></tr>' +
      '<tr><td>Jam Terjadwal</td><td>' + (p.total_scheduled_hours||0) + ' jam</td></tr>' +
      '<tr><td>Jam Hadir</td><td>' + (p.total_attended_hours||0) + ' jam</td></tr>' +
      '<tr><td>Gaji Tetap (50%)</td><td>' + formatCurrency(p.fixed_component_amount) + '</td></tr>' +
      '<tr><td>Gaji Kehadiran (50%)</td><td>' + formatCurrency(p.attendance_component_amount) + '</td></tr>' +
      '<tr><td>Uang Transportasi</td><td>' + formatCurrency(p.transportation_amount) + '</td></tr>' +
      '<tr class="total"><td>TOTAL GAJI</td><td>' + formatCurrency(p.total_salary) + '</td></tr>' +
    '</table>' +
    '<div class="footer">Dicetak pada ' + new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) + '</div>' +
    '</body></html>'
  );
  win.document.close(); win.print();
}

function exportToExcel() {
  if (payrollData.length === 0) { showToast('Tidak ada data untuk diekspor', 'warning'); return; }
  var month = getMonthName(parseInt(document.getElementById('filterPayrollMonth').value));
  var year  = document.getElementById('filterPayrollYear').value;
  var headers = ['NIDN','Nama Dosen','Kategori','Jam Jadwal','Jam Hadir','Gaji Tetap','Gaji Kehadiran','Transport','Total Gaji'];
  var rows = payrollData.map(function(p) {
    // escapeCsv mencegah data dengan koma merusak format CSV
    return [
      escapeCsv(p.nidn||''),
      escapeCsv(p.lecturer_name||''),
      escapeCsv(p.category_code||''),
      p.total_scheduled_hours||0,
      p.total_attended_hours||0,
      p.fixed_component_amount||0,
      p.attendance_component_amount||0,
      p.transportation_amount||0,
      p.total_salary||0
    ].join(',');
  });
  var csv  = [headers.join(',')].concat(rows).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'Payroll_' + month + '_' + year + '.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diekspor', 'success');
}

function initPayrollModule() {
  var calcBtn = document.getElementById('calculatePayrollBtn');
  if (calcBtn) calcBtn.addEventListener('click', calculatePayroll);
  var expBtn = document.getElementById('exportExcelBtn');
  if (expBtn) expBtn.addEventListener('click', exportToExcel);
  var closeDetailBtn = document.getElementById('closePayrollDetailModal');
  if (closeDetailBtn) closeDetailBtn.addEventListener('click', closePayrollDetailModal);
  var detailModal = document.getElementById('payrollDetailModal');
  if (detailModal) detailModal.addEventListener('click', function(e) { if (e.target === detailModal) closePayrollDetailModal(); });
}
