/**
 * SIMKURMA Helpers
 * Shared utility functions for academic structure management
 */

// ============================================================
// Global Data Cache
// ============================================================
const SimkurmaCache = {
  academicYears: [],
  semesters: [],
  classrooms: [],
  courses: [],
  lecturers: [],
  days: [],
  timeSlots: [],
  lastLoaded: null
};

// ============================================================
// Fetch Functions
// ============================================================

/**
 * Fetch all academic years
 */
async function fetchAcademicYears() {
  try {
    const { data, error } = await _sb
      .from('academic_years')
      .select('*')
      .order('start_year', { ascending: false });
    if (error) throw error;
    SimkurmaCache.academicYears = data || [];
    return data || [];
  } catch (err) {
    console.error('Error fetching academic years:', err);
    return [];
  }
}

/**
 * Fetch all semesters
 */
async function fetchSemesters() {
  try {
    const { data, error } = await _sb
      .from('semesters')
      .select('*')
      .order('number', { ascending: true });
    if (error) throw error;
    SimkurmaCache.semesters = data || [];
    return data || [];
  } catch (err) {
    console.error('Error fetching semesters:', err);
    return [];
  }
}

/**
 * Fetch classrooms with optional filters
 */
async function fetchClassrooms(filters = {}) {
  try {
    let query = _sb
      .from('classrooms')
      .select(`
        *,
        academic_years:academic_year_id (id, name, start_year, end_year, is_active),
        semesters:semester_id (id, number, name)
      `)
      .order('name', { ascending: true });

    if (filters.academic_year_id) {
      query = query.eq('academic_year_id', filters.academic_year_id);
    }
    if (filters.semester_id) {
      query = query.eq('semester_id', filters.semester_id);
    }
    if (filters.gender_type) {
      query = query.eq('gender_type', filters.gender_type);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;
    SimkurmaCache.classrooms = data || [];
    return data || [];
  } catch (err) {
    console.error('Error fetching classrooms:', err);
    return [];
  }
}

/**
 * Fetch courses
 */
async function fetchCourses() {
  try {
    const { data, error } = await _sb
      .from('courses')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    SimkurmaCache.courses = data || [];
    return data || [];
  } catch (err) {
    console.error('Error fetching courses:', err);
    return [];
  }
}

/**
 * Fetch lecturers
 */
async function fetchLecturers() {
  try {
    const { data, error } = await _sb
      .from('lecturers')
      .select(`
        *,
        lecturer_categories:lecturer_category_id (id, name, level)
      `)
      .order('name', { ascending: true });
    if (error) throw error;
    SimkurmaCache.lecturers = data || [];
    return data || [];
  } catch (err) {
    console.error('Error fetching lecturers:', err);
    return [];
  }
}

/**
 * Fetch days
 */
async function fetchDays() {
  try {
    const { data, error } = await _sb
      .from('days')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    SimkurmaCache.days = data || [];
    return data || [];
  } catch (err) {
    console.error('Error fetching days:', err);
    return [];
  }
}

/**
 * Fetch time slots
 */
async function fetchTimeSlots() {
  try {
    const { data, error } = await _sb
      .from('time_slots')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    SimkurmaCache.timeSlots = data || [];
    return data || [];
  } catch (err) {
    console.error('Error fetching time slots:', err);
    return [];
  }
}

// ============================================================
// Dropdown Population Helpers
// ============================================================

/**
 * Populate a <select> element with options
 */
function populateDropdown(selectId, data, valueKey, labelKey, placeholder = 'Pilih...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  (data || []).forEach(item => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    select.appendChild(option);
  });
  
  // Restore previous value if still valid
  if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
    select.value = currentValue;
  }
}

/**
 * Populate classroom dropdown with grouped display
 */
function populateClassroomDropdown(selectId, classrooms, placeholder = 'Pilih Kelas...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  // Group by semester
  const grouped = {};
  (classrooms || []).forEach(cls => {
    const semName = cls.semesters ? `Semester ${cls.semesters.number}` : 'Lainnya';
    if (!grouped[semName]) grouped[semName] = [];
    grouped[semName].push(cls);
  });
  
  Object.entries(grouped).forEach(([group, items]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group;
    
    items.forEach(cls => {
      const option = document.createElement('option');
      option.value = cls.id;
      const gender = cls.gender_type === 'putra' ? '♂ Putra' : '♀ Putri';
      const parallel = cls.parallel_type ? ` ${cls.parallel_type}` : '';
      option.textContent = `${cls.name} (${gender}${parallel})`;
      optgroup.appendChild(option);
    });
    
    select.appendChild(optgroup);
  });
  
  // Restore previous value
  if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
    select.value = currentValue;
  }
}

/**
 * Populate course dropdown
 */
function populateCourseDropdown(selectId, courses, placeholder = 'Pilih Mata Kuliah...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  (courses || []).forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.code ? `${c.code} — ${c.name}` : c.name;
    select.appendChild(option);
  });
  
  if (currentValue) select.value = currentValue;
}

/**
 * Populate lecturer dropdown
 */
function populateLecturerDropdown(selectId, lecturers, placeholder = 'Pilih Dosen...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  (lecturers || []).forEach(l => {
    const option = document.createElement('option');
    option.value = l.id;
    const catName = l.lecturer_categories ? l.lecturer_categories.name : '';
    option.textContent = catName ? `${l.name} (${catName})` : l.name;
    select.appendChild(option);
  });
  
  if (currentValue) select.value = currentValue;
}

/**
 * Populate day dropdown
 */
function populateDayDropdown(selectId, days, placeholder = 'Pilih Hari...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  (days || []).forEach(d => {
    const option = document.createElement('option');
    option.value = d.id;
    option.textContent = d.name;
    select.appendChild(option);
  });
  
  if (currentValue) select.value = currentValue;
}

/**
 * Populate time slot dropdown
 */
function populateTimeSlotDropdown(selectId, timeSlots, placeholder = 'Pilih Slot...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  (timeSlots || []).forEach(ts => {
    const option = document.createElement('option');
    option.value = ts.id;
    option.textContent = ts.name || `${ts.start_time} — ${ts.end_time}`;
    select.appendChild(option);
  });
  
  if (currentValue) select.value = currentValue;
}

/**
 * Populate semester dropdown
 */
function populateSemesterDropdown(selectId, semesters, placeholder = 'Pilih Semester...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  (semesters || []).forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `Semester ${s.number} — ${s.name}`;
    select.appendChild(option);
  });
  
  if (currentValue) select.value = currentValue;
}

/**
 * Populate academic year dropdown
 */
function populateAcademicYearDropdown(selectId, years, placeholder = 'Pilih Tahun Akademik...') {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const currentValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  
  (years || []).forEach(y => {
    const option = document.createElement('option');
    option.value = y.id;
    option.textContent = y.name;
    if (y.is_active) option.textContent += ' ✓';
    select.appendChild(option);
  });
  
  if (currentValue) select.value = currentValue;
}

// ============================================================
// Cascading Dropdown Setup
// ============================================================

/**
 * Setup cascading dropdowns: Academic Year → Classroom
 */
function setupYearToClassroomCascade(yearSelectId, classroomSelectId, onChangeCallback) {
  const yearSelect = document.getElementById(yearSelectId);
  const classroomSelect = document.getElementById(classroomSelectId);
  
  if (!yearSelect || !classroomSelect) return;
  
  yearSelect.addEventListener('change', async () => {
    const yearId = yearSelect.value;
    if (!yearId) {
      populateClassroomDropdown(classroomSelectId, []);
      return;
    }
    
    const classrooms = await fetchClassrooms({ academic_year_id: yearId });
    populateClassroomDropdown(classroomSelectId, classrooms);
    
    if (onChangeCallback) onChangeCallback(yearId);
  });
}

/**
 * Setup cascading dropdowns: Academic Year → Semester → Classroom
 */
function setupYearSemesterToClassroomCascade(yearSelectId, semesterSelectId, classroomSelectId, onChangeCallback) {
  const yearSelect = document.getElementById(yearSelectId);
  const semesterSelect = document.getElementById(semesterSelectId);
  const classroomSelect = document.getElementById(classroomSelectId);
  
  if (!yearSelect || !semesterSelect || !classroomSelect) return;
  
  const updateClassrooms = async () => {
    const yearId = yearSelect.value;
    const semId = semesterSelect.value;
    
    if (!yearId) {
      populateClassroomDropdown(classroomSelectId, []);
      return;
    }
    
    const filters = { academic_year_id: yearId };
    if (semId) filters.semester_id = semId;
    
    const classrooms = await fetchClassrooms(filters);
    populateClassroomDropdown(classroomSelectId, classrooms);
  };
  
  yearSelect.addEventListener('change', async () => {
    await updateClassrooms();
    if (onChangeCallback) onChangeCallback('year');
  });
  
  semesterSelect.addEventListener('change', async () => {
    await updateClassrooms();
    if (onChangeCallback) onChangeCallback('semester');
  });
}

/**
 * Setup cascading dropdowns: Classroom → Course (via class_curriculum)
 */
function setupClassroomToCourseCascade(classroomSelectId, courseSelectId, onChangeCallback) {
  const classroomSelect = document.getElementById(classroomSelectId);
  const courseSelect = document.getElementById(courseSelectId);
  
  if (!classroomSelect || !courseSelect) return;
  
  classroomSelect.addEventListener('change', async () => {
    const classroomId = classroomSelect.value;
    if (!classroomId) {
      populateCourseDropdown(courseSelectId, []);
      return;
    }
    
    try {
      const { data, error } = await _sb
        .from('class_curriculum')
        .select('courses:course_id (id, code, name)')
        .eq('classroom_id', classroomId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const courses = (data || []).map(cc => cc.courses).filter(Boolean);
      populateCourseDropdown(courseSelectId, courses);
      
      if (onChangeCallback) onChangeCallback(classroomId);
    } catch (err) {
      console.error('Error fetching courses for classroom:', err);
      populateCourseDropdown(courseSelectId, []);
    }
  });
}

// ============================================================
// Grid Renderers
// ============================================================

/**
 * Render a day × time slot grid
 */
function renderDaySlotGrid(containerId, days, timeSlots, cellRenderer) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let html = `
    <div class="slot-grid">
      <table class="slot-grid-table">
        <thead>
          <tr>
            <th class="slot-grid-corner">Jam</th>
  `;
  
  days.forEach(d => {
    html += `<th class="slot-grid-day">${escapeHtml(d.name)}</th>`;
  });
  
  html += `</tr></thead><tbody>`;
  
  timeSlots.forEach(ts => {
    html += `
      <tr>
        <td class="slot-grid-time">
          <strong>${escapeHtml(ts.name || '')}</strong>
          <small>${escapeHtml(ts.start_time || '')} — ${escapeHtml(ts.end_time || '')}</small>
        </td>
    `;
    
    days.forEach(d => {
      const cellContent = cellRenderer ? cellRenderer(d.id, ts.id, d, ts) : '';
      html += `<td class="slot-grid-cell" data-day="${d.id}" data-slot="${ts.id}">${cellContent}</td>`;
    });
    
    html += `</tr>`;
  });
  
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

/**
 * Render a status badge
 */
function renderStatusBadge(status, activeText = 'Aktif', inactiveText = 'Nonaktif') {
  const isActive = status === true || status === 'active' || status === 'available';
  const cls = isActive ? 'badge-success' : 'badge-danger';
  const text = isActive ? activeText : inactiveText;
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

/**
 * Render gender badge
 */
function renderGenderBadge(gender) {
  if (!gender) return '';
  const isPutra = gender === 'putra';
  const cls = isPutra ? 'badge-info' : 'badge-warning';
  const icon = isPutra ? '♂' : '♀';
  return `<span class="badge ${cls}">${icon} ${escapeHtml(capitalize(gender))}</span>`;
}

/**
 * Render parallel badge
 */
function renderParallelBadge(parallel) {
  if (!parallel) return '<span class="badge badge-neutral">—</span>';
  return `<span class="badge badge-outline">${escapeHtml(parallel)}</span>`;
}

// ============================================================
// Form Helpers
// ============================================================

/**
 * Get form field values from a modal
 */
function getModalValues(modalId, fieldNames) {
  const modal = document.getElementById(modalId);
  if (!modal) return {};
  
  const values = {};
  fieldNames.forEach(name => {
    const el = modal.querySelector(`[name="${name}"], #${modalId.replace('Modal', '')}_${name}, #${name}`);
    if (!el) return;
    
    if (el.type === 'checkbox') {
      values[name] = el.checked;
    } else if (el.type === 'number') {
      values[name] = el.value ? Number(el.value) : null;
    } else {
      values[name] = el.value || null;
    }
  });
  
  return values;
}

/**
 * Set form field values in a modal
 */
function setModalValues(modalId, data, fieldNames) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  fieldNames.forEach(name => {
    const el = modal.querySelector(`[name="${name}"], #${modalId.replace('Modal', '')}_${name}, #${name}`);
    if (!el || data[name] === undefined) return;
    
    if (el.type === 'checkbox') {
      el.checked = !!data[name];
    } else {
      el.value = data[name] || '';
    }
  });
}

/**
 * Auto-generate classroom name
 */
function generateClassroomName(semesterNumber, gender, parallel) {
  let name = `Semester ${semesterNumber}`;
  if (parallel) name += ` ${parallel}`;
  name += ` ${gender === 'putra' ? 'Putra' : 'Putri'}`;
  return name;
}

// ============================================================
// SimkurmaHelpers — Namespace wrapper for module access
// ============================================================
var SimkurmaHelpers = {
  // Cache
  cache: SimkurmaCache,

  // Fetch functions
  fetchAcademicYears: fetchAcademicYears,
  fetchSemesters: fetchSemesters,
  fetchClassrooms: fetchClassrooms,
  fetchCourses: fetchCourses,
  fetchLecturers: fetchLecturers,
  fetchDays: fetchDays,
  fetchTimeSlots: fetchTimeSlots,

  // Dropdown helpers
  populateDropdown: populateDropdown,
  populateClassroomDropdown: populateClassroomDropdown,
  populateCourseDropdown: populateCourseDropdown,
  populateLecturerDropdown: populateLecturerDropdown,
  populateDayDropdown: populateDayDropdown,
  populateTimeSlotDropdown: populateTimeSlotDropdown,
  populateSemesterDropdown: populateSemesterDropdown,
  populateAcademicYearDropdown: populateAcademicYearDropdown,

  // Cascade helpers
  setupYearToClassroomCascade: setupYearToClassroomCascade,
  setupYearSemesterToClassroomCascade: setupYearSemesterToClassroomCascade,
  setupClassroomToCourseCascade: setupClassroomToCourseCascade,

  // Grid renderers
  renderDaySlotGrid: renderDaySlotGrid,
  renderStatusBadge: renderStatusBadge,
  renderGenderBadge: renderGenderBadge,
  renderParallelBadge: renderParallelBadge,

  // Form helpers
  getModalValues: getModalValues,
  setModalValues: setModalValues,
  generateClassroomName: generateClassroomName
};

// ============================================================
// Export (Node.js only)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SimkurmaCache,
    SimkurmaHelpers,
    fetchAcademicYears, fetchSemesters, fetchClassrooms, fetchCourses,
    fetchLecturers, fetchDays, fetchTimeSlots,
    populateDropdown, populateClassroomDropdown, populateCourseDropdown,
    populateLecturerDropdown, populateDayDropdown, populateTimeSlotDropdown,
    populateSemesterDropdown, populateAcademicYearDropdown,
    setupYearToClassroomCascade, setupYearSemesterToClassroomCascade,
    setupClassroomToCourseCascade,
    renderDaySlotGrid, renderStatusBadge, renderGenderBadge, renderParallelBadge,
    getModalValues, setModalValues, generateClassroomName
  };
}
