/**
 * SIMKURMA Integration Module
 * Menghubungkan semua modul SIMKURMA ke dashboard-admin.html
 * Memuat dan menginisialisasi semua modul saat navigasi ke halaman terkait
 */

var SimkurmaIntegration = {
  loaded: false,
  modulesLoaded: {
    academicYears: false,
    semesters: false,
    classrooms: false,
    timeSlots: false,
    kurikulumKelas: false,
    pengampuAssignments: false,
    lecturerAvailability: false,
    slotStatus: false,
    generateSchedule: false,
    courseTimePreferences: false,
    semesterCategoryRules: false,
    lecturerClassRules: false,
    scheduleManagement: false,
    logGenerate: false,
    reports: false,
    scheduleViewer: false
  },

  init: async function () {
    if (this.loaded) return;
    console.log('[SIMKURMA] Initializing integration...');

    // Load shared helpers first
    await SimkurmaHelpers.fetchAcademicYears();
    await SimkurmaHelpers.fetchSemesters();
    await SimkurmaHelpers.fetchCourses();
    await SimkurmaHelpers.fetchLecturers();

    this.loaded = true;
    console.log('[SIMKURMA] Integration initialized');
  },

  loadModule: async function (moduleName) {
    if (!this.loaded) await this.init();

    switch (moduleName) {
      case 'academic-years':
        if (!this.modulesLoaded.academicYears) {
          initAcademicYearsModule();
          this.modulesLoaded.academicYears = true;
        }
        await loadAcademicYears();
        break;

      case 'semesters':
        if (!this.modulesLoaded.semesters) {
          initSemestersModule();
          this.modulesLoaded.semesters = true;
        }
        await loadSemesters();
        break;

      case 'classrooms':
        if (!this.modulesLoaded.classrooms) {
          initClassroomsModule();
          this.modulesLoaded.classrooms = true;
        }
        await loadClassrooms();
        break;

      case 'time-slots':
        if (!this.modulesLoaded.timeSlots) {
          initTimeSlotsModule();
          this.modulesLoaded.timeSlots = true;
        }
        await loadTimeSlots();
        break;

      case 'kurikulum-kelas':
        if (!this.modulesLoaded.kurikulumKelas) {
          initKurikulumKelasModule();
          this.modulesLoaded.kurikulumKelas = true;
        }
        await populateKkAcademicYears();
        break;

      case 'pengampu-assignments':
        if (!this.modulesLoaded.pengampuAssignments) {
          initPengampuModule();
          this.modulesLoaded.pengampuAssignments = true;
        }
        await populatePaAcademicYears();
        break;

      case 'lecturer-availability':
        if (!this.modulesLoaded.lecturerAvailability) {
          initAvailabilityModule();
          this.modulesLoaded.lecturerAvailability = true;
        }
        await populateAvLecturers();
        break;

      case 'slot-status':
        if (!this.modulesLoaded.slotStatus) {
          initSlotStatusModule();
          this.modulesLoaded.slotStatus = true;
        }
        await populateSsAcademicYears();
        break;

      case 'generate-schedule':
        if (!this.modulesLoaded.generateSchedule) {
          initGenerateJadwalModule();
          this.modulesLoaded.generateSchedule = true;
        }
        await populateGjAcademicYears();
        break;

      case 'course-time-preferences':
        if (!this.modulesLoaded.courseTimePreferences) {
          initCourseTimePrefModule();
          this.modulesLoaded.courseTimePreferences = true;
        }
        await populateCtpAcademicYears();
        break;

      case 'semester-category-rules':
        if (!this.modulesLoaded.semesterCategoryRules) {
          initSemesterCategoryRulesModule();
          this.modulesLoaded.semesterCategoryRules = true;
        }
        await populateScrSemesters();
        break;

      case 'lecturer-class-rules':
        if (!this.modulesLoaded.lecturerClassRules) {
          initLecturerClassRulesModule();
          this.modulesLoaded.lecturerClassRules = true;
        }
        await populateLcrAcademicYears();
        break;

      case 'schedule-management':
        if (!this.modulesLoaded.scheduleManagement) {
          initScheduleManagementModule();
          this.modulesLoaded.scheduleManagement = true;
        }
        await populateSmAcademicYears();
        break;

      case 'log-generate':
        if (!this.modulesLoaded.logGenerate && window.GenerateLogModule) {
          await window.GenerateLogModule.init();
          this.modulesLoaded.logGenerate = true;
        }
        if (window.GenerateLogModule) await window.GenerateLogModule.populateDropdowns();
        break;

      case 'reports':
        if (!this.modulesLoaded.reports && window.ReportsModule) {
          await window.ReportsModule.init();
          this.modulesLoaded.reports = true;
        }
        if (window.ReportsModule) await window.ReportsModule.populateDropdowns();
        break;

      case 'schedule-viewer':
        if (!this.modulesLoaded.scheduleViewer && window.ScheduleViewerModule) {
          await window.ScheduleViewerModule.init();
          this.modulesLoaded.scheduleViewer = true;
        }
        if (window.ScheduleViewerModule) await window.ScheduleViewerModule.populateDropdowns();
        break;
    }
  }
};
