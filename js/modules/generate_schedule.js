/**
 * Generate Jadwal Module
 * Memicu edge function generate_schedule dan menampilkan hasilnya
 * Fitur: Filter kelas, preview hasil, konfirmasi generate
 */

var generatedScheduleData = [];
var gjSelectedAcademicYearId = null;
var gjSelectedClassroomId = null;
var gjSelectedSemesterId = null;

function initGenerateJadwalModule() {
  var aySelect = document.getElementById('gjAcademicYearSelect');
  var classSelect = document.getElementById('gjClassroomSelect');
  var semSelect = document.getElementById('gjSemesterSelect');
  var genBtn = document.getElementById('generateScheduleBtn');
  var viewBtn = document.getElementById('viewScheduleBtn');
  var clearBtn = document.getElementById('clearScheduleBtn');

  if (aySelect) aySelect.addEventListener('change', onGjAcademicYearChange);
  if (classSelect) classSelect.addEventListener('change', onGjClassroomChange);
  if (semSelect) semSelect.addEventListener('change', onGjSemesterChange);
  if (genBtn) genBtn.addEventListener('click', generateSchedule);
  if (viewBtn) viewBtn.addEventListener('click', viewExistingSchedule);
  if (clearBtn) clearBtn.addEventListener('click', clearScheduleView);
}

async function populateGjAcademicYears() {
  var sel = document.getElementById('gjAcademicYearSelect');
  if (!sel) return;
  await SimkurmaHelpers.fetchAcademicYears();
  sel.innerHTML = '<option value="">Pilih Tahun Akademik</option>';
  SimkurmaCache.academicYears.forEach(function (ay) {
    var opt = document.createElement('option');
    opt.value = ay.id;
    opt.textContent = ay.name + (ay.is_active ? ' (Aktif)' : '');
    if (ay.is_active) opt.selected = true;
    sel.appendChild(opt);
  });
  if (sel.value) onGjAcademicYearChange();
}

async function onGjAcademicYearChange() {
  gjSelectedAcademicYearId = document.getElementById('gjAcademicYearSelect').value || null;
  if (!gjSelectedAcademicYearId) return;

  // Fetch semesters
  await SimkurmaHelpers.fetchSemesters();
  var semSel = document.getElementById('gjSemesterSelect');
  if (semSel) {
    semSel.innerHTML = '<option value="">Semua Semester</option>';
    SimkurmaCache.semesters.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = 'Semester ' + s.number + ' — ' + s.name;
      semSel.appendChild(opt);
    });
  }

  // Fetch classrooms
  await SimkurmaHelpers.fetchClassrooms({ academic_year_id: gjSelectedAcademicYearId });
  populateGjClassrooms();
}

function populateGjClassrooms(filterSemesterId) {
  var sel = document.getElementById('gjClassroomSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Semua Kelas</option>';
  var classrooms = SimkurmaCache.classrooms;
  if (filterSemesterId) {
    var sem = SimkurmaCache.semesters.find(function (s) { return s.id === filterSemesterId; });
    if (sem) {
      classrooms = classrooms.filter(function (c) { return c.semester_number === sem.number; });
    }
  }
  classrooms.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name + (c.parallel ? ' ' + c.parallel : '') + ' (Sem ' + c.semester_number + ', ' + (c.gender_type === 'putri' ? 'Putri' : 'Putra') + ')';
    sel.appendChild(opt);
  });
}

function onGjSemesterChange() {
  gjSelectedSemesterId = document.getElementById('gjSemesterSelect').value || null;
  populateGjClassrooms(gjSelectedSemesterId);
}

function onGjClassroomChange() {
  gjSelectedClassroomId = document.getElementById('gjClassroomSelect').value || null;
}

async function generateSchedule() {
  if (!gjSelectedAcademicYearId) {
    showToast('Pilih tahun akademik terlebih dahulu', 'warning');
    return;
  }

  var confirmMsg = 'Jadwal akan di-generate untuk ';
  if (gjSelectedClassroomId) {
    var classOpt = document.getElementById('gjClassroomSelect').selectedOptions[0];
    confirmMsg += 'kelas: ' + classOpt.textContent;
  } else if (gjSelectedSemesterId) {
    var semOpt = document.getElementById('gjSemesterSelect').selectedOptions[0];
    confirmMsg += 'semester: ' + semOpt.textContent + ' (semua kelas)';
  } else {
    confirmMsg += 'SEMUA kelas di tahun akademik ini';
  }
  confirmMsg += '.\n\nJadwal yang sudah ada akan di-overwrite. Lanjutkan?';

  if (!confirm(confirmMsg)) return;

  showLoading();
  var statusEl = document.getElementById('gjGenerateStatus');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = '<div class="flex items-center gap-2" style="color:var(--info);">' +
      '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></div>' +
      '<span>Memproses generate jadwal...</span></div>';
  }

  try {
    var payload = {
      academic_year_id: gjSelectedAcademicYearId
    };
    if (gjSelectedClassroomId) {
      payload.classroom_id = gjSelectedClassroomId;
    }
    if (gjSelectedSemesterId) {
      payload.semester_id = gjSelectedSemesterId;
    }

    var { data, error } = await _sb.functions.invoke('generate_schedule', {
      body: JSON.stringify(payload)
    });

    if (error) throw error;

    if (data && data.error) {
      throw new Error(data.error);
    }

    var totalSlots = (data && data.total_slots) || 0;
    var totalConflicts = (data && data.conflicts) ? data.conflicts.length : 0;

    if (statusEl) {
      statusEl.innerHTML =
        '<div class="flex items-center gap-2" style="color:var(--success);">' +
          '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
          '<span><strong>Generate berhasil!</strong> ' + totalSlots + ' slot dijadwalkan' + (totalConflicts > 0 ? ', ' + totalConflicts + ' konflik' : '') + '</span>' +
        '</div>';
    }

    showToast('Jadwal berhasil di-generate: ' + totalSlots + ' slot', 'success');
    await viewExistingSchedule();
  } catch (err) {
    console.error('Generate schedule error:', err);
    if (statusEl) {
      statusEl.innerHTML = '<div style="color:var(--danger);">✗ Gagal generate: ' + escapeHtml(err.message || String(err)) + '</div>';
    }
    showToast('Gagal generate jadwal: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

async function viewExistingSchedule() {
  if (!gjSelectedAcademicYearId) {
    showToast('Pilih tahun akademik terlebih dahulu', 'warning');
    return;
  }

  showLoading();
  try {
    var query = _sb
      .from('v_schedule_per_classroom')
      .select('*')
      .eq('academic_year_id', gjSelectedAcademicYearId);

    if (gjSelectedClassroomId) {
      query = query.eq('classroom_id', gjSelectedClassroomId);
    }

    var { data, error } = await query;
    if (error) throw error;

    generatedScheduleData = data || [];
    renderScheduleResult();
  } catch (err) {
    console.error('View schedule error:', err);
    showToast('Gagal memuat jadwal: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}

function renderScheduleResult() {
  var container = document.getElementById('scheduleResultGrid');
  if (!container) return;

  if (!generatedScheduleData.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:var(--space-8);">Belum ada jadwal yang di-generate. Klik "Generate Jadwal" untuk membuat jadwal baru.</p>';
    return;
  }

  // Group by classroom
  var byClass = {};
  generatedScheduleData.forEach(function (entry) {
    var classId = entry.classroom_id;
    if (!byClass[classId]) {
      byClass[classId] = {
        name: entry.classroom_name || 'Unknown',
        parallel: entry.class_letter || '',
        entries: []
      };
    }
    byClass[classId].entries.push(entry);
  });

  var html = '';
  Object.keys(byClass).forEach(function (classId) {
    var group = byClass[classId];
    var className = group.name + (group.parallel ? ' ' + group.parallel : '');

    html += '<div style="margin-bottom:var(--space-6);">';
    html += '<h4 style="margin-bottom:var(--space-3);font-size:var(--text-base);">' + escapeHtml(className) + '</h4>';

    // Build grid: days as columns, time slots as rows
    var dayMap = {};
    var slotMap = {};
    var grid = {};

    group.entries.forEach(function (entry) {
      var daySort = entry.day_sort || 0;
      var slotSort = entry.session_number || 0;

      dayMap[daySort] = entry.day_name;
      slotMap[slotSort] = {
        session_name: 'Sesi ' + slotSort,
        start_time: entry.start_time ? entry.start_time.substring(0, 5) : '',
        end_time: entry.end_time ? entry.end_time.substring(0, 5) : ''
      };

      var key = daySort + '-' + slotSort;
      grid[key] = entry;
    });

    var daySorts = Object.keys(dayMap).sort(function (a, b) { return a - b; });
    var slotSorts = Object.keys(slotMap).sort(function (a, b) { return a - b; });

    if (!daySorts.length || !slotSorts.length) {
      html += '<p style="color:var(--gray-400);font-size:var(--text-sm);">Tidak ada slot untuk kelas ini</p>';
      html += '</div>';
      return;
    }

    var headerRow = '<th class="text-center" style="font-size:0.7rem;min-width:60px;">Sesi</th>';
    daySorts.forEach(function (ds) {
      headerRow += '<th class="text-center" style="font-size:0.7rem;min-width:80px;">' + escapeHtml(dayMap[ds]) + '</th>';
    });

    var bodyRows = slotSorts.map(function (ss) {
      var slot = slotMap[ss];
      var row = '<td class="text-center" style="font-size:0.65rem;white-space:nowrap;font-weight:600;">' +
        escapeHtml(slot.session_name) + '<br>' +
        '<span style="font-weight:400;color:var(--gray-400);font-size:0.6rem;">' + escapeHtml(slot.start_time) + '-' + escapeHtml(slot.end_time) + '</span>' +
      '</td>';

      daySorts.forEach(function (ds) {
        var key = ds + '-' + ss;
        var entry = grid[key];
        if (entry) {
          row += '<td style="font-size:0.65rem;padding:var(--space-1);background:var(--primary-bg);color:var(--primary-text);vertical-align:top;">' +
            '<div style="font-weight:600;">' + escapeHtml(entry.course_code || entry.course_name || '') + '</div>' +
            '<div style="font-size:0.6rem;color:var(--gray-400);">' + escapeHtml(entry.lecturer_name || '') + '</div>' +
          '</td>';
        } else {
          row += '<td style="font-size:0.65rem;padding:var(--space-1);background:var(--gray-900);text-align:center;color:var(--gray-600);">—</td>';
        }
      });

      return '<tr>' + row + '</tr>';
    }).join('');

    html += '<div style="overflow-x:auto;">' +
      '<table class="data-table" style="font-size:0.75rem;">' +
        '<thead><tr>' + headerRow + '</tr></thead>' +
        '<tbody>' + bodyRows + '</tbody>' +
      '</table>' +
    '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

function clearScheduleView() {
  generatedScheduleData = [];
  var container = document.getElementById('scheduleResultGrid');
  if (container) {
    container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:var(--space-8);">Belum ada jadwal yang di-generate.</p>';
  }
  var statusEl = document.getElementById('gjGenerateStatus');
  if (statusEl) statusEl.style.display = 'none';
}
