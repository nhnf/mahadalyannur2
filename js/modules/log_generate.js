/**
 * Modul: Log Generate (§11.22)
 * Menampilkan log riwayat generate jadwal + detail error
 * Tabel: schedule_run_logs
 */
(function() {
  let logData = [];

  async function loadGenerateLogs() {
    const tbody = document.getElementById('logGenTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-8);"><div class="spinner"></div></td></tr>';

    try {
      const ayId = document.getElementById('logGenAcademicYearSelect')?.value;
      let query = _sb
        .from('schedule_run_logs')
        .select('id, academic_year_id, action, detail, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (ayId) query = query.eq('academic_year_id', ayId);

      const { data, error } = await query;
      if (error) throw error;
      logData = data || [];

      if (logData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-8);">
          <div class="empty-state">
            <div class="empty-state-title">Belum Ada Log</div>
            <div class="empty-state-description">Jalankan Generate Jadwal terlebih dahulu</div>
          </div>
        </td></tr>`;
        return;
      }

      const ayMap = {};
      if (SimkurmaCache?.academicYears) {
        SimkurmaCache.academicYears.forEach(ay => { ayMap[ay.id] = ay.name; });
      }

      tbody.innerHTML = logData.map(r => {
        let detailText = '';
        try {
          const d = JSON.parse(r.detail || '{}');
          if (r.action === 'generate') {
            detailText = `${d.total_slots || 0} slot dibuat, ${d.unscheduled_count || 0} MK terlewat`;
            if (d.conflicts?.length) detailText += `, ${d.conflicts.length} konflik`;
          } else if (r.action === 'finalize_batch') {
            detailText = `${d.finalized_count || 0} slot di-finalize (batch ${d.batch_size})`;
          } else if (r.action === 'lock_schedule') {
            detailText = `${d.locked_count || 0} slot dikunci`;
          } else if (r.action === 'unlock_schedule') {
            detailText = `${d.unlocked_count || 0} slot dibuka kunci`;
          } else if (r.action === 'delete_draft') {
            detailText = `${d.deleted_count || 0} slot draft dihapus`;
          } else {
            detailText = r.detail || '-';
          }
        } catch { detailText = r.detail || '-'; }

        const actionLabel = {
          'generate': '<span class="badge badge-info">Generate</span>',
          'finalize_batch': '<span class="badge badge-success">Finalisasi</span>',
          'lock_schedule': '<span class="badge badge-warning">Kunci</span>',
          'unlock_schedule': '<span class="badge badge-secondary">Buka Kunci</span>',
          'delete_draft': '<span class="badge badge-danger">Hapus Draft</span>',
          'auto_generate': '<span class="badge badge-info">Auto Generate</span>',
        }[r.action] || `<span class="badge badge-secondary">${r.action}</span>`;

        const dateStr = new Date(r.created_at).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        return `<tr>
          <td style="font-size:12px;color:var(--text-secondary);">${dateStr}</td>
          <td>${ayMap[r.academic_year_id] || r.academic_year_id || '-'}</td>
          <td>${actionLabel}</td>
          <td style="font-size:13px;">${detailText}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="viewLogDetail('${r.id}')" title="Detail">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
          </td>
        </tr>`;
      }).join('');
    } catch (e) {
      console.error('[LogGenerate] Error:', e);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:var(--space-8);">Gagal memuat log: ${e.message}</td></tr>`;
    }
  }

  window.viewLogDetail = function(logId) {
    const log = logData.find(r => r.id === logId);
    if (!log) return;
    let detailObj;
    try { detailObj = JSON.parse(log.detail || '{}'); } catch { detailObj = { raw: log.detail }; }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h2 class="modal-title">Detail Log Generate</h2>
          <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <pre style="background:var(--surface-2);padding:var(--space-3);border-radius:var(--radius-md);font-size:12px;max-height:400px;overflow:auto;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(detailObj, null, 2)}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Tutup</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  };

  async function populateLogGenAcademicYears() {
    const sel = document.getElementById('logGenAcademicYearSelect');
    if (!sel || !SimkurmaCache?.academicYears) return;
    sel.innerHTML = '<option value="">Semua Tahun</option>';
    SimkurmaCache.academicYears.forEach(ay => {
      sel.innerHTML += `<option value="${ay.id}">${ay.name}</option>`;
    });
  }

  // Export sebagai modul global
  window.GenerateLogModule = {
    init: async function() {
      await populateLogGenAcademicYears();
      const loadBtn = document.getElementById('logGenLoadBtn');
      if (loadBtn) loadBtn.addEventListener('click', loadGenerateLogs);
    },
    load: loadGenerateLogs,
    populateDropdowns: populateLogGenAcademicYears
  };
})();
