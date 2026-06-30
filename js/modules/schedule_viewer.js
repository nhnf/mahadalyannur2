/**
 * Modul: Penampil Jadwal Per Kelas & Per Dosen (§11.23, §17.18)
 * Menampilkan grid jadwal:
 *  - Per Kelas (hari × jam, menampilkan mata kuliah + dosen)
 *  - Per Dosen (hari × jam, menampilkan kelas + mata kuliah)
 */
(function() {
  let currentViewMode = 'classroom';
  const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  async function populateViewerDropdowns() {
    const aySel = document.getElementById('svAcademicYearSelect');
    if (aySel && SimkurmaCache?.academicYears) {
      aySel.innerHTML = '<option value="">Pilih Tahun Akademik</option>';
      SimkurmaCache.academicYears.forEach(ay => {
        aySel.innerHTML += `<option value="${ay.id}">${ay.name}</option>`;
      });
    }

    const clSel = document.getElementById('svClassroomSelect');
    if (clSel && SimkurmaCache?.classrooms) {
      clSel.innerHTML = '<option value="">Semua Kelas</option>';
      SimkurmaCache.classrooms.forEach(c => {
        clSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }

    const lecSel = document.getElementById('svLecturerSelect');
    if (lecSel && SimkurmaCache?.lecturers) {
      lecSel.innerHTML = '<option value="">Semua Dosen</option>';
      SimkurmaCache.lecturers.forEach(l => {
        lecSel.innerHTML += `<option value="${l.id}">${l.name}</option>`;
      });
    }
  }

  function switchView(mode) {
    currentViewMode = mode;
    document.getElementById('svClassroomFilter').style.display = mode === 'classroom' ? '' : 'none';
    document.getElementById('svLecturerFilter').style.display = mode === 'lecturer' ? '' : 'none';

    document.getElementById('svClassroomViewTab').className = mode === 'classroom' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost';
    document.getElementById('svLecturerViewTab').className = mode === 'lecturer' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost';
    document.getElementById('svClassroomViewTab').style.borderRadius = 'var(--radius-md)';
    document.getElementById('svLecturerViewTab').style.borderRadius = 'var(--radius-md)';
  }

  async function loadScheduleView() {
    const ayId = document.getElementById('svAcademicYearSelect')?.value;
    const gridContainer = document.getElementById('svGridContainer');
    if (!gridContainer) return;

    if (!ayId) {
      gridContainer.innerHTML = `<div class="empty-state"><div class="empty-state-title">Pilih Tahun Akademik</div><div class="empty-state-description">Pilih tahun akademik untuk melihat jadwal</div></div>`;
      return;
    }

    gridContainer.innerHTML = '<div style="text-align:center;padding:var(--space-8);"><div class="spinner spinner-lg"></div></div>';

    try {
      if (currentViewMode === 'classroom') {
        await loadClassroomSchedule(ayId, gridContainer);
      } else {
        await loadLecturerSchedule(ayId, gridContainer);
      }
    } catch (e) {
      console.error('[ScheduleViewer] Error:', e);
      gridContainer.innerHTML = `<div class="empty-state"><div class="empty-state-title" style="color:var(--danger);">Gagal Memuat</div><div class="empty-state-description">${e.message}</div></div>`;
    }
  }

  async function loadClassroomSchedule(ayId, container) {
    const classroomId = document.getElementById('svClassroomSelect')?.value;

    let query = _sb
      .from('v_schedule_per_classroom')
      .select('*')
      .eq('academic_year_id', ayId);

    if (classroomId) query = query.eq('classroom_id', classroomId);

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Belum Ada Jadwal</div><div class="empty-state-description">Generate jadwal terlebih dahulu untuk tahun akademik ini</div></div>`;
      return;
    }

    // Group by classroom + class_letter
    const groups = {};
    data.forEach(r => {
      const key = `${r.classroom_name} ${r.class_letter || ''}`.trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    // Load time slots
    const { data: tsData } = await _sb.from('time_slots').select('id, start_time, end_time, session_number').is('deleted_at', null).order('start_time');
    const timeSlots = tsData || [];

    let html = '';
    Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([className, slots]) => {
      html += renderScheduleGrid(className, slots, timeSlots, 'classroom');
    });

    container.innerHTML = html || '<div class="empty-state"><div class="empty-state-title">Tidak ada data</div></div>';
  }

  async function loadLecturerSchedule(ayId, container) {
    const lecturerId = document.getElementById('svLecturerSelect')?.value;

    let query = _sb
      .from('v_schedule_per_lecturer')
      .select('*')
      .eq('academic_year_id', ayId);

    if (lecturerId) query = query.eq('lecturer_id', lecturerId);

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Belum Ada Jadwal</div><div class="empty-state-description">Generate jadwal terlebih dahulu untuk tahun akademik ini</div></div>`;
      return;
    }

    const groups = {};
    data.forEach(r => {
      const key = r.lecturer_name || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    const { data: tsData } = await _sb.from('time_slots').select('id, start_time, end_time, session_number').is('deleted_at', null).order('start_time');
    const timeSlots = tsData || [];

    let html = '';
    Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([lectName, slots]) => {
      html += renderScheduleGrid(lectName, slots, timeSlots, 'lecturer');
    });

    container.innerHTML = html || '<div class="empty-state"><div class="empty-state-title">Tidak ada data</div></div>';
  }

  function renderScheduleGrid(title, slots, timeSlots, mode) {
    // Build day → slotIndex → [entries]
    const grid = {};
    dayOrder.forEach(d => { grid[d] = {}; });
    timeSlots.forEach((ts, idx) => {
      dayOrder.forEach(d => { grid[d][idx] = []; });
    });

    slots.forEach(s => {
      const day = s.day_name;
      const slotIdx = timeSlots.findIndex(ts => ts.start_time === s.start_time && ts.end_time === s.end_time);
      if (day && slotIdx >= 0 && grid[day]) {
        grid[day][slotIdx].push(s);
      }
    });

    let tableHtml = `
      <div class="card mb-4" style="overflow:hidden;">
        <div class="card-header" style="background:var(--primary-50);">
          <h3 class="card-title" style="font-size:14px;">📋 ${title}</h3>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto;">
          <table class="table" style="margin:0;font-size:12px;">
            <thead>
              <tr>
                <th style="white-space:nowrap;min-width:80px;background:var(--surface-1);">Jam</th>
                ${dayOrder.map(d => `<th style="text-align:center;min-width:120px;background:var(--surface-1);">${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody>`;

    timeSlots.forEach((ts, idx) => {
      const timeLabel = `${ts.start_time?.substring(0,5)} - ${ts.end_time?.substring(0,5)}`;
      const isNight = ts.start_time >= '19:00';
      const rowBg = isNight ? 'background:var(--night-bg,rgba(251,191,36,0.05));' : '';

      tableHtml += `<tr style="${rowBg}">
        <td style="white-space:nowrap;font-weight:600;font-size:11px;">${timeLabel}</td>`;

      dayOrder.forEach(day => {
        const entries = grid[day][idx] || [];
        if (entries.length === 0) {
          tableHtml += '<td style="text-align:center;color:var(--text-tertiary);">-</td>';
        } else {
          const cellContent = entries.map(e => {
            const statusColor = e.status === 'locked' ? 'var(--success)' : e.status === 'final' ? 'var(--info)' : 'var(--text-tertiary)';
            if (mode === 'classroom') {
              return `<div style="margin-bottom:2px;">
                <div style="font-weight:600;font-size:11px;">${e.course_code || e.course_name || '?'}</div>
                <div style="font-size:10px;color:var(--text-secondary);">${e.lecturer_name || '-'}</div>
                <div style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block;margin-top:1px;" title="${e.status}"></div>
              </div>`;
            } else {
              return `<div style="margin-bottom:2px;">
                <div style="font-weight:600;font-size:11px;">${e.course_code || e.course_name || '?'}</div>
                <div style="font-size:10px;color:var(--text-secondary);">${e.classroom_name || ''} ${e.class_letter || ''}</div>
                <div style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block;margin-top:1px;" title="${e.status}"></div>
              </div>`;
            }
          }).join('');
          tableHtml += `<td style="padding:4px;">${cellContent}</td>`;
        }
      });

      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table></div></div>';
    return tableHtml;
  }

  window.ScheduleViewerModule = {
    init: async function() {
      await populateViewerDropdowns();
      document.getElementById('svClassroomViewTab')?.addEventListener('click', () => switchView('classroom'));
      document.getElementById('svLecturerViewTab')?.addEventListener('click', () => switchView('lecturer'));
      document.getElementById('svLoadBtn')?.addEventListener('click', loadScheduleView);
    },
    load: loadScheduleView,
    populateDropdowns: populateViewerDropdowns
  };
})();
