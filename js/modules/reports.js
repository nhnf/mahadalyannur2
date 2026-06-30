/**
 * Modul: Laporan (§11.23)
 * Menampilkan:
 *  - Rekap beban dosen per minggu
 *  - Daftar mata kuliah belum terjadwal
 *  - Filter berdasarkan Tahun Akademik
 * Views: v_lecturer_workload, v_unscheduled_courses
 */
(function() {
  let workloadData = [];
  let unscheduledData = [];

  async function populateReportsAcademicYears() {
    const sel = document.getElementById('reportAcademicYearSelect');
    if (!sel || !SimkurmaCache?.academicYears) return;
    sel.innerHTML = '<option value="">Pilih Tahun Akademik</option>';
    SimkurmaCache.academicYears.forEach(ay => {
      sel.innerHTML += `<option value="${ay.id}">${ay.name}</option>`;
    });
  }

  function switchReportTab(tabName) {
    document.getElementById('reportWorkloadPanel').style.display = tabName === 'workload' ? '' : 'none';
    document.getElementById('reportUnscheduledPanel').style.display = tabName === 'unscheduled' ? '' : 'none';

    document.getElementById('reportWorkloadTab').className = tabName === 'workload' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost';
    document.getElementById('reportUnscheduledTab').className = tabName === 'unscheduled' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost';
    document.getElementById('reportWorkloadTab').style.borderRadius = 'var(--radius-md)';
    document.getElementById('reportUnscheduledTab').style.borderRadius = 'var(--radius-md)';
  }

  async function loadWorkloadReport() {
    const ayId = document.getElementById('reportAcademicYearSelect')?.value;
    const tbody = document.getElementById('workloadTableBody');
    if (!tbody) return;
    if (!ayId) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);"><div class="empty-state"><div class="empty-state-title">Pilih Tahun Akademik</div><div class="empty-state-description">Pilih tahun akademik untuk menampilkan rekap beban dosen</div></div></td></tr>';
      return;
    }
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';

    try {
      const { data, error } = await _sb
        .from('v_lecturer_workload')
        .select('*')
        .eq('academic_year_id', ayId)
        .order('total_slots_per_week', { ascending: false });

      if (error) throw error;
      workloadData = data || [];

      if (workloadData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--space-8);"><div class="empty-state"><div class="empty-state-title">Belum Ada Data</div><div class="empty-state-description">Generate jadwal terlebih dahulu untuk melihat rekap beban dosen</div></div></td></tr>';
        return;
      }

      // Summary stats
      const totalDosen = workloadData.length;
      const avgSlots = Math.round(workloadData.reduce((s, r) => s + (r.total_slots_per_week || 0), 0) / totalDosen);
      const maxDosen = workloadData[0];
      document.getElementById('workloadSummary').innerHTML = `
        <div class="stat-card" style="border:1px solid var(--card-border);">
          <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:4px;">Total Dosen Mengajar</div>
          <div style="font-size:24px;font-weight:700;color:var(--primary-600);">${totalDosen}</div>
        </div>
        <div class="stat-card" style="border:1px solid var(--card-border);">
          <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:4px;">Rata-rata Jam/Minggu</div>
          <div style="font-size:24px;font-weight:700;color:var(--info);">${avgSlots}</div>
        </div>
        <div class="stat-card" style="border:1px solid var(--card-border);">
          <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:4px;">Beban Tertinggi</div>
          <div style="font-size:16px;font-weight:700;color:var(--warning);">${maxDosen?.lecturer_name || '-'} (${maxDosen?.total_slots_per_week || 0} slot)</div>
        </div>
      `;

      tbody.innerHTML = workloadData.map(r => {
        let overloadClass = '';
        if (r.total_slots_per_week > 20) overloadClass = 'style="background:var(--danger-bg);"';
        else if (r.total_slots_per_week > 15) overloadClass = 'style="background:var(--warning-bg);"';

        return `<tr ${overloadClass}>
          <td style="font-weight:600;">${r.lecturer_name || '-'}</td>
          <td><code style="font-size:11px;">${r.nidn || '-'}</code></td>
          <td>${r.category_name || '-'}</td>
          <td style="text-align:center;font-weight:700;">${r.total_slots_per_week || 0}</td>
          <td style="text-align:center;">${r.total_courses || 0}</td>
          <td style="font-size:12px;color:var(--text-secondary);">P:${r.morning_count || 0} S:${r.afternoon_count || 0} M:${r.evening_count || 0}</td>
          <td>${r.total_slots_per_week > 20 ? '<span class="badge badge-danger">Overload</span>' : r.total_slots_per_week > 15 ? '<span class="badge badge-warning">Tinggi</span>' : '<span class="badge badge-success">Normal</span>'}</td>
        </tr>`;
      }).join('');
    } catch (e) {
      console.error('[Reports] Workload error:', e);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:var(--space-8);">Gagal memuat data: ${e.message}</td></tr>`;
    }
  }

  async function loadUnscheduledReport() {
    const ayId = document.getElementById('reportAcademicYearSelect')?.value;
    const tbody = document.getElementById('unscheduledTableBody');
    if (!tbody) return;
    if (!ayId) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);"><div class="empty-state"><div class="empty-state-title">Pilih Tahun Akademik</div><div class="empty-state-description">Pilih tahun akademik terlebih dahulu</div></div></td></tr>';
      return;
    }
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';

    try {
      const { data, error } = await _sb
        .from('v_unscheduled_courses')
        .select('*')
        .eq('academic_year_id', ayId)
        .order('classroom_name');

      if (error) throw error;
      unscheduledData = data || [];

      if (unscheduledData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--space-8);"><div class="empty-state"><div class="empty-state-icon" style="color:var(--success);">✓</div><div class="empty-state-title">Semua Mata Kuliah Terjadwal</div><div class="empty-state-description">Tidak ada mata kuliah yang belum terjadwal untuk tahun akademik ini</div></div></td></tr>';
        return;
      }

      document.getElementById('unscheduledSummary').innerHTML = `
        <div class="card" style="background:var(--warning-bg);border-color:var(--warning);margin-bottom:var(--space-4);">
          <div class="card-body" style="padding:var(--space-3) var(--space-4);">
            <p style="margin:0;font-size:13px;color:var(--warning-text);">
              ⚠️ Ditemukan <strong>${unscheduledData.length}</strong> mata kuliah yang belum terjadwal lengkap
            </p>
          </div>
        </div>
      `;

      tbody.innerHTML = unscheduledData.map(r => `
        <tr>
          <td style="font-weight:600;">${r.classroom_name || '-'} ${r.class_letter || ''}</td>
          <td><code style="font-size:11px;">${r.course_code || '-'}</code></td>
          <td>${r.course_name || '-'}</td>
          <td style="text-align:center;">${r.sks || 0}</td>
          <td style="text-align:center;">${r.sessions_per_week || 0}</td>
          <td style="text-align:center;">
            <span class="badge badge-danger">${r.remaining_sessions || '?'} sesi kurang</span>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error('[Reports] Unscheduled error:', e);
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:var(--space-8);">Gagal memuat data: ${e.message}</td></tr>`;
    }
  }

  window.exportWorkloadCSV = function() {
    if (!workloadData.length) { alert('Tidak ada data untuk diexport.'); return; }
    const header = 'Dosen,NIDN,Kategori,Total Jam/Minggu,Total MK,Pagi,Siang,Malam,Status\n';
    const rows = workloadData.map(r =>
      `"${r.lecturer_name}","${r.nidn || ''}","${r.category_name || ''}",${r.total_slots_per_week},${r.total_courses},${r.morning_count || 0},${r.afternoon_count || 0},${r.evening_count || 0},"${r.total_slots_per_week > 20 ? 'Overload' : r.total_slots_per_week > 15 ? 'Tinggi' : 'Normal'}"`
    ).join('\n');
    downloadCSV(header + rows, 'rekap_beban_dosen.csv');
  };

  window.exportUnscheduledCSV = function() {
    if (!unscheduledData.length) { alert('Tidak ada data untuk diexport.'); return; }
    const header = 'Kelas,Kode MK,Mata Kuliah,SKS,Sesi/Minggu,Sesi Kurang\n';
    const rows = unscheduledData.map(r =>
      `"${r.classroom_name} ${r.class_letter || ''}","${r.course_code || ''}","${r.course_name}",${r.sks},${r.sessions_per_week},${r.remaining_sessions}`
    ).join('\n');
    downloadCSV(header + rows, 'mk_belum_terjadwal.csv');
  };

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  window.ReportsModule = {
    init: async function() {
      await populateReportsAcademicYears();
      document.getElementById('reportWorkloadTab')?.addEventListener('click', () => switchReportTab('workload'));
      document.getElementById('reportUnscheduledTab')?.addEventListener('click', () => switchReportTab('unscheduled'));
      document.getElementById('reportLoadWorkloadBtn')?.addEventListener('click', loadWorkloadReport);
      document.getElementById('reportLoadUnscheduledBtn')?.addEventListener('click', loadUnscheduledReport);
    },
    loadWorkload: loadWorkloadReport,
    loadUnscheduled: loadUnscheduledReport,
    populateDropdowns: populateReportsAcademicYears
  };
})();
