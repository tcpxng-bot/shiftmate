const STORE = {
  staff: "shiftmate.staff",
  schedule: "shiftmate.schedule",
  ot: "shiftmate.ot",
  locsee: "shiftmate.locsee",
  locseeSlots: "locsee.booking.slots",
  locseeBookings: "locsee.booking.bookings",
  locseeHolidays: "locsee.booking.holidays",
  activeTab: "shiftmate.activeTab",
  scheduleGroup: "shiftmate.scheduleGroup",
  session: "shiftmate.session"
};

const SHIFT_CODES = ["", "R1", "R3", "R4", "RR", "S1", "S3", "S5", "vac", "ลาศึกษาต่อ", "อบรม", "ประชุม", "หยุด"];
const WORK_CODES = new Set(["R1", "R3", "R4", "RR", "S1", "S3", "S5"]);
const LEAVE_CODES = new Set(["vac", "หยุด"]);
const EVENT_CODES = new Set(["ลาศึกษาต่อ", "อบรม", "ประชุม"]);

// วันหยุดราชการไทยที่ตรงวันเดิมทุกปี (รูปแบบ MM-DD)
const FIXED_THAI_HOLIDAYS = {
  "01-01": "วันขึ้นปีใหม่",
  "04-06": "วันจักรี",
  "04-13": "วันสงกรานต์",
  "04-14": "วันสงกรานต์",
  "04-15": "วันสงกรานต์",
  "05-01": "วันแรงงานแห่งชาติ",
  "05-04": "วันฉัตรมงคล",
  "06-03": "วันเฉลิมฯ สมเด็จพระบรมราชินี",
  "07-28": "วันเฉลิมฯ ในหลวง ร.10",
  "08-12": "วันแม่แห่งชาติ",
  "10-13": "วันนวมินทรมหาราช",
  "10-23": "วันปิยมหาราช",
  "12-05": "วันพ่อแห่งชาติ / วันชาติ",
  "12-10": "วันรัฐธรรมนูญ",
  "12-31": "วันสิ้นปี"
};

// วันหยุดเฉพาะปี (วันสำคัญทางพุทธศาสนาตามจันทรคติ + วันชดเชย + วันหยุดพิเศษตามมติ ครม.)
// อ้างอิง: ปฏิทินวันหยุดราชการ พ.ศ. 2569 — ควรอัปเดตทุกปีเพราะวันพระอิงจันทรคติ
const THAI_HOLIDAYS_BY_YEAR = {
  2025: {
    "2025-02-12": "วันมาฆบูชา",
    "2025-04-07": "ชดเชยวันจักรี",
    "2025-05-05": "ชดเชยวันฉัตรมงคล",
    "2025-05-11": "วันวิสาขบูชา",
    "2025-05-12": "ชดเชยวันวิสาขบูชา",
    "2025-07-10": "วันอาสาฬหบูชา",
    "2025-07-11": "วันเข้าพรรษา"
  },
  2026: {
    "2026-01-02": "วันหยุดพิเศษ (มติ ครม.)",
    "2026-03-03": "วันมาฆบูชา",
    "2026-05-31": "วันวิสาขบูชา",
    "2026-06-01": "ชดเชยวันวิสาขบูชา",
    "2026-07-29": "วันอาสาฬหบูชา",
    "2026-07-30": "วันเข้าพรรษา",
    "2026-12-07": "ชดเชยวันพ่อแห่งชาติ"
  }
};

function holidayName(dateText) {
  const year = Number(dateText.slice(0, 4));
  const md = dateText.slice(5);
  const yearMap = THAI_HOLIDAYS_BY_YEAR[year];
  if (yearMap && yearMap[dateText]) return yearMap[dateText];
  return FIXED_THAI_HOLIDAYS[md] || "";
}

function isHoliday(dateText) {
  return Boolean(holidayName(dateText));
}

function parseLocalDate(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

let staff = readStore(STORE.staff, seedStaff());
let schedule = readStore(STORE.schedule, {});
let otRecords = readStore(STORE.ot, []);
let locseeRequests = readStore(STORE.locsee, []);
let locseeSlots = readStore(STORE.locseeSlots, []);
let locseeBookings = readStore(STORE.locseeBookings, []);
let locseeSpecialHolidays = readStore(STORE.locseeHolidays, []);
let locseeDb = null;
let locseeCloudEnabled = false;
let locseeCloudLoaded = false;
let locseeCloudStatus = "Supabase config missing";
let staffCloudLoaded = false;
let staffCloudStatus = "Local only";
let activeScheduleGroup = localStorage.getItem(STORE.scheduleGroup) || "RN";
let currentUserId = sessionStorage.getItem(STORE.session) || "";

const el = {
  todayLabel: document.querySelector("#todayLabel"),
  todaySummary: document.querySelector("#todaySummary"),
  loginGate: document.querySelector("#loginGate"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  tabs: [...document.querySelectorAll(".tab")],
  panels: [...document.querySelectorAll(".panel")],
  dashboardDate: document.querySelector("#dashboardDate"),
  dashboardDateLabel: document.querySelector("#dashboardDateLabel"),
  totalStaffLabel: document.querySelector("#totalStaffLabel"),
  totalStaffMetric: document.querySelector("#totalStaffMetric"),
  workingLabel: document.querySelector("#workingLabel"),
  workingMetric: document.querySelector("#workingMetric"),
  leaveLabel: document.querySelector("#leaveLabel"),
  leaveMetric: document.querySelector("#leaveMetric"),
  meetingLabel: document.querySelector("#meetingLabel"),
  meetingMetric: document.querySelector("#meetingMetric"),
  monthOtLabel: document.querySelector("#monthOtLabel"),
  monthOtMetric: document.querySelector("#monthOtMetric"),
  todayShiftList: document.querySelector("#todayShiftList"),
  pendingOtList: document.querySelector("#pendingOtList"),
  alertCount: document.querySelector("#alertCount"),
  workforceAlerts: document.querySelector("#workforceAlerts"),
  shiftChart: document.querySelector("#shiftChart"),
  otChart: document.querySelector("#otChart"),
  upcomingEvents: document.querySelector("#upcomingEvents"),
  staffForm: document.querySelector("#staffForm"),
  staffId: document.querySelector("#staffId"),
  staffName: document.querySelector("#staffName"),
  staffRole: document.querySelector("#staffRole"),
  staffLeave: document.querySelector("#staffLeave"),
  staffOtBalance: document.querySelector("#staffOtBalance"),
  staffAccessRole: document.querySelector("#staffAccessRole"),
  staffUsername: document.querySelector("#staffUsername"),
  staffPassword: document.querySelector("#staffPassword"),
  staffFormMode: document.querySelector("#staffFormMode"),
  staffSearch: document.querySelector("#staffSearch"),
  staffFilter: document.querySelector("#staffFilter"),
  staffSort: document.querySelector("#staffSort"),
  staffTotalKpi: document.querySelector("#staffTotalKpi"),
  staffRnKpi: document.querySelector("#staffRnKpi"),
  staffPnKpi: document.querySelector("#staffPnKpi"),
  staffOtKpi: document.querySelector("#staffOtKpi"),
  staffHpKpi: document.querySelector("#staffHpKpi"),
  focusStaffForm: document.querySelector("#focusStaffForm"),
  generateStaffPassword: document.querySelector("#generateStaffPassword"),
  toggleStaffPassword: document.querySelector("#toggleStaffPassword"),
  clearStaffForm: document.querySelector("#clearStaffForm"),
  staffRows: document.querySelector("#staffRows"),
  scheduleMonth: document.querySelector("#scheduleMonth"),
  scheduleGroupLabel: document.querySelector("#scheduleGroupLabel"),
  scheduleMonthLabel: document.querySelector("#scheduleMonthLabel"),
  rnTotalKpi: document.querySelector("#rnTotalKpi"),
  pnTotalKpi: document.querySelector("#pnTotalKpi"),
  vacationKpi: document.querySelector("#vacationKpi"),
  trainingKpi: document.querySelector("#trainingKpi"),
  shortageKpi: document.querySelector("#shortageKpi"),
  scheduleSidePanel: document.querySelector("#scheduleSidePanel"),
  prevScheduleMonth: document.querySelector("#prevScheduleMonth"),
  nextScheduleMonth: document.querySelector("#nextScheduleMonth"),
  copyPreviousMonth: document.querySelector("#copyPreviousMonth"),
  scheduleTable: document.querySelector("#scheduleTable"),
  subTabs: [...document.querySelectorAll(".sub-tab")],
  otForm: document.querySelector("#otForm"),
  otDate: document.querySelector("#otDate"),
  otDateLabel: document.querySelector("#otDateLabel"),
  otRoom: document.querySelector("#otRoom"),
  otMemberList: document.querySelector("#otMemberList"),
  otApprover: document.querySelector("#otApprover"),
  otApproverHint: document.querySelector("#otApproverHint"),
  otStart: document.querySelector("#otStart"),
  otEnd: document.querySelector("#otEnd"),
  otNote: document.querySelector("#otNote"),
  otDeductMinutes: document.querySelector("#otDeductMinutes"),
  otLiveTotal: document.querySelector("#otLiveTotal"),
  otRows: document.querySelector("#otRows"),
  otPersonSummary: document.querySelector("#otPersonSummary"),
  otFilterStaff: document.querySelector("#otFilterStaff"),
  otFilterMonth: document.querySelector("#otFilterMonth"),
  otFilterType: document.querySelector("#otFilterType"),
  otFilterStatus: document.querySelector("#otFilterStatus"),
  otSummarySearch: document.querySelector("#otSummarySearch"),
  otProfileCard: document.querySelector("#otProfileCard"),
  otLeaderboard: document.querySelector("#otLeaderboard"),
  otMonthKpi: document.querySelector("#otMonthKpi"),
  otPeopleKpi: document.querySelector("#otPeopleKpi"),
  otVacationBankKpi: document.querySelector("#otVacationBankKpi"),
  otRecordKpi: document.querySelector("#otRecordKpi"),
  otPendingKpi: document.querySelector("#otPendingKpi"),
  clearOtForm: document.querySelector("#clearOtForm"),
  vacationCreditForm: document.querySelector("#vacationCreditForm"),
  vacationCreditStaff: document.querySelector("#vacationCreditStaff"),
  vacationCreditDays: document.querySelector("#vacationCreditDays"),
  locseeMonth: document.querySelector("#locseeMonth"),
  locseeStatusFilter: document.querySelector("#locseeStatusFilter"),
  locseePendingKpi: document.querySelector("#locseePendingKpi"),
  locseeApprovedKpi: document.querySelector("#locseeApprovedKpi"),
  locseeUsedKpi: document.querySelector("#locseeUsedKpi"),
  locseeSyncedKpi: document.querySelector("#locseeSyncedKpi"),
  locseeForm: document.querySelector("#locseeForm"),
  locseeFormMode: document.querySelector("#locseeFormMode"),
  locseeRequestId: document.querySelector("#locseeRequestId"),
  locseeStaff: document.querySelector("#locseeStaff"),
  locseeStartDate: document.querySelector("#locseeStartDate"),
  locseeEndDate: document.querySelector("#locseeEndDate"),
  locseeType: document.querySelector("#locseeType"),
  locseePriority: document.querySelector("#locseePriority"),
  locseeNote: document.querySelector("#locseeNote"),
  locseeImpact: document.querySelector("#locseeImpact"),
  clearLocseeForm: document.querySelector("#clearLocseeForm"),
  locseeCalendar: document.querySelector("#locseeCalendar"),
  locseeUpcoming: document.querySelector("#locseeUpcoming"),
  locseeRows: document.querySelector("#locseeRows"),
  locseeSlotForm: document.querySelector("#locseeSlotForm"),
  locseeSlotStart: document.querySelector("#locseeSlotStart"),
  locseeSlotDays: document.querySelector("#locseeSlotDays"),
  locseeSlotNames: document.querySelector("#locseeSlotNames"),
  locseeBookingForm: document.querySelector("#locseeBookingForm"),
  locseeBookingSlot: document.querySelector("#locseeBookingSlot"),
  locseeBookingName: document.querySelector("#locseeBookingName"),
  locseeSlotRows: document.querySelector("#locseeSlotRows"),
  locseeVacationYearLabel: document.querySelector("#locseeVacationYearLabel"),
  locseeVacationGrid: document.querySelector("#locseeVacationGrid")
};

init();

function init() {
  ensureDefaultAdmin();
  initLocseeSupabase();
  el.loginUsername.value = "";
  el.loginPassword.value = "";
  setTimeout(() => {
    el.loginUsername.value = "";
    el.loginPassword.value = "";
  }, 100);
  const today = new Date();
  el.todayLabel.textContent = formatLongDate(iso(today));
  el.scheduleMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  el.otFilterMonth.value = el.scheduleMonth.value;
  el.locseeMonth.value = el.scheduleMonth.value;
  el.otDate.value = iso(today);
  el.locseeStartDate.value = iso(today);
  el.locseeEndDate.value = iso(today);
  el.locseeSlotStart.value = iso(today);
  setTab(localStorage.getItem(STORE.activeTab) || "dashboard");
  bindEvents();
  syncAuthState();
  renderAll();
  loadStaffCloudData();
  loadLocseeCloudData();
}

function bindEvents() {
  el.tabs.forEach(button => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  el.subTabs.forEach(button => {
    button.addEventListener("click", () => {
      activeScheduleGroup = button.dataset.group;
      localStorage.setItem(STORE.scheduleGroup, activeScheduleGroup);
      renderSchedule();
    });
  });

  el.dashboardDate.addEventListener("change", () => {
    renderDashboard();
    renderDateLabels();
  });
  el.scheduleMonth.addEventListener("change", () => {
    populateDashboardDates();
    renderAll();
  });
  el.prevScheduleMonth.addEventListener("click", () => shiftScheduleMonth(-1));
  el.nextScheduleMonth.addEventListener("click", () => shiftScheduleMonth(1));
  el.copyPreviousMonth.addEventListener("click", copyPreviousMonthSchedule);
  el.loginForm.addEventListener("submit", login);
  el.logoutBtn.addEventListener("click", logout);
  el.staffForm.addEventListener("submit", saveStaff);
  el.clearStaffForm.addEventListener("click", clearStaffForm);
  el.staffSearch.addEventListener("input", renderStaff);
  el.staffFilter.addEventListener("change", renderStaff);
  el.staffSort.addEventListener("change", renderStaff);
  el.focusStaffForm.addEventListener("click", () => {
    clearStaffForm();
    el.staffName.focus();
  });
  el.generateStaffPassword.addEventListener("click", () => {
    el.staffPassword.value = generatePassword();
    el.staffPassword.type = "text";
  });
  el.toggleStaffPassword.addEventListener("click", () => {
    el.staffPassword.type = el.staffPassword.type === "password" ? "text" : "password";
  });
  el.otForm.addEventListener("submit", saveOtRecord);
  el.vacationCreditForm.addEventListener("submit", saveVacationCredit);
  el.locseeForm.addEventListener("submit", saveLocseeRequest);
  el.locseeSlotForm.addEventListener("submit", saveLocseeSlot);
  el.locseeBookingForm.addEventListener("submit", saveLocseeBooking);
  el.otFilterStaff.addEventListener("change", renderOt);
  el.otFilterMonth.addEventListener("change", renderOt);
  el.otFilterType.addEventListener("change", renderOt);
  el.otFilterStatus.addEventListener("change", renderOt);
  el.otSummarySearch.addEventListener("input", renderOtSummary);
  el.locseeMonth.addEventListener("change", renderLocsee);
  el.locseeStatusFilter.addEventListener("change", renderLocsee);
  [el.locseeStaff, el.locseeStartDate, el.locseeEndDate, el.locseeType].forEach(input => {
    input.addEventListener("change", renderLocseeImpact);
  });
  el.clearOtForm.addEventListener("click", clearOtForm);
  el.clearLocseeForm.addEventListener("click", clearLocseeForm);
  [el.otStart, el.otEnd, el.otDeductMinutes].forEach(input => input.addEventListener("input", updateOtLiveTotal));

  document.addEventListener("click", event => {
    const editStaffId = event.target.closest("[data-edit-staff]")?.dataset.editStaff;
    const deleteStaffId = event.target.closest("[data-delete-staff]")?.dataset.deleteStaff;
    const moveStaffId = event.target.closest("[data-move-staff]")?.dataset.moveStaff;
    const deleteOtId = event.target.closest("[data-delete-ot]")?.dataset.deleteOt;
    const approveOtId = event.target.closest("[data-approve-ot]")?.dataset.approveOt;
    const editOtId = event.target.closest("[data-edit-ot]")?.dataset.editOt;
    const hospitalOtId = event.target.closest("[data-hospital-ot]")?.dataset.hospitalOt;
    const editLocseeId = event.target.closest("[data-edit-locsee]")?.dataset.editLocsee;
    const approveLocseeId = event.target.closest("[data-approve-locsee]")?.dataset.approveLocsee;
    const rejectLocseeId = event.target.closest("[data-reject-locsee]")?.dataset.rejectLocsee;
    const syncLocseeId = event.target.closest("[data-sync-locsee]")?.dataset.syncLocsee;
    const deleteLocseeId = event.target.closest("[data-delete-locsee]")?.dataset.deleteLocsee;
    const drawLocseeSlotId = event.target.closest("[data-draw-locsee-slot]")?.dataset.drawLocseeSlot;
    const syncLocseeSlotId = event.target.closest("[data-sync-locsee-slot]")?.dataset.syncLocseeSlot;
    const reopenLocseeSlotId = event.target.closest("[data-reopen-locsee-slot]")?.dataset.reopenLocseeSlot;
    const deleteLocseeSlotId = event.target.closest("[data-delete-locsee-slot]")?.dataset.deleteLocseeSlot;

    if (editStaffId && canManageStaff()) editStaff(editStaffId);
    if (deleteStaffId && canManageStaff()) deleteStaff(deleteStaffId);
    if (moveStaffId && canManageStaff()) moveStaff(moveStaffId, event.target.closest("[data-move-staff]").dataset.direction);
    if (deleteOtId) deleteOtRecord(deleteOtId);
    if (editOtId) editOtRecord(editOtId);
    if (approveOtId) approveOtRecord(approveOtId);
    if (hospitalOtId) toggleHospitalPosted(hospitalOtId);
    if (editLocseeId) editLocseeRequest(editLocseeId);
    if (approveLocseeId) approveLocseeRequest(approveLocseeId);
    if (rejectLocseeId) rejectLocseeRequest(rejectLocseeId);
    if (syncLocseeId) syncLocseeRequest(syncLocseeId);
    if (deleteLocseeId) deleteLocseeRequest(deleteLocseeId);
    if (drawLocseeSlotId) drawLocseeSlot(drawLocseeSlotId);
    if (syncLocseeSlotId) syncLocseeSlot(drawLocseeSlotId || syncLocseeSlotId);
    if (reopenLocseeSlotId) reopenLocseeSlot(reopenLocseeSlotId);
    if (deleteLocseeSlotId) deleteLocseeSlot(deleteLocseeSlotId);
  });

  document.addEventListener("change", event => {
    const input = event.target.closest("[data-schedule]");
    if (!input) return;
    if (!canEditSchedule()) {
      renderSchedule();
      alert("บัญชีนี้ยังไม่มีสิทธิ์แก้ตารางเวร");
      return;
    }
    const { staffId, date } = input.dataset;
    setScheduleValue(el.scheduleMonth.value, staffId, date, input.value);
    renderAll();
  });

  ["change", "input"].forEach(eventName => {
    el.otDate.addEventListener(eventName, () => {
      updateSuggestedApprover();
      renderOtMemberList();
      renderDateLabels();
      updateOtLiveTotal();
    });
    el.otRoom.addEventListener(eventName, () => {
      updateSuggestedApprover();
      renderOtMemberList();
    });
  });
}

function login(event) {
  event.preventDefault();
  const username = el.loginUsername.value.trim().toLowerCase();
  const password = el.loginPassword.value;
  let user = staff.find(person => (person.username || "").toLowerCase() === username && person.password === password);
  if (!user && username === "admin") {
    ensureDefaultAdmin();
    user = staff.find(person => (person.username || "").toLowerCase() === username && person.password === password);
  }
  if (!user) {
    el.loginMessage.textContent = "username หรือ password ไม่ถูกต้อง";
    return;
  }
  currentUserId = user.id;
  sessionStorage.setItem(STORE.session, currentUserId);
  el.loginPassword.value = "";
  el.loginMessage.textContent = "";
  syncAuthState();
  renderAll();
}

function logout() {
  currentUserId = "";
  sessionStorage.removeItem(STORE.session);
  syncAuthState();
}

function syncAuthState() {
  const user = currentUser();
  const locked = !user;
  el.loginGate.classList.toggle("is-hidden", !locked);
  document.body.classList.toggle("is-locked", locked);
  if (user) {
    el.todaySummary.textContent = `${user.name} · ${accessLabel(user.accessRole)}`;
  }
}

function setTab(tabName) {
  if (tabName === "staff" && !canViewStaff()) tabName = "dashboard";
  el.tabs.forEach(button => button.classList.toggle("is-active", button.dataset.tab === tabName));
  el.panels.forEach(panel => panel.classList.toggle("is-active", panel.dataset.panel === tabName));
  localStorage.setItem(STORE.activeTab, tabName);
}

function renderAll() {
  updateNavigationAccess();
  populateStaffOptions();
  populateDashboardDates();
  renderStaff();
  renderSchedule();
  renderOt();
  renderLocsee();
  renderDashboard();
  renderDateLabels();
  updateOtLiveTotal();
}

function updateNavigationAccess() {
  el.tabs.forEach(button => {
    if (button.dataset.tab === "staff") button.classList.toggle("is-hidden", !canViewStaff());
  });
  const activeTab = localStorage.getItem(STORE.activeTab);
  if (activeTab === "staff" && !canViewStaff()) setTab("dashboard");
}

function populateDashboardDates() {
  const selected = el.dashboardDate.value;
  const days = daysInMonth(el.scheduleMonth.value);
  el.dashboardDate.innerHTML = days.map(date => `<option value="${date}">${formatDisplayDate(date)}</option>`).join("");
  const today = iso(new Date());
  el.dashboardDate.value = days.includes(selected) ? selected : days.includes(today) ? today : days[0];
}

function renderDashboard() {
  const date = el.dashboardDate.value || iso(new Date());
  const dayRecords = scheduleEntriesForDate(date);
  const managerView = canViewUnitDashboard();
  const visibleDayRecords = managerView ? dayRecords : dayRecords.filter(item => item.id === currentUserId);
  const working = visibleDayRecords.filter(item => WORK_CODES.has(item.code)).length;
  const leaves = visibleDayRecords.filter(item => LEAVE_CODES.has(item.code)).length;
  const events = visibleDayRecords.filter(item => EVENT_CODES.has(item.code)).length;
  const monthOtRows = otRecords.filter(item => item.date.startsWith(el.scheduleMonth.value) && (managerView || item.staffId === currentUserId));
  const monthHours = monthOtRows.reduce((total, item) => total + Number(item.otHours || 0), 0);
  const ownShift = dayRecords.find(item => item.id === currentUserId);
  const pending = otRecords.filter(item => !item.approvedBy && canSeePendingOt(item));

  if (managerView) {
    el.totalStaffLabel.textContent = "เจ้าหน้าที่ทั้งหมด";
    el.workingLabel.textContent = "ปฏิบัติงาน";
    el.leaveLabel.textContent = "ลา / หยุด";
    el.meetingLabel.textContent = "ประชุม / อบรม";
    el.monthOtLabel.textContent = "OT เดือนนี้";
    el.totalStaffMetric.textContent = activeStaff().length;
    el.workingMetric.textContent = working;
    el.leaveMetric.textContent = leaves;
    el.meetingMetric.textContent = events;
    el.todaySummary.textContent = `${working} คนปฏิบัติงาน`;
  } else {
    el.totalStaffLabel.textContent = "เวรของฉัน";
    el.workingLabel.textContent = "สถานะทำงาน";
    el.leaveLabel.textContent = "ลา / หยุด";
    el.meetingLabel.textContent = userRole() === "senior" ? "OT รอตรวจ" : "ประชุม / อบรม";
    el.monthOtLabel.textContent = "OT ของฉันเดือนนี้";
    el.totalStaffMetric.textContent = ownShift?.code || "-";
    el.workingMetric.textContent = working ? "อยู่เวร" : "-";
    el.leaveMetric.textContent = leaves ? "ใช่" : "-";
    el.meetingMetric.textContent = userRole() === "senior" ? pending.length : events ? "ใช่" : "-";
    el.todaySummary.textContent = `${currentUser()?.name || "ผู้ใช้"} · ${ownShift?.code || "ยังไม่ลงเวร"}`;
  }
  el.monthOtMetric.textContent = `${monthHours} ชม.`;

  el.todayShiftList.innerHTML = visibleDayRecords.length
    ? visibleDayRecords.map(item => listItem(`${item.name} (${item.role})`, item.code || "ยังไม่ลงเวร")).join("")
    : emptyItem(managerView ? "ยังไม่มีตารางเวรประจำวันที่เลือก" : "ยังไม่พบเวรของคุณในวันที่เลือก");

  el.pendingOtList.innerHTML = pending.length
    ? pending.slice(0, 8).map(item => listItem(item.staffName, `${formatDisplayDate(item.date)} · ${item.room} · ${item.otHours} ชม. + ${item.extraMinutes} นาที`)).join("")
    : emptyItem("ไม่มีรายการรอตรวจ");

  renderDashboardCommandCenter(date, dayRecords, pending);
}

function renderDashboardCommandCenter(date, dayRecords, pending) {
  const working = dayRecords.filter(item => WORK_CODES.has(item.code));
  const leaves = dayRecords.filter(item => LEAVE_CODES.has(item.code));
  const events = dayRecords.filter(item => EVENT_CODES.has(item.code));
  const alerts = [];
  if (!working.length) alerts.push(["ไม่มีคนลงเวร", "ยังไม่พบคนปฏิบัติงานในวันที่เลือก"]);
  if (pending.length) alerts.push(["OT รอตรวจ", `${pending.length} รายการรอ incharge รับรอง`]);
  if (leaves.length >= Math.max(2, Math.ceil(activeStaff().length * 0.25))) alerts.push(["คนลา/หยุดเยอะ", `${leaves.length} คนลา/หยุดในวันนี้`]);
  if (!alerts.length) alerts.push(["พร้อมปฏิบัติงาน", "ไม่พบ alert สำคัญในวันที่เลือก"]);

  el.alertCount.textContent = `${Math.max(0, alerts.length - (alerts[0][0] === "พร้อมปฏิบัติงาน" ? 1 : 0))} alert`;
  el.workforceAlerts.innerHTML = alerts.map(([title, value]) => listItem(title, value)).join("");

  const shiftCounts = ["R1", "R3", "R4", "RR", "S1", "S3", "S5"].map(code => ({
    label: code,
    value: dayRecords.filter(item => item.code === code).length
  })).filter(item => item.value);
  el.shiftChart.innerHTML = shiftCounts.length ? renderBars(shiftCounts) : emptyItem("ยังไม่มีข้อมูลเวรสำหรับ chart");

  const monthPrefix = el.scheduleMonth.value;
  const otByPerson = activeStaff().map(person => ({
    label: person.name,
    value: otRecords
      .filter(item => item.staffId === person.id && item.date.startsWith(monthPrefix))
      .reduce((total, item) => total + Number(item.otHours || 0) + Number(item.extraMinutes || 0) / 60, 0)
  })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  el.otChart.innerHTML = otByPerson.length ? renderBars(otByPerson, " ชม.") : emptyItem("ยังไม่มี OT เดือนนี้");

  const upcoming = buildUpcomingEvents(date);
  el.upcomingEvents.innerHTML = upcoming.length
    ? upcoming.map(item => listItem(item.title, item.detail)).join("")
    : emptyItem("ยังไม่มีกิจกรรมใกล้ถึง");
}

function renderBars(items, suffix = "") {
  const max = Math.max(...items.map(item => item.value), 1);
  return items.map(item => `
    <div class="chart-row">
      <span>${escapeHtml(item.label)}</span>
      <div class="chart-track"><i style="width:${Math.max(8, (item.value / max) * 100)}%"></i></div>
      <strong>${Number.isInteger(item.value) ? item.value : item.value.toFixed(1)}${suffix}</strong>
    </div>
  `).join("");
}

function buildUpcomingEvents(date) {
  const start = parseLocalDate(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  const rows = [];
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dateText = iso(day);
    scheduleEntriesForDate(dateText)
      .filter(item => EVENT_CODES.has(item.code) || LEAVE_CODES.has(item.code))
      .slice(0, 4)
      .forEach(item => rows.push({
        title: `${item.code} · ${item.name}`,
        detail: formatDisplayDate(dateText)
      }));
  }
  visibleLocseeRequests()
    .filter(item => item.status === "approved" && item.startDate <= iso(end) && item.endDate >= iso(start))
    .forEach(item => rows.push({
      title: `${leaveTypeLabel(item.type)} · ${item.staffName}`,
      detail: `${formatDisplayDate(item.startDate)} - ${formatDisplayDate(item.endDate)}`
    }));
  return rows.slice(0, 8);
}

function renderDateLabels() {
  if (el.dashboardDate.value) el.dashboardDateLabel.textContent = `วันที่เลือก: ${formatLongDate(el.dashboardDate.value)}`;
  if (el.otDate.value) el.otDateLabel.textContent = `วันที่บันทึก OT: ${formatLongDate(el.otDate.value)}`;
}

function renderStaff() {
  normalizeStaffOrder();
  const allStaff = orderedStaff(true);
  const controlsDisabled = !canManageStaff();
  el.staffForm.classList.toggle("is-disabled", controlsDisabled);
  [...el.staffForm.elements].forEach(input => input.disabled = controlsDisabled);

  const rnCount = allStaff.filter(person => scheduleGroupForRole(person.role) === "RN").length;
  const pnCount = allStaff.filter(person => person.role === "PN").length;
  const hpCount = allStaff.filter(person => person.role === "HP").length;
  const otTotal = allStaff.reduce((total, person) => total + Number(person.otBalance || 0), 0);
  el.staffTotalKpi.textContent = `${allStaff.length} คน`;
  el.staffRnKpi.textContent = `${rnCount} คน`;
  el.staffPnKpi.textContent = `${pnCount} คน`;
  el.staffHpKpi.textContent = `${hpCount} คน`;
  el.staffOtKpi.textContent = `${otTotal} ชม.`;

  const query = (el.staffSearch.value || "").trim().toLowerCase();
  const filter = el.staffFilter.value || "all";
  const sortBy = el.staffSort.value || "order";
  const filtered = allStaff
    .filter(person => {
      if (filter === "all") return true;
      if (filter === "RN") return scheduleGroupForRole(person.role) === "RN";
      return person.role === filter;
    })
    .filter(person => {
      if (!query) return true;
      return [person.name, person.username, person.role, accessLabel(person.accessRole)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "th");
      if (sortBy === "position") return a.role.localeCompare(b.role, "th");
      if (sortBy === "ot") return Number(b.otBalance || 0) - Number(a.otBalance || 0);
      if (sortBy === "leave") return Number(b.leaveEntitlement || 0) - Number(a.leaveEntitlement || 0);
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

  const sourceNote = `<div class="staff-sync-note">${escapeHtml(staffCloudLoaded ? "Online/Supabase" : staffCloudStatus)} · ${allStaff.length} staff · ${filtered.length} shown</div>`;
  el.staffRows.innerHTML = sourceNote + (filtered.map(person => `
    <article class="staff-card modern-staff-card">
      <div class="staff-main">
        <strong>${escapeHtml(person.name)}</strong>
        <span>${escapeHtml(accessLabel(person.accessRole))}</span>
      </div>
      <div class="staff-badges">
        <span class="role-badge ${roleBadgeClass(person.accessRole)}">${escapeHtml(accessLabel(person.accessRole))}</span>
        <span class="position-badge ${positionBadgeClass(person.role)}">${escapeHtml(positionLabel(person.role))}</span>
        <span class="status-pill">🏖 ลา ${person.leaveEntitlement} วัน</span>
        <span class="status-pill done">⏱ OT ${person.otBalance} ชม.</span>
      </div>
      <div class="staff-actions">
        ${canManageStaff() ? `
          <button class="btn small staff-edit-btn" type="button" data-edit-staff="${person.id}">✏️ Edit</button>
          <details class="staff-menu">
            <summary aria-label="เมนูเจ้าหน้าที่">⋮</summary>
            <div>
              <button type="button" data-move-staff="${person.id}" data-direction="up">Move Up</button>
              <button type="button" data-move-staff="${person.id}" data-direction="down">Move Down</button>
              <button class="danger-text" type="button" data-delete-staff="${person.id}">Delete</button>
            </div>
          </details>
        ` : "-"}
      </div>
    </article>
  `).join("") || `<div class="staff-empty"><div class="empty-mascot">👩‍⚕️</div><strong>ยังไม่มีข้อมูลเจ้าหน้าที่</strong><small>ลองเพิ่มเจ้าหน้าที่ใหม่ หรือปรับคำค้นหาอีกครั้ง</small>${canManageStaff() ? `<button class="btn primary" type="button" id="emptyAddStaff">เพิ่มเจ้าหน้าที่</button>` : ""}</div>`);
  document.querySelector("#emptyAddStaff")?.addEventListener("click", () => {
    clearStaffForm();
    el.staffName.focus();
  });
}

async function saveStaff(event) {
  event.preventDefault();
  const person = {
    id: el.staffId.value || crypto.randomUUID(),
    name: el.staffName.value.trim(),
    role: el.staffRole.value,
    leaveEntitlement: Number(el.staffLeave.value || 0),
    otBalance: Number(el.staffOtBalance.value || 0),
    accessRole: el.staffAccessRole.value,
    username: el.staffUsername.value.trim(),
    password: el.staffPassword.value.trim(),
    sortOrder: el.staffId.value ? staff.find(item => item.id === el.staffId.value)?.sortOrder ?? activeStaff().length : activeStaff().length
  };
  if (!person.name) return;
  normalizeSystemAdmin(person);

  const index = staff.findIndex(item => item.id === person.id);
  if (index >= 0) staff[index] = person;
  else staff.push(person);
  writeStore(STORE.staff, staff);
  clearStaffForm();
  renderAll();
  await upsertStaffCloud(person);
}

async function moveStaff(id, direction) {
  normalizeStaffOrder();
  const systemStaff = staff.filter(person => person.isSystem);
  const sorted = orderedStaff(true);
  const index = sorted.findIndex(item => item.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
  const currentOrder = sorted[index].sortOrder;
  sorted[index].sortOrder = sorted[targetIndex].sortOrder;
  sorted[targetIndex].sortOrder = currentOrder;
  staff = [...systemStaff, ...sorted.sort((a, b) => a.sortOrder - b.sortOrder)];
  ensureDefaultAdmin();
  writeStore(STORE.staff, staff);
  renderAll();
  await syncStaffOrderCloud(sorted);
}

function editStaff(id) {
  const person = staff.find(item => item.id === id);
  if (!person) return;
  el.staffId.value = person.id;
  el.staffName.value = person.name;
  el.staffRole.value = person.role;
  el.staffLeave.value = person.leaveEntitlement;
  el.staffOtBalance.value = person.otBalance;
  el.staffAccessRole.value = person.accessRole || "staff";
  el.staffUsername.value = person.username || "";
  el.staffPassword.value = person.password || "";
  el.staffPassword.type = "password";
  el.staffFormMode.textContent = "Editing";
  setTab("staff");
  el.staffName.focus();
}

async function deleteStaff(id) {
  const person = staff.find(item => item.id === id);
  if (!person || !confirm(`ลบ ${person.name} ออกจากรายชื่อใช่ไหม`)) return;
  if (person.isSystem || person.username === "admin" || person.id === "staff-admin") {
    alert("บัญชี admin เป็นบัญชีระบบ ลบไม่ได้");
    return;
  }
  staff = staff.filter(item => item.id !== id);
  Object.keys(schedule).forEach(key => {
    if (key.includes(`|${id}|`)) delete schedule[key];
  });
  otRecords = otRecords.filter(item => item.staffId !== id);
  locseeRequests = locseeRequests.filter(item => item.staffId !== id);
  writeStore(STORE.staff, staff);
  writeStore(STORE.schedule, schedule);
  writeStore(STORE.ot, otRecords);
  writeStore(STORE.locsee, locseeRequests);
  renderAll();
  await deleteStaffCloud(id);
}

function clearStaffForm() {
  el.staffId.value = "";
  el.staffName.value = "";
  el.staffRole.value = "RN";
  el.staffLeave.value = 15;
  el.staffOtBalance.value = 0;
  el.staffAccessRole.value = "staff";
  el.staffUsername.value = "";
  el.staffPassword.value = "";
  el.staffPassword.type = "password";
  el.staffFormMode.textContent = "New Staff";
}

function populateStaffOptions() {
  normalizeStaffOrder();
  const sorted = orderedStaff(true);
  const options = sorted.map(person => `<option value="${person.id}">${escapeHtml(person.name)} (${escapeHtml(person.role)})</option>`).join("");
  el.otFilterStaff.innerHTML = `<option value="">ทั้งหมด</option>${options}`;
  el.vacationCreditStaff.innerHTML = options;
  const locseeOptions = canManageLeaveRequests()
    ? options
    : sorted.filter(person => person.id === currentUserId).map(person => `<option value="${person.id}">${escapeHtml(person.name)} (${escapeHtml(person.role)})</option>`).join("");
  el.locseeStaff.innerHTML = locseeOptions || options;
  if (currentUserId && !canManageLeaveRequests()) el.locseeStaff.value = currentUserId;
  el.otApprover.innerHTML = `<option value="">ให้ระบบเลือก / หัวหน้าตรวจ</option>${sorted
    .filter(person => canApproveOt(person))
    .map(person => `<option value="${person.id}">${escapeHtml(person.name)} (${escapeHtml(person.role)})</option>`)
    .join("")}`;
  updateSuggestedApprover();
  renderOtMemberList();
}

function renderSchedule() {
  el.subTabs.forEach(button => button.classList.toggle("is-active", button.dataset.group === activeScheduleGroup));
  const days = daysInMonth(el.scheduleMonth.value);
  const people = orderedStaff(true).filter(person => scheduleGroupForRole(person.role) === activeScheduleGroup);
  const disabled = canEditSchedule() ? "" : "disabled";
  el.scheduleGroupLabel.textContent = `${activeScheduleGroup} Ward`;
  el.scheduleMonthLabel.textContent = formatMonthTitle(el.scheduleMonth.value);
  renderScheduleKpis(days);
  renderScheduleSidePanel(days);
  const dayHeaders = days.map(date => {
    const dateObj = parseLocalDate(date);
    const holiday = holidayName(date);
    const holidayTag = holiday ? `<b class="day-holiday">วันหยุด</b>` : "";
    const todayTag = date === iso(new Date()) ? `<b class="today-chip">วันนี้</b>` : "";
    return `<div class="schedule-cell day-head ${dayClass(date)}"${holiday ? ` title="${escapeHtml(holiday)}"` : ""}>${dateObj.getDate()}<br><small>${thaiDay(dateObj)}</small>${todayTag}${holidayTag}</div>`;
  }).join("");

  let previousPosition = "";
  const rows = people.map(person => {
    const position = schedulePositionGroupLabel(person.role);
    const positionLabel = position !== previousPosition ? `<small class="schedule-position-label">${escapeHtml(position)}</small>` : "";
    previousPosition = position;
    return `
      <div class="schedule-cell name">${positionLabel}<strong>${escapeHtml(person.name)}</strong></div>
        ${days.map(date => scheduleInputCell(person, date, disabled)).join("")}
    `;
  }).join("");

  const summaryRows = summaryCodesForGroup(activeScheduleGroup).map(code => `
    <div class="schedule-cell summary-label">${code}</div>
    ${days.map(date => `<div class="schedule-cell summary-cell ${dayClass(date)}">${countShiftCode(date, code, people)}</div>`).join("")}
  `).join("");

  const tableWidth = 195 + (days.length * 48);
  el.scheduleTable.innerHTML = `
    <div class="schedule-month-banner" style="--days:${days.length};--table-width:${tableWidth}px">${formatMonthTitle(el.scheduleMonth.value)}</div>
    <div class="schedule-grid" style="--days:${days.length};--table-width:${tableWidth}px">
      <div class="schedule-cell head diagonal-head"><span>เจ้าหน้าที่</span><b>วันที่</b></div>
      ${dayHeaders}
      ${rows || `<div class="schedule-cell name">ยังไม่มีรายชื่อ ${activeScheduleGroup}</div>${days.map(() => `<div class="schedule-cell"></div>`).join("")}`}
      ${summaryRows}
    </div>
  `;
}

function scheduleInputCell(person, date, disabled) {
  const value = getScheduleValue(el.scheduleMonth.value, person.id, date);
  const className = codeClass(value);
  return `
    <div class="schedule-cell shift-cell ${dayClass(date)} ${className}">
      <select ${disabled} data-schedule data-staff-id="${person.id}" data-date="${date}" aria-label="${escapeHtml(person.name)} ${formatDisplayDate(date)}">
        ${SHIFT_CODES.map(code => `<option value="${code}" ${code === value ? "selected" : ""}>${code || "-"}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderScheduleKpis(days) {
  const rnCount = activeStaff().filter(person => scheduleGroupForRole(person.role) === "RN").length;
  const pnCount = activeStaff().filter(person => scheduleGroupForRole(person.role) === "PN").length;
  const vacationDays = days.reduce((total, date) => total + activeStaff().filter(person => getScheduleValue(el.scheduleMonth.value, person.id, date) === "vac").length, 0);
  const trainingDays = days.reduce((total, date) => total + activeStaff().filter(person => ["อบรม", "ลาศึกษาต่อ"].includes(getScheduleValue(el.scheduleMonth.value, person.id, date))).length, 0);
  const shortageDays = days.filter(date => staffingForDate(date).status === "short").length;
  el.rnTotalKpi.textContent = `${rnCount} คน`;
  el.pnTotalKpi.textContent = `${pnCount} คน`;
  el.vacationKpi.textContent = `${vacationDays} วัน`;
  el.trainingKpi.textContent = `${trainingDays} วัน`;
  el.shortageKpi.textContent = `${shortageDays} วัน`;
}

function renderScheduleSidePanel(days) {
  const today = iso(new Date());
  const selected = days.includes(today) ? today : days[0];
  const staffing = staffingForDate(selected);
  const upcomingVac = upcomingScheduleItems(days, "vac").slice(0, 3);
  const upcomingTraining = [
    ...upcomingScheduleItems(days, "อบรม").map(item => ({ ...item, label: "อบรม" })),
    ...upcomingScheduleItems(days, "ลาศึกษาต่อ").map(item => ({ ...item, label: "ศึกษาต่อ" }))
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  el.scheduleSidePanel.innerHTML = [
    listItem("RN", `${staffing.rn}/${staffing.rnTarget}`),
    listItem("PN", `${staffing.pn}/${staffing.pnTarget}`),
    scheduleLegendHtml(),
    ...upcomingVac.map(item => listItem(`พักร้อน · ${item.name}`, formatDisplayDate(item.date))),
    ...upcomingTraining.map(item => listItem(`${item.label} · ${item.name}`, formatDisplayDate(item.date)))
  ].join("");
}

function scheduleLegendHtml() {
  return `<div class="side-legend" aria-label="คำอธิบายรหัสเวร">
    ${[
      ["dot-r1", "R1"],
      ["dot-r3", "R3"],
      ["dot-r4", "R4"],
      ["dot-rr", "RR"],
      ["dot-s", "S1/S3/S5"],
      ["dot-vac", "VAC"],
      ["dot-study", "ลาศึกษาต่อ"],
      ["dot-training", "อบรม"],
      ["dot-meeting", "ประชุม"],
      ["dot-off", "หยุด"],
      ["dot-holiday", "วันหยุดราชการ"]
    ].map(([dot, label]) => `<span><i class="${dot}"></i>${label}</span>`).join("")}
  </div>`;
}

function staffingForDate(date) {
  const rows = scheduleEntriesForDate(date);
  const rn = rows.filter(item => scheduleGroupForRole(item.role) === "RN" && WORK_CODES.has(item.code)).length;
  const pn = rows.filter(item => scheduleGroupForRole(item.role) === "PN" && WORK_CODES.has(item.code)).length;
  const rnTarget = 1;
  const pnTarget = 1;
  const status = rn < rnTarget || pn < pnTarget ? "short" : rn === rnTarget || pn === pnTarget ? "low" : "complete";
  return { rn, pn, rnTarget, pnTarget, status };
}

function upcomingScheduleItems(days, code) {
  return days.flatMap(date => scheduleEntriesForDate(date)
    .filter(item => item.code === code)
    .map(item => ({ date, name: item.name })));
}

function dayClass(date) {
  const day = parseLocalDate(date).getDay();
  const classes = [];
  if (date === iso(new Date())) classes.push("today");
  if (isHoliday(date)) classes.push("holiday");
  if (day === 6) classes.push("saturday");
  if (day === 0) classes.push("sunday");
  return classes.join(" ");
}

function shiftScheduleMonth(delta) {
  const [year, month] = el.scheduleMonth.value.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  el.scheduleMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  populateDashboardDates();
  renderAll();
}

function getScheduleValue(month, staffId, date) {
  return schedule[scheduleKey(month, staffId, date)] || "";
}

function setScheduleValue(month, staffId, date, value) {
  const key = scheduleKey(month, staffId, date);
  if (value) schedule[key] = value;
  else delete schedule[key];
  writeStore(STORE.schedule, schedule);
}

function scheduleKey(month, staffId, date) {
  return `${month}|${staffId}|${date}`;
}

function scheduleEntriesForDate(date) {
  return activeStaff().map(person => ({
    ...person,
    code: getScheduleValue(date.slice(0, 7), person.id, date)
  })).filter(item => item.code);
}

function countShiftCode(date, code, people) {
  return people.filter(person => getScheduleValue(el.scheduleMonth.value, person.id, date) === code).length || "";
}

function copyPreviousMonthSchedule() {
  const [year, month] = el.scheduleMonth.value.split("-").map(Number);
  const current = new Date(year, month - 1, 1);
  const previous = new Date(year, month - 2, 1);
  const prevMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
  const currentDays = daysInMonth(el.scheduleMonth.value);
  const previousDays = daysInMonth(prevMonth);

  activeStaff().forEach(person => {
    currentDays.forEach((date, index) => {
      const sourceDate = previousDays[index];
      if (!sourceDate) return;
      const value = getScheduleValue(prevMonth, person.id, sourceDate);
      if (value) setScheduleValue(el.scheduleMonth.value, person.id, date, value);
    });
  });
  renderAll();
}

function saveOtRecord(event) {
  event.preventDefault();
  const selectedIds = [...el.otMemberList.querySelectorAll("input[type='checkbox']:checked")].map(input => input.value);
  const selectedPeople = orderedStaff(true).filter(person => selectedIds.includes(person.id));
  if (!selectedPeople.length) {
    alert("กรุณาเลือกสมาชิกที่ได้ OT อย่างน้อย 1 คน");
    return;
  }
  const deductMinutes = Math.max(0, Number(el.otDeductMinutes.value || 0));
  const result = calculateOt(el.otStart.value, el.otEnd.value, deductMinutes);
  const suggestion = suggestApprover(el.otDate.value, el.otRoom.value);
  const selectedApprover = staff.find(item => item.id === el.otApprover.value) || suggestion.approver;
  const batchId = crypto.randomUUID();
  selectedPeople.forEach(person => otRecords.push({
    id: crypto.randomUUID(),
    batchId,
    date: el.otDate.value,
    staffId: person.id,
    staffName: person.name,
    role: person.role,
    room: el.otRoom.value,
    start: el.otStart.value,
    end: el.otEnd.value,
    otHours: result.hours,
    extraMinutes: result.minutes,
    deductMinutes,
    suggestedApproverId: suggestion.approver?.id || "",
    suggestedApproverName: suggestion.approver?.name || "",
    approverId: selectedApprover?.id || "",
    approverName: selectedApprover?.name || "Head Nurse / Admin",
    approverReason: suggestion.reason,
    note: el.otNote.value.trim(),
    hospitalPosted: false,
    hospitalPostedBy: "",
    hospitalPostedAt: "",
    approvedBy: "",
    approvedAt: ""
  }));
  writeStore(STORE.ot, otRecords);
  el.otNote.value = "";
  el.otDeductMinutes.value = 0;
  renderAll();
}

function renderOt() {
  const rows = filteredOtRows();
  renderOtKpis();
  el.otRows.innerHTML = rows.map(item => {
    const status = otStatus(item);
    return `
      <article class="ot-timeline-item">
        <div class="ot-date-dot"><strong>${parseLocalDate(item.date).getDate()}</strong><span>${thaiMonthShort(item.date)}</span></div>
        <div class="ot-record-main">
          <div>
            <strong>${escapeHtml(item.staffName)}</strong>
            <span>${escapeHtml(positionLabel(item.role))} · ${escapeHtml(item.room || "-")}</span>
          </div>
          <p>${item.type === "vacation_credit" ? "Vacation Conversion" : `${formatTime(item.start)} - ${formatTime(item.end)}`} · ${item.otHours} ชั่วโมง${Number(item.extraMinutes || 0) ? ` ${item.extraMinutes} นาทีสะสม` : ""}</p>
          <small class="${item.note?.includes("หยุด") ? "red-note" : ""}">${escapeHtml(item.note || item.approverReason || "-")}</small>
        </div>
        <div class="ot-record-status">
          <span class="ot-status ${status.className}">${status.label}</span>
          ${item.hospitalPosted ? `<span class="status-pill done">ลงระบบ รพ.แล้ว</span>` : `<button class="btn small" type="button" data-hospital-ot="${item.id}">ลงระบบแล้ว</button>`}
        </div>
        <div class="ot-record-actions">
          ${!item.approvedBy && canApproveRecord(item) ? `<button class="btn small" type="button" data-approve-ot="${item.id}">รับรองชุด</button>` : ""}
          ${canEditOtRecord(item) ? `<button class="btn small" type="button" data-edit-ot="${item.id}">แก้</button>` : ""}
          ${canDeleteOtRecord(item) ? `<button class="btn small danger" type="button" data-delete-ot="${item.id}">ลบ</button>` : ""}
        </div>
      </article>
    `;
  }).join("") || `<div class="ot-empty"><div class="empty-mascot">👩‍⚕️</div><strong>ยังไม่มีข้อมูล OT</strong><small>ลองเพิ่มรายการ OT หรือปรับตัวกรองใหม่</small><button class="btn primary" type="button" id="emptyAddOt">เพิ่มรายการ OT</button></div>`;
  document.querySelector("#emptyAddOt")?.addEventListener("click", () => el.otDate.focus());
  renderOtSummary();
}

function renderOtSummary() {
  const byPerson = new Map();
  activeStaff().forEach(person => byPerson.set(person.id, { person, hours: 0, minutes: 0, pending: 0 }));
  otRecords.forEach(item => {
    if (!byPerson.has(item.staffId)) return;
    const row = byPerson.get(item.staffId);
    row.hours += Number(item.otHours || 0);
    row.minutes += Number(item.extraMinutes || 0);
    if (!item.approvedBy) row.pending += 1;
  });

  const rows = [...byPerson.values()]
    .filter(row => row.hours || row.minutes || row.pending)
    .sort((a, b) => totalOtMinutes(b) - totalOtMinutes(a) || a.person.name.localeCompare(b.person.name, "th"));
  el.otPersonSummary.innerHTML = rows.map(row => otSummaryListItem(row)).join("") || emptyItem("ยังไม่มี OT สะสม");
  renderOtProfile(rows, byPerson);
  renderOtLeaderboard(rows);
}

function filteredOtRows() {
  const staffFilter = el.otFilterStaff.value;
  const monthFilter = el.otFilterMonth.value;
  const typeFilter = el.otFilterType.value;
  const statusFilter = el.otFilterStatus.value;
  return otRecords
    .filter(item => canSeeOtRecord(item))
    .filter(item => !staffFilter || item.staffId === staffFilter)
    .filter(item => !monthFilter || item.date.startsWith(monthFilter))
    .filter(item => !typeFilter || positionLabel(item.role) === typeFilter)
    .filter(item => !statusFilter || otStatus(item).key === statusFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || a.staffName.localeCompare(b.staffName, "th"));
}

function renderOtKpis() {
  const month = el.otFilterMonth.value || el.scheduleMonth.value;
  const visible = otRecords.filter(item => canSeeOtRecord(item));
  const monthRows = visible.filter(item => item.date.startsWith(month) && item.type !== "vacation_credit");
  const monthHours = monthRows.reduce((total, item) => total + Number(item.otHours || 0), 0);
  const people = new Set(monthRows.map(item => item.staffId)).size;
  const vacationBank = visible
    .filter(item => item.type === "vacation_credit")
    .reduce((total, item) => total + Number(item.otHours || 0), 0);
  const pending = visible.filter(item => !item.approvedBy).length;
  el.otMonthKpi.textContent = `${monthHours} ชั่วโมง`;
  el.otPeopleKpi.textContent = `${people} คน`;
  el.otVacationBankKpi.textContent = `${vacationBank} ชั่วโมง`;
  el.otRecordKpi.textContent = `${monthRows.length} รายการ`;
  el.otPendingKpi.textContent = `${pending} รายการ`;
}

function renderOtProfile(rows, byPerson) {
  const query = (el.otSummarySearch.value || "").trim().toLowerCase();
  const month = el.otFilterMonth.value || el.scheduleMonth.value;
  const candidates = activeStaff().filter(person => {
    if (!query) return true;
    return [person.name, person.username, person.role, accessLabel(person.accessRole)].join(" ").toLowerCase().includes(query);
  });
  const person = candidates.find(item => byPerson.get(item.id) && totalOtMinutes(byPerson.get(item.id)) > 0) || candidates[0] || activeStaff()[0];
  if (!person) {
    el.otProfileCard.innerHTML = emptyItem("ยังไม่มีข้อมูลเจ้าหน้าที่");
    return;
  }
  const summary = byPerson.get(person.id) || { person, hours: 0, minutes: 0, pending: 0 };
  const totalMinutes = totalOtMinutes(summary);
  const monthMinutes = otRecords
    .filter(item => item.staffId === person.id && item.date.startsWith(month))
    .reduce((total, item) => total + Number(item.otHours || 0) * 60 + Number(item.extraMinutes || 0), 0);
  const year = month.slice(0, 4);
  const yearMinutes = otRecords
    .filter(item => item.staffId === person.id && item.date.startsWith(year))
    .reduce((total, item) => total + Number(item.otHours || 0) * 60 + Number(item.extraMinutes || 0), 0);
  const vacationMinutes = otRecords
    .filter(item => item.staffId === person.id && item.type === "vacation_credit")
    .reduce((total, item) => total + Number(item.otHours || 0) * 60 + Number(item.extraMinutes || 0), 0);
  el.otProfileCard.innerHTML = `
    <div class="ot-profile-head">
      <div><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(accessLabel(person.accessRole))}</small></div>
    </div>
    <div class="ot-profile-kpis">
      <article><span>⏱ OT สะสม</span><strong>${formatDurationMinutes(totalMinutes)}</strong></article>
      <article><span>🏖 Vacation Bank</span><strong>${formatDurationMinutes(vacationMinutes)}</strong></article>
      <article><span>📅 OT เดือนนี้</span><strong>${formatDurationMinutes(monthMinutes)}</strong></article>
      <article><span>📈 OT ปีนี้</span><strong>${formatDurationMinutes(yearMinutes)}</strong></article>
    </div>
  `;
}

function renderOtLeaderboard(rows) {
  const month = el.otFilterMonth.value || el.scheduleMonth.value;
  const monthly = new Map();
  activeStaff().forEach(person => monthly.set(person.id, { person, hours: 0, minutes: 0 }));
  otRecords
    .filter(item => item.date.startsWith(month) && item.type !== "vacation_credit" && monthly.has(item.staffId))
    .forEach(item => {
      const row = monthly.get(item.staffId);
      row.hours += Number(item.otHours || 0);
      row.minutes += Number(item.extraMinutes || 0);
    });
  const top = [...monthly.values()]
    .filter(row => totalOtMinutes(row) > 0)
    .sort((a, b) => totalOtMinutes(b) - totalOtMinutes(a))
    .slice(0, 5);
  el.otLeaderboard.innerHTML = top.map((row, index) => `
    <div class="leader-row">
      <span>${index + 1}</span>
      <strong>${escapeHtml(row.person.name)}</strong>
      <em>${formatDurationMinutes(totalOtMinutes(row))}</em>
    </div>
  `).join("") || emptyItem("ยังไม่มี OT เดือนนี้");
}

function otSummaryListItem(row) {
  const converted = normalizeMinutes(row.minutes);
  const totalHours = row.hours + converted.hours;
  const leaveDays = Math.floor((totalHours * 60 + converted.minutes) / (7 * 60));
  const remainMinutes = (totalHours * 60 + converted.minutes) % (7 * 60);
  return listItem(`${row.person.name} (${row.person.role})`, `${totalHours} ชม. + สะสม ${converted.minutes} นาที · หยุดได้ ${leaveDays} วัน${remainMinutes ? ` เหลือ ${formatDurationMinutes(remainMinutes)}` : ""}${row.pending ? ` · รอตรวจ ${row.pending}` : ""}`);
}

function totalOtMinutes(row) {
  return Number(row.hours || 0) * 60 + Number(row.minutes || 0);
}

function otStatus(item) {
  if (item.approvedBy) return { key: "approved", label: "Approved", className: "is-approved" };
  return { key: "pending", label: "Pending", className: "is-pending" };
}

function thaiMonthShort(dateText) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { month: "short" }).format(parseLocalDate(dateText));
}

function updateOtLiveTotal() {
  if (!el.otLiveTotal) return;
  const result = calculateOt(el.otStart.value, el.otEnd.value, el.otDeductMinutes.value);
  el.otLiveTotal.textContent = `${result.hours} ชั่วโมง ${result.minutes} นาที`;
}

function clearOtForm() {
  el.otRoom.value = "R1";
  el.otStart.value = "16:30";
  el.otEnd.value = "17:30";
  el.otNote.value = "";
  el.otDeductMinutes.value = 0;
  updateSuggestedApprover();
  renderOtMemberList();
  updateOtLiveTotal();
}

function saveVacationCredit(event) {
  event.preventDefault();
  const person = staff.find(item => item.id === el.vacationCreditStaff.value);
  if (!person) return;
  const days = Math.max(1, Number(el.vacationCreditDays.value || 1));
  otRecords.push({
    id: crypto.randomUUID(),
    batchId: crypto.randomUUID(),
    type: "vacation_credit",
    date: iso(new Date()),
    staffId: person.id,
    staffName: person.name,
    role: person.role,
    room: "Vacation",
    start: "",
    end: "",
    otHours: days * 7,
    extraMinutes: 0,
    deductMinutes: 0,
    suggestedApproverId: "",
    suggestedApproverName: "",
    approverId: currentUserId,
    approverName: currentUser()?.name || "Admin",
    approverReason: "Vacation ไม่ได้ใช้ สมทบเป็นชั่วโมงสะสม",
    note: `Vacation ไม่ได้ใช้ ${days} วัน`,
    hospitalPosted: false,
    hospitalPostedBy: "",
    hospitalPostedAt: "",
    approvedBy: currentUser()?.name || "",
    approvedAt: iso(new Date())
  });
  writeStore(STORE.ot, otRecords);
  el.vacationCreditDays.value = 1;
  renderAll();
}

function approveOtRecord(id) {
  const record = otRecords.find(item => item.id === id);
  if (!record) return;
  if (!canApproveRecord(record)) {
    alert("บัญชีนี้ไม่มีสิทธิ์ตรวจรายการ OT นี้");
    return;
  }
  const name = prompt("ชื่อพยาบาล incharge ที่ตรวจสอบ", record.approverName || "Incharge");
  if (!name) return;
  const batchRecords = otRecords.filter(item => item.batchId && item.batchId === record.batchId);
  const targets = batchRecords.length ? batchRecords : [record];
  targets.forEach(item => {
    item.approvedBy = name.trim();
    item.approvedAt = iso(new Date());
  });
  writeStore(STORE.ot, otRecords);
  renderAll();
}

function renderOtMemberList() {
  if (!el.otMemberList) return;
  const date = el.otDate.value;
  const room = el.otRoom.value;
  const scheduledIds = new Set(orderedStaff(true)
    .filter(person => getScheduleValue(date.slice(0, 7), person.id, date) === room)
    .map(person => person.id));
  if (!scheduledIds.size && currentUserId) scheduledIds.add(currentUserId);
  el.otMemberList.innerHTML = orderedStaff(true).map(person => {
    const shiftCode = getScheduleValue(date.slice(0, 7), person.id, date);
    const checked = scheduledIds.has(person.id) ? "checked" : "";
    const selectedText = checked ? "เลือกแล้ว" : "เลือก";
    return `
      <label class="member-option ${checked ? "is-suggested" : ""}">
        <input type="checkbox" value="${person.id}" ${checked}>
        <strong>${escapeHtml(person.name)}</strong>
        <small>${escapeHtml(positionLabel(person.role))}${shiftCode ? ` · ${escapeHtml(shiftCode)}` : ""}</small>
        <em>${selectedText}</em>
      </label>
    `;
  }).join("");
}

function editOtRecord(id) {
  const record = otRecords.find(item => item.id === id);
  if (!record || !canEditOtRecord(record)) {
    alert("บัญชีนี้ไม่มีสิทธิ์แก้รายการ OT นี้");
    return;
  }
  const start = prompt("เวลาเริ่ม OT", record.start);
  if (!start) return;
  const end = prompt("เวลาสิ้นสุด OT", record.end);
  if (!end) return;
  const deductMinutes = Number(prompt("หักเวลา OT (นาที)", record.deductMinutes || 0) || 0);
  const result = calculateOt(start, end, Math.max(0, deductMinutes));
  record.start = start;
  record.end = end;
  record.deductMinutes = Math.max(0, deductMinutes);
  record.otHours = result.hours;
  record.extraMinutes = result.minutes;
  record.note = prompt("หมายเหตุ", record.note || "") ?? record.note;
  record.approvedBy = "";
  record.approvedAt = "";
  writeStore(STORE.ot, otRecords);
  renderAll();
}

function toggleHospitalPosted(id) {
  const record = otRecords.find(item => item.id === id);
  if (!record) return;
  record.hospitalPosted = !record.hospitalPosted;
  record.hospitalPostedBy = record.hospitalPosted ? currentUser()?.name || "ผู้บันทึก" : "";
  record.hospitalPostedAt = record.hospitalPosted ? iso(new Date()) : "";
  writeStore(STORE.ot, otRecords);
  renderAll();
}

function updateSuggestedApprover() {
  if (!el.otApprover || !el.otDate.value || !el.otRoom.value) return;
  const suggestion = suggestApprover(el.otDate.value, el.otRoom.value);
  el.otApprover.value = suggestion.approver?.id || "";
  el.otApproverHint.textContent = suggestion.approver
    ? `ระบบแนะนำ ${suggestion.approver.name}: ${suggestion.reason}`
    : `ระบบแนะนำ Head Nurse/Admin: ${suggestion.reason}`;
}

function suggestApprover(date, room) {
  const dayEntries = orderedStaff(true).map(person => ({
    person,
    code: getScheduleValue(date.slice(0, 7), person.id, date)
  }));
  const sameRoomRn = dayEntries.find(item => isRnApprover(item.person) && item.code === room);
  if (sameRoomRn) return { approver: sameRoomRn.person, reason: `RN senior สุดที่อยู่ ${room} ตามตารางเวร` };

  const anyWorkingRn = dayEntries.find(item => isRnApprover(item.person) && WORK_CODES.has(item.code));
  if (anyWorkingRn) return { approver: anyWorkingRn.person, reason: `ไม่พบ RN ใน ${room} จึงเลือก RN senior สุดที่อยู่เวรวันนั้น` };

  const head = orderedStaff(true).find(person => canApproveOt(person));
  return { approver: head || null, reason: `ไม่พบ RN ที่อยู่เวรจากตาราง ใช้หัวหน้า/Admin ตรวจแทน` };
}

function deleteOtRecord(id) {
  const record = otRecords.find(item => item.id === id);
  if (!record || !canDeleteOtRecord(record)) {
    alert("บัญชีนี้ไม่มีสิทธิ์ลบรายการ OT นี้");
    return;
  }
  if (!confirm("ลบรายการ OT นี้ใช่ไหม")) return;
  otRecords = otRecords.filter(item => item.id !== id);
  writeStore(STORE.ot, otRecords);
  renderAll();
}

function saveLocseeRequest(event) {
  event.preventDefault();
  const staffPerson = staff.find(item => item.id === el.locseeStaff.value);
  if (!staffPerson) return;
  if (!canManageLeaveRequests() && staffPerson.id !== currentUserId) {
    alert("บัญชีนี้ส่งคำขอลาแทนผู้อื่นไม่ได้");
    return;
  }
  if (el.locseeEndDate.value < el.locseeStartDate.value) {
    alert("End Date ต้องไม่ก่อน Start Date");
    return;
  }

  const id = el.locseeRequestId.value || crypto.randomUUID();
  const previous = locseeRequests.find(item => item.id === id);
  const now = iso(new Date());
  const request = {
    id,
    staffId: staffPerson.id,
    staffName: staffPerson.name,
    role: staffPerson.role,
    startDate: el.locseeStartDate.value,
    endDate: el.locseeEndDate.value,
    type: el.locseeType.value,
    priority: el.locseePriority.value,
    note: el.locseeNote.value.trim(),
    status: previous?.status || "pending",
    syncedAt: previous?.syncedAt || "",
    requestedBy: previous?.requestedBy || currentUser()?.name || staffPerson.name,
    requestedAt: previous?.requestedAt || now,
    decidedBy: previous?.decidedBy || "",
    decidedAt: previous?.decidedAt || ""
  };

  const index = locseeRequests.findIndex(item => item.id === id);
  if (index >= 0) locseeRequests[index] = request;
  else locseeRequests.unshift(request);
  writeStore(STORE.locsee, locseeRequests);
  clearLocseeForm();
  renderAll();
}

function renderLocsee() {
  if (!el.locseeRows) return;
  renderLocseeImpact();
  renderLocseeKpis();
  renderLocseeCalendar();
  renderLocseeRows();
  renderLocseeVacationTable();
  renderLocseeSlots();
}

function renderLocseeKpis() {
  const monthRows = locseeRequestsForMonth(el.locseeMonth.value);
  el.locseePendingKpi.textContent = monthRows.filter(item => item.status === "pending").length;
  el.locseeApprovedKpi.textContent = monthRows.filter(item => item.status === "approved").length;
  el.locseeUsedKpi.textContent = monthRows
    .filter(item => item.status === "approved")
    .reduce((total, item) => total + leaveDates(item).filter(date => date.startsWith(el.locseeMonth.value)).length, 0);
  el.locseeSyncedKpi.textContent = monthRows.filter(item => item.syncedAt).length;
}

function renderLocseeImpact() {
  if (!el.locseeImpact || !el.locseeStaff.value || !el.locseeStartDate.value || !el.locseeEndDate.value) return;
  if (el.locseeEndDate.value < el.locseeStartDate.value) {
    el.locseeImpact.innerHTML = `<strong>Date range needs attention</strong><small>End Date must be the same as or after Start Date.</small>`;
    return;
  }
  const dates = dateRange(el.locseeStartDate.value, el.locseeEndDate.value);
  const person = staff.find(item => item.id === el.locseeStaff.value);
  const busy = dates
    .map(date => ({ date, code: getScheduleValue(date.slice(0, 7), el.locseeStaff.value, date) }))
    .filter(item => item.code);
  const approvedUsed = approvedLeaveDaysForStaff(el.locseeStaff.value, el.locseeRequestId.value);
  const entitlement = Number(person?.leaveEntitlement || 0);
  const remaining = Math.max(0, entitlement - approvedUsed);
  el.locseeImpact.innerHTML = `
    <strong>${dates.length} day${dates.length > 1 ? "s" : ""} requested</strong>
    <small>Leave balance: ${remaining}/${entitlement} days · Schedule conflicts: ${busy.length}</small>
    ${busy.length ? `<div class="locsee-conflicts">${busy.map(item => `<span>${formatShortDate(item.date)} · ${escapeHtml(item.code)}</span>`).join("")}</div>` : ""}
  `;
}

function renderLocseeCalendar() {
  const days = daysInMonth(el.locseeMonth.value);
  const approved = visibleLocseeRequests()
    .filter(item => item.status === "approved")
    .flatMap(item => leaveDates(item).map(date => ({ ...item, date })))
    .filter(item => item.date.startsWith(el.locseeMonth.value));

  el.locseeCalendar.innerHTML = days.map(date => {
    const rows = approved.filter(item => item.date === date);
    const labels = rows.slice(0, 2).map(item => `<b>${escapeHtml(item.staffName)}</b>`).join("");
    return `
      <div class="locsee-day ${dayClass(date)} ${rows.length ? "has-leave" : ""}">
        <span>${parseLocalDate(date).getDate()}</span>
        ${labels}
        ${rows.length > 2 ? `<em>+${rows.length - 2}</em>` : ""}
      </div>
    `;
  }).join("");

  const upcoming = visibleLocseeRequests()
    .filter(item => item.status === "approved" && item.endDate >= iso(new Date()))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);
  el.locseeUpcoming.innerHTML = upcoming.length
    ? upcoming.map(item => listItem(`${leaveTypeLabel(item.type)} · ${item.staffName}`, `${formatDisplayDate(item.startDate)} - ${formatDisplayDate(item.endDate)}`)).join("")
    : emptyItem("No approved leave coming up");
}

function renderLocseeRows() {
  const status = el.locseeStatusFilter.value;
  const rows = locseeRequestsForMonth(el.locseeMonth.value)
    .filter(item => !status || item.status === status)
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.startDate.localeCompare(b.startDate));

  el.locseeRows.innerHTML = rows.map(item => {
    const dates = leaveDates(item);
    const conflicts = dates.filter(date => getScheduleValue(date.slice(0, 7), item.staffId, date));
    return `
      <article class="locsee-row">
        <div class="locsee-row-main">
          <strong>${escapeHtml(item.staffName)}</strong>
          <span>${escapeHtml(leaveTypeLabel(item.type))} · ${formatDisplayDate(item.startDate)} - ${formatDisplayDate(item.endDate)}</span>
          <small>${dates.length} day${dates.length > 1 ? "s" : ""} · ${escapeHtml(item.priority)} priority${conflicts.length ? ` · ${conflicts.length} schedule conflict(s)` : ""}</small>
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        </div>
        <div class="locsee-row-status">
          <span class="status-pill ${item.status === "approved" ? "done" : ""}">${escapeHtml(item.status)}</span>
          ${item.syncedAt ? `<small>Synced ${formatDisplayDate(item.syncedAt)}</small>` : ""}
        </div>
        <div class="locsee-row-actions">
          ${canEditLeaveRequest(item) ? `<button class="btn small" type="button" data-edit-locsee="${item.id}">Edit</button>` : ""}
          ${canManageLeaveRequests() && item.status !== "approved" ? `<button class="btn small primary" type="button" data-approve-locsee="${item.id}">Approve</button>` : ""}
          ${canManageLeaveRequests() && item.status !== "rejected" ? `<button class="btn small" type="button" data-reject-locsee="${item.id}">Reject</button>` : ""}
          ${canManageLeaveRequests() && item.status === "approved" ? `<button class="btn small" type="button" data-sync-locsee="${item.id}">Sync</button>` : ""}
          ${canDeleteLeaveRequest(item) ? `<button class="btn small danger" type="button" data-delete-locsee="${item.id}">Delete</button>` : ""}
        </div>
      </article>
    `;
  }).join("") || `<div class="ot-empty"><strong>No LOCSee requests</strong><small>Submit a leave request to start building the master calendar.</small></div>`;
}

function renderLocseeVacationTable() {
  if (!el.locseeVacationGrid) return;
  const months = locseeFiscalMonths(resolveLocseeCalendarMonth(el.locseeMonth.value));
  const fiscalBe = months[11].year + 543;
  const sourceLabel = locseeCloudLoaded ? "Online/Supabase" : locseeCloudStatus;
  const fiscalSlots = locseeSlots.filter(slot => locseeSlotInMonths(slot, months));
  const fiscalBookings = locseeBookings.filter(item => fiscalSlots.some(slot => sameId(bookingSlotId(item), slot.id)));
  const matchedBookings = fiscalBookings.filter(item => fiscalSlots.some(slot => sameId(bookingSlotId(item), slot.id))).length;
  el.locseeVacationYearLabel.textContent = `${sourceLabel} · ${fiscalSlots.length} fiscal slots · ${fiscalBookings.length} bookings · ${matchedBookings} matched · ปีงบประมาณ ${fiscalBe} · ${formatMonthTitle(`${months[0].year}-${String(months[0].month).padStart(2, "0")}`)} - ${formatMonthTitle(`${months[11].year}-${String(months[11].month).padStart(2, "0")}`)}`;
  el.locseeVacationGrid.innerHTML = months.map(month => locseeVacationMonthCard(month)).join("");
}

function locseeVacationMonthCard(monthInfo) {
  const monthValue = `${monthInfo.year}-${String(monthInfo.month).padStart(2, "0")}`;
  const days = daysInMonth(monthValue);
  const firstOffset = parseLocalDate(days[0]).getDay();
  const blankCells = Array.from({ length: firstOffset }, () => `<div class="locsee-vac-day is-empty"></div>`).join("");
  const dayCells = days.map(date => locseeVacationDayCell(date)).join("");
  return `
    <section class="locsee-vac-month">
      <h4>${formatMonthTitle(monthValue)}</h4>
      <div class="locsee-vac-weekdays">
        ${["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(day => `<span>${day}</span>`).join("")}
      </div>
      <div class="locsee-vac-days">${blankCells}${dayCells}</div>
    </section>
  `;
}

function locseeVacationDayCell(date) {
  const slots = locseeSlotsForDate(date);
  const winners = uniqueNames(slots.flatMap(slotWinners));
  const bookingNames = uniqueNames(slots.flatMap(slot => bookingsForSlot(slot.id).map(bookingPersonName)));
  const displayNames = winners.length ? winners : bookingNames;
  const holiday = holidayName(date);
  const classes = [
    "locsee-vac-day",
    isWeekend(date) ? "is-weekend" : "",
    holiday ? "is-holiday" : "",
    slots.length ? "has-slot" : "",
    bookingNames.length ? "has-booking" : "",
    winners.length ? "has-winner" : ""
  ].filter(Boolean).join(" ");
  const title = [
    formatDisplayDate(date),
    holiday,
    slots.length ? slots.map(slot => `${slot.label || slotDateLabel(slot)} (${bookingsForSlot(slot.id).length})`).join(" / ") : "",
    bookingNames.length ? `Bookings: ${bookingNames.join(", ")}` : "",
    winners.length ? `Winner: ${winners.join(", ")}` : ""
  ].filter(Boolean).join(" · ");
  return `
    <div class="${classes}" title="${escapeHtml(title)}">
      <span>${parseLocalDate(date).getDate()}</span>
      ${displayNames.length ? `<b>${escapeHtml(displayNames.slice(0, 2).join(", "))}</b>` : ""}
    </div>
  `;
}

function editLocseeRequest(id) {
  const request = locseeRequests.find(item => item.id === id);
  if (!request || !canEditLeaveRequest(request)) {
    alert("บัญชีนี้ไม่มีสิทธิ์แก้คำขอลานี้");
    return;
  }
  el.locseeRequestId.value = request.id;
  el.locseeStaff.value = request.staffId;
  el.locseeStartDate.value = request.startDate;
  el.locseeEndDate.value = request.endDate;
  el.locseeType.value = request.type;
  el.locseePriority.value = request.priority;
  el.locseeNote.value = request.note || "";
  el.locseeFormMode.textContent = "Editing";
  renderLocseeImpact();
  setTab("locsee");
  el.locseeStartDate.focus();
}

function approveLocseeRequest(id) {
  if (!canManageLeaveRequests()) {
    alert("บัญชีนี้ไม่มีสิทธิ์อนุมัติคำขอลา");
    return;
  }
  const request = locseeRequests.find(item => item.id === id);
  if (!request) return;
  request.status = "approved";
  request.decidedBy = currentUser()?.name || "Approver";
  request.decidedAt = iso(new Date());
  writeStore(STORE.locsee, locseeRequests);
  renderAll();
}

function rejectLocseeRequest(id) {
  if (!canManageLeaveRequests()) {
    alert("บัญชีนี้ไม่มีสิทธิ์ปฏิเสธคำขอลา");
    return;
  }
  const request = locseeRequests.find(item => item.id === id);
  if (!request) return;
  request.status = "rejected";
  request.decidedBy = currentUser()?.name || "Approver";
  request.decidedAt = iso(new Date());
  writeStore(STORE.locsee, locseeRequests);
  renderAll();
}

function syncLocseeRequest(id) {
  if (!canManageLeaveRequests()) {
    alert("บัญชีนี้ไม่มีสิทธิ์ sync คำขอลา");
    return;
  }
  const request = locseeRequests.find(item => item.id === id);
  if (!request || request.status !== "approved") return;
  leaveDates(request).forEach(date => {
    setScheduleValue(date.slice(0, 7), request.staffId, date, scheduleCodeForLeaveType(request.type));
  });
  request.syncedAt = iso(new Date());
  writeStore(STORE.locsee, locseeRequests);
  renderAll();
}

function deleteLocseeRequest(id) {
  const request = locseeRequests.find(item => item.id === id);
  if (!request || !canDeleteLeaveRequest(request)) {
    alert("บัญชีนี้ไม่มีสิทธิ์ลบคำขอลานี้");
    return;
  }
  if (!confirm(`Delete leave request for ${request.staffName}?`)) return;
  locseeRequests = locseeRequests.filter(item => item.id !== id);
  writeStore(STORE.locsee, locseeRequests);
  renderAll();
}

function clearLocseeForm() {
  el.locseeRequestId.value = "";
  const canSelectCurrentUser = [...el.locseeStaff.options].some(option => option.value === currentUserId);
  if (canSelectCurrentUser) el.locseeStaff.value = currentUserId;
  else if (el.locseeStaff.options.length) el.locseeStaff.value = el.locseeStaff.options[0].value;
  const today = iso(new Date());
  el.locseeStartDate.value = today;
  el.locseeEndDate.value = today;
  el.locseeType.value = "annual";
  el.locseePriority.value = "normal";
  el.locseeNote.value = "";
  el.locseeFormMode.textContent = "Draft";
  renderLocseeImpact();
}

function visibleLocseeRequests() {
  if (canManageLeaveRequests()) return [...locseeRequests];
  return locseeRequests.filter(item => item.staffId === currentUserId);
}

function locseeRequestsForMonth(month) {
  return visibleLocseeRequests().filter(item => item.startDate.slice(0, 7) <= month && item.endDate.slice(0, 7) >= month);
}

function leaveDates(request) {
  return dateRange(request.startDate, request.endDate);
}

function dateRange(startDate, endDate) {
  const rows = [];
  for (let day = parseLocalDate(startDate); day <= parseLocalDate(endDate); day.setDate(day.getDate() + 1)) {
    rows.push(iso(day));
  }
  return rows;
}

function approvedLeaveDaysForStaff(staffId, excludeId = "") {
  return locseeRequests
    .filter(item => item.staffId === staffId && item.id !== excludeId && item.status === "approved")
    .reduce((total, item) => total + leaveDates(item).length, 0);
}

function scheduleCodeForLeaveType(type) {
  if (type === "study") return SHIFT_CODES[9];
  if (type === "training") return SHIFT_CODES[10];
  if (type === "meeting") return SHIFT_CODES[11];
  return "vac";
}

function leaveTypeLabel(type) {
  return ({ annual: "Vacation", personal: "Personal Leave", sick: "Sick Leave", study: "Study Leave", training: "Training", meeting: "Meeting" })[type] || "Leave";
}

function statusRank(status) {
  return ({ pending: 0, approved: 1, rejected: 2 })[status] ?? 9;
}

function initLocseeSupabase() {
  const shiftmateConfig = window.SHIFTMATE_CONFIG || {};
  const locseeConfig = window.LOCVAC_SUPABASE || {};
  const supabaseUrl = shiftmateConfig.supabaseUrl || locseeConfig.url || "";
  const supabaseAnonKey = shiftmateConfig.supabaseAnonKey || locseeConfig.anonKey || "";
  if (!supabaseUrl || !supabaseAnonKey) {
    locseeCloudStatus = "Supabase config missing";
    return;
  }
  if (!window.supabase) {
    locseeCloudStatus = "Supabase SDK not loaded";
    return;
  }
  locseeDb = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  locseeCloudEnabled = true;
  locseeCloudStatus = "Supabase not loaded";
}

async function loadLocseeCloudData() {
  if (!locseeDb) return false;
  const localSlots = readStore(STORE.locseeSlots, []);
  const localBookings = readStore(STORE.locseeBookings, []);
  const localHolidays = readStore(STORE.locseeHolidays, []);
  try {
    const [slotRes, bookingRes, holidayRes] = await Promise.all([
      locseeDb.from("loc_slots").select("*").order("start_date", { ascending: true }),
      locseeDb.from("loc_bookings").select("*").order("created_at", { ascending: true }),
      locseeDb.from("special_holidays").select("*").order("holiday_date", { ascending: true })
    ]);
    if (slotRes.error) throw slotRes.error;
    if (bookingRes.error) throw bookingRes.error;
    if (holidayRes.error) throw holidayRes.error;
    const cloudSlots = slotRes.data || [];
    const cloudBookings = bookingRes.data || [];
    const cloudHolidays = holidayRes.data || [];
    if (!cloudSlots.length && localSlots.length) {
      locseeSlots = localSlots;
      locseeBookings = localBookings;
      locseeSpecialHolidays = localHolidays;
      locseeCloudLoaded = true;
      renderAll();
      await seedLocseeCloudFromLocal(localSlots, localBookings, localHolidays);
      return true;
    }
    locseeSlots = cloudSlots;
    locseeBookings = cloudBookings;
    locseeSpecialHolidays = cloudHolidays;
    locseeCloudLoaded = true;
    writeLocseeBookingStore();
    renderAll();
    return true;
  } catch (error) {
    console.warn("LOCSee Supabase load failed", error);
    locseeCloudLoaded = false;
    locseeCloudStatus = "Supabase load failed";
    renderAll();
    return false;
  }
}

async function seedLocseeCloudFromLocal(slots, bookings, holidays) {
  if (!locseeDb || !slots.length) return false;
  try {
    const { error: slotError } = await locseeDb.from("loc_slots").insert(slots.map(locseeSlotCloudRow));
    if (slotError) throw slotError;
    if (bookings.length) {
      const { error: bookingError } = await locseeDb.from("loc_bookings").insert(bookings.map(locseeBookingCloudRow));
      if (bookingError) throw bookingError;
    }
    if (holidays.length) {
      const { error: holidayError } = await locseeDb.from("special_holidays").insert(holidays.map(locseeHolidayCloudRow));
      if (holidayError) throw holidayError;
    }
    await loadLocseeCloudData();
    return true;
  } catch (error) {
    console.warn("LOCSee local seed failed", error);
    return false;
  }
}

async function createLocseeSlotCloud(slot, bookingRows) {
  if (!locseeDb) return false;
  try {
    const { error: slotError } = await locseeDb.from("loc_slots").insert(locseeSlotCloudRow(slot));
    if (slotError) throw slotError;
    if (bookingRows.length) {
      const { error: bookingError } = await locseeDb.from("loc_bookings").insert(bookingRows.map(locseeBookingCloudRow));
      if (bookingError) throw bookingError;
    }
    await loadLocseeCloudData();
    return true;
  } catch (error) {
    return handleLocseeCloudWriteError(error);
  }
}

async function insertLocseeBookingCloud(row) {
  if (!locseeDb) return false;
  try {
    const { error } = await locseeDb.from("loc_bookings").insert(locseeBookingCloudRow(row));
    if (error) throw error;
    await loadLocseeCloudData();
    return true;
  } catch (error) {
    return handleLocseeCloudWriteError(error);
  }
}

async function updateLocseeSlotCloud(id, patch) {
  if (!locseeDb) return false;
  try {
    const { error } = await locseeDb.from("loc_slots").update(patch).eq("id", id);
    if (error) throw error;
    await loadLocseeCloudData();
    return true;
  } catch (error) {
    return handleLocseeCloudWriteError(error);
  }
}

async function deleteLocseeSlotCloud(id) {
  if (!locseeDb) return false;
  try {
    const { error: bookingError } = await locseeDb.from("loc_bookings").delete().eq("slot_id", id);
    if (bookingError) throw bookingError;
    const { error: slotError } = await locseeDb.from("loc_slots").delete().eq("id", id);
    if (slotError) throw slotError;
    await loadLocseeCloudData();
    return true;
  } catch (error) {
    return handleLocseeCloudWriteError(error);
  }
}

function locseeSlotCloudRow(slot) {
  return {
    id: slot.id,
    label: slot.label || "",
    start_date: slotStartDate(slot),
    end_date: slotEndDate(slot),
    status: slot.status || "open",
    winner_name: slot.winner_name || null,
    leave_days: slotLeaveDays(slot),
    created_at: slot.created_at || new Date().toISOString(),
    synced_at: slot.synced_at || null
  };
}

function locseeBookingCloudRow(row) {
  return {
    id: row.id,
    slot_id: row.slot_id || row.slotId,
    person_name: row.person_name || row.personName || "",
    leave_days: clampNumber(Number(row.leave_days || row.leaveDays || 1), 1, 5),
    created_at: row.created_at || new Date().toISOString()
  };
}

function locseeHolidayCloudRow(row) {
  return {
    id: row.id,
    name: row.name || row.title || "",
    holiday_date: row.holiday_date || row.date,
    created_at: row.created_at || new Date().toISOString()
  };
}

function handleLocseeCloudWriteError(error) {
  console.warn("LOCSee Supabase write failed", error);
  locseeCloudLoaded = false;
  locseeCloudStatus = "Supabase write failed";
  alert("บันทึก LOCSee ไป Supabase ไม่สำเร็จ ระบบจะเก็บไว้ในเครื่องก่อน กรุณาเช็คว่ารัน SQL ตาราง LOCSee แล้ว");
  renderAll();
  return false;
}

async function loadStaffCloudData() {
  if (!locseeDb) return false;
  const localStaff = activeStaff().filter(person => isUuid(person.id));
  try {
    const { data, error } = await locseeDb
      .from("shiftmate_staff")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const cloudStaff = (data || []).map(staffFromCloudRow);
    const missingLocalStaff = localStaff.filter(localPerson => !cloudStaff.some(cloudPerson => sameId(cloudPerson.id, localPerson.id)));
    if (missingLocalStaff.length) {
      await seedStaffCloudFromLocal(missingLocalStaff);
      return true;
    }
    if (cloudStaff.length) {
      const systemAdmin = staff.find(person => person.id === "staff-admin" || person.username === "admin") || seedStaff()[0];
      normalizeSystemAdmin(systemAdmin);
      staff = [systemAdmin, ...cloudStaff.filter(person => person.username !== "admin" && !person.isSystem)];
      writeStore(STORE.staff, staff);
      currentUserId = currentUser() ? currentUserId : "";
      if (!currentUserId) sessionStorage.removeItem(STORE.session);
    }
    staffCloudLoaded = true;
    staffCloudStatus = "Online/Supabase";
    renderAll();
    return true;
  } catch (error) {
    console.warn("Staff Supabase load failed", error);
    staffCloudLoaded = false;
    staffCloudStatus = "Supabase load failed";
    renderAll();
    return false;
  }
}

async function seedStaffCloudFromLocal(rows) {
  if (!locseeDb || !rows.length) return false;
  try {
    const { error } = await locseeDb
      .from("shiftmate_staff")
      .upsert(rows.map(staffCloudRow), { onConflict: "id" });
    if (error) throw error;
    staffCloudLoaded = true;
    staffCloudStatus = `Online/Supabase · synced ${rows.length}`;
    const { data, error: reloadError } = await locseeDb
      .from("shiftmate_staff")
      .select("*")
      .order("sort_order", { ascending: true });
    if (reloadError) throw reloadError;
    const cloudStaff = (data || []).map(staffFromCloudRow);
    const systemAdmin = staff.find(person => person.id === "staff-admin" || person.username === "admin") || seedStaff()[0];
    normalizeSystemAdmin(systemAdmin);
    staff = [systemAdmin, ...cloudStaff.filter(person => person.username !== "admin" && !person.isSystem)];
    writeStore(STORE.staff, staff);
    renderAll();
    return true;
  } catch (error) {
    console.warn("Staff local seed failed", error);
    staffCloudLoaded = false;
    staffCloudStatus = "Supabase seed failed";
    renderAll();
    return false;
  }
}

async function upsertStaffCloud(person) {
  if (!locseeDb || person.isSystem || !isUuid(person.id)) return false;
  staffCloudStatus = "Syncing staff...";
  renderStaff();
  try {
    const { error } = await locseeDb
      .from("shiftmate_staff")
      .upsert(staffCloudRow(person), { onConflict: "id" });
    if (error) throw error;
    staffCloudLoaded = true;
    staffCloudStatus = "Online/Supabase · saved";
    renderStaff();
    return true;
  } catch (error) {
    console.warn("Staff Supabase save failed", error);
    staffCloudLoaded = false;
    staffCloudStatus = "Supabase save failed";
    alert("บันทึก Staff ในเครื่องแล้ว แต่ส่งไป Supabase ไม่สำเร็จ กรุณารัน SQL ล่าสุดแล้วลองใหม่");
    renderAll();
    return false;
  }
}

async function deleteStaffCloud(id) {
  if (!locseeDb || !isUuid(id)) return false;
  try {
    const { error } = await locseeDb.from("shiftmate_staff").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Staff Supabase delete failed", error);
    return false;
  }
}

async function syncStaffOrderCloud(rows) {
  if (!locseeDb) return false;
  const cloudRows = rows.filter(person => !person.isSystem && isUuid(person.id)).map(staffCloudRow);
  if (!cloudRows.length) return false;
  try {
    const { error } = await locseeDb
      .from("shiftmate_staff")
      .upsert(cloudRows, { onConflict: "id" });
    if (error) throw error;
    staffCloudLoaded = true;
    staffCloudStatus = "Online/Supabase · order saved";
    renderStaff();
    return true;
  } catch (error) {
    console.warn("Staff order Supabase save failed", error);
    staffCloudLoaded = false;
    staffCloudStatus = "Supabase order save failed";
    renderStaff();
    return false;
  }
}

function staffCloudRow(person) {
  return {
    id: person.id,
    name: person.name,
    role: person.role,
    ward: "OB/GYN OR & Recovery",
    annual_leave_entitlement: Number(person.leaveEntitlement || 0),
    ot_balance: Number(person.otBalance || 0),
    sort_order: Number(person.sortOrder || 0),
    access_role: person.accessRole || "staff",
    username: person.username || "",
    password: person.password || "",
    is_system: Boolean(person.isSystem)
  };
}

function staffFromCloudRow(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    leaveEntitlement: Number(row.annual_leave_entitlement || 0),
    otBalance: Number(row.ot_balance || 0),
    sortOrder: Number(row.sort_order || 0),
    accessRole: row.access_role || "staff",
    username: row.username || "",
    password: row.password || "",
    isSystem: Boolean(row.is_system)
  };
}

async function saveLocseeSlot(event) {
  event.preventDefault();
  if (!canManageLeaveRequests()) {
    alert("This account cannot manage LOC booking slots.");
    return;
  }
  const startDate = el.locseeSlotStart.value;
  const leaveDays = clampNumber(Number(el.locseeSlotDays.value || 1), 1, 5);
  if (!startDate) return;
  const dates = locseeBusinessDates(startDate, leaveDays);
  if (!dates.length) return;
  const slot = {
    id: crypto.randomUUID(),
    label: defaultLocseeSlotLabel(startDate, leaveDays),
    start_date: dates[0],
    end_date: dates[dates.length - 1],
    status: "open",
    winner_name: "",
    leave_days: leaveDays,
    created_at: new Date().toISOString()
  };
  const names = parseNameList(el.locseeSlotNames.value);
  const bookingRows = names.map(name => ({
      id: crypto.randomUUID(),
      slot_id: slot.id,
      person_name: name,
      leave_days: leaveDays,
      created_at: new Date().toISOString()
  }));
  locseeSlots = [slot, ...locseeSlots.filter(item => !sameId(item.id, slot.id))];
  locseeBookings = [...bookingRows, ...locseeBookings.filter(item => !bookingRows.some(row => sameId(row.id, item.id)))];
  writeLocseeBookingStore();
  el.locseeMonth.value = startDate.slice(0, 7);
  el.locseeSlotNames.value = "";
  renderAll();
  await createLocseeSlotCloud(slot, bookingRows);
}

async function saveLocseeBooking(event) {
  event.preventDefault();
  const slot = locseeSlots.find(item => item.id === el.locseeBookingSlot.value);
  const name = el.locseeBookingName.value.trim();
  if (!slot || !name) return;
  if (slot.status === "drawn") {
    alert("This LOC slot already has a winner. Reopen it before adding bookings.");
    return;
  }
  const exists = locseeBookings.some(item => sameId(bookingSlotId(item), slot.id) && normalizeName(bookingPersonName(item)) === normalizeName(name));
  if (exists) {
    alert("This name is already booked in the selected LOC slot.");
    return;
  }
  const row = {
    id: crypto.randomUUID(),
    slot_id: slot.id,
    person_name: name,
    leave_days: slotLeaveDays(slot),
    created_at: new Date().toISOString()
  };
  locseeBookings = [row, ...locseeBookings.filter(item => !sameId(item.id, row.id))];
  writeLocseeBookingStore();
  el.locseeMonth.value = slotStartDate(slot).slice(0, 7);
  el.locseeBookingName.value = "";
  renderAll();
  await insertLocseeBookingCloud(row);
}

function renderLocseeSlots() {
  if (!el.locseeSlotRows) return;
  const month = el.locseeMonth.value;
  const visibleSlots = locseeSlots
    .filter(slot => slotMonthIntersects(slot, month))
    .sort((a, b) => slotStartDate(a).localeCompare(slotStartDate(b)));
  const openSlots = locseeSlots
    .filter(slot => slot.status !== "drawn")
    .sort((a, b) => slotStartDate(a).localeCompare(slotStartDate(b)));

  el.locseeBookingSlot.innerHTML = openSlots.length
    ? openSlots.map(slot => `<option value="${slot.id}">${escapeHtml(slot.label || slotDateLabel(slot))}</option>`).join("")
    : `<option value="">No open LOC slot</option>`;
  el.locseeBookingForm.querySelector("button[type='submit']").disabled = !openSlots.length;

  el.locseeSlotRows.innerHTML = visibleSlots.map(slot => {
    const bookings = bookingsForSlot(slot.id);
    const winners = slotWinners(slot);
    const canDraw = canManageLeaveRequests() && bookings.length && slot.status !== "drawn";
    const canSync = canManageLeaveRequests() && winners.length;
    return `
      <article class="locsee-slot-row">
        <div class="locsee-slot-main">
          <strong>${escapeHtml(slot.label || slotDateLabel(slot))}</strong>
          <span>${slotDateLabel(slot)} · ${slotLeaveDays(slot)} day${slotLeaveDays(slot) > 1 ? "s" : ""}</span>
          <small>${bookings.length} booking${bookings.length === 1 ? "" : "s"}${winners.length ? ` · winner: ${escapeHtml(winners.join(", "))}` : ""}</small>
          <div class="locsee-chip-list">
            ${bookings.map(item => `<span>${escapeHtml(bookingPersonName(item))}</span>`).join("") || "<em>No bookings yet</em>"}
          </div>
        </div>
        <div class="locsee-row-status">
          <span class="status-pill ${slot.status === "drawn" ? "done" : ""}">${escapeHtml(slot.status || "open")}</span>
          ${slot.synced_at ? `<small>Synced ${formatDisplayDate(String(slot.synced_at).slice(0, 10))}</small>` : ""}
        </div>
        <div class="locsee-row-actions">
          ${canDraw ? `<button class="btn small primary" type="button" data-draw-locsee-slot="${slot.id}">Draw</button>` : ""}
          ${canSync ? `<button class="btn small" type="button" data-sync-locsee-slot="${slot.id}">Sync</button>` : ""}
          ${canManageLeaveRequests() && slot.status === "drawn" ? `<button class="btn small" type="button" data-reopen-locsee-slot="${slot.id}">Reopen</button>` : ""}
          ${canManageLeaveRequests() ? `<button class="btn small danger" type="button" data-delete-locsee-slot="${slot.id}">Delete</button>` : ""}
        </div>
      </article>
    `;
  }).join("") || `<div class="ot-empty"><strong>No LOC booking slots</strong><small>Create a slot or select another month.</small></div>`;
}

async function drawLocseeSlot(id) {
  if (!canManageLeaveRequests()) return;
  const slot = locseeSlots.find(item => item.id === id);
  const bookings = bookingsForSlot(id);
  if (!slot || !bookings.length) return;
  const winner = bookings[Math.floor(Math.random() * bookings.length)];
  slot.status = "drawn";
  slot.winner_name = bookingPersonName(winner);
  slot.drawn_at = new Date().toISOString();
  const savedOnline = await updateLocseeSlotCloud(slot.id, { status: slot.status, winner_name: slot.winner_name });
  if (!savedOnline) writeLocseeBookingStore();
  renderAll();
}

async function syncLocseeSlot(id) {
  if (!canManageLeaveRequests()) return;
  const slot = locseeSlots.find(item => item.id === id);
  if (!slot) return;
  const winners = slotWinners(slot);
  if (!winners.length) return;
  const dates = locseeBusinessDates(slotStartDate(slot), slotLeaveDays(slot));
  const missing = [];
  winners.forEach(name => {
    const person = findStaffByName(name);
    if (!person) {
      missing.push(name);
      return;
    }
    dates.forEach(date => setScheduleValue(date.slice(0, 7), person.id, date, "vac"));
  });
  const syncedAt = new Date().toISOString();
  slot.synced_at = syncedAt;
  const savedOnline = await updateLocseeSlotCloud(slot.id, { synced_at: syncedAt });
  if (!savedOnline) writeLocseeBookingStore();
  renderAll();
  if (missing.length) alert(`Synced matched winners. Not found in Staff: ${missing.join(", ")}`);
}

async function reopenLocseeSlot(id) {
  if (!canManageLeaveRequests()) return;
  const slot = locseeSlots.find(item => item.id === id);
  if (!slot) return;
  slot.status = "open";
  slot.winner_name = "";
  slot.drawn_at = "";
  slot.synced_at = "";
  const savedOnline = await updateLocseeSlotCloud(slot.id, { status: "open", winner_name: null });
  if (!savedOnline) writeLocseeBookingStore();
  renderAll();
}

async function deleteLocseeSlot(id) {
  if (!canManageLeaveRequests()) return;
  const slot = locseeSlots.find(item => item.id === id);
  if (!slot || !confirm(`Delete LOC slot ${slot.label || slotDateLabel(slot)}?`)) return;
  const deletedOnline = await deleteLocseeSlotCloud(id);
  locseeSlots = locseeSlots.filter(item => item.id !== id);
  locseeBookings = locseeBookings.filter(item => !sameId(bookingSlotId(item), id));
  if (!deletedOnline) writeLocseeBookingStore();
  renderAll();
}

function writeLocseeBookingStore() {
  writeStore(STORE.locseeSlots, locseeSlots);
  writeStore(STORE.locseeBookings, locseeBookings);
  writeStore(STORE.locseeHolidays, locseeSpecialHolidays);
}

function bookingsForSlot(slotId) {
  return locseeBookings.filter(item => sameId(bookingSlotId(item), slotId));
}

function bookingSlotId(booking) {
  return booking.slot_id ?? booking.slotId ?? booking.slot ?? booking.loc_slot_id ?? booking.locSlotId ?? "";
}

function bookingPersonName(booking) {
  return booking.person_name ?? booking.personName ?? booking.name ?? booking.staff_name ?? booking.staffName ?? booking.full_name ?? booking.fullName ?? "";
}

function sameId(a, b) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function slotStartDate(slot) {
  return normalizeDateText(slot.start_date || slot.startDate || slot.start || slot.date_start || slot.dateStart || "");
}

function slotEndDate(slot) {
  return normalizeDateText(slot.end_date || slot.endDate || slot.end || slot.date_end || slot.dateEnd || slotStartDate(slot));
}

function slotLeaveDays(slot) {
  return clampNumber(Number(slot.leave_days || slot.leaveDays || 1), 1, 5);
}

function slotWinners(slot) {
  const raw = slot.winner_name || slot.winnerName || slot.winner || "";
  return String(raw).split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
}

function slotDateLabel(slot) {
  const start = slotStartDate(slot);
  const end = slotEndDate(slot);
  if (!start) return "LOC slot";
  return start === end ? formatDisplayDate(start) : `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}

function slotMonthIntersects(slot, month) {
  const start = slotStartDate(slot);
  const end = slotEndDate(slot);
  return start.slice(0, 7) <= month && end.slice(0, 7) >= month;
}

function locseeSlotsForDate(dateText) {
  return locseeSlots.filter(slot => slotStartDate(slot) <= dateText && slotEndDate(slot) >= dateText);
}

function normalizeDateText(value) {
  const raw = String(value || "").slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  const year = Number(match[1]);
  if (year > 2400) return `${year - 543}-${match[2]}-${match[3]}`;
  return raw;
}

function resolveLocseeCalendarMonth(monthValue) {
  const currentMonths = locseeFiscalMonths(monthValue);
  if (!locseeSlots.length || locseeSlots.some(slot => locseeSlotInMonths(slot, currentMonths))) return monthValue;
  const sortedSlots = [...locseeSlots].filter(slot => slotStartDate(slot)).sort((a, b) => slotStartDate(a).localeCompare(slotStartDate(b)));
  return sortedSlots[0] ? slotStartDate(sortedSlots[0]).slice(0, 7) : monthValue;
}

function locseeSlotInMonths(slot, months) {
  const first = `${months[0].year}-${String(months[0].month).padStart(2, "0")}-01`;
  const lastMonth = months[months.length - 1];
  const last = iso(new Date(lastMonth.year, lastMonth.month, 0));
  return slotStartDate(slot) <= last && slotEndDate(slot) >= first;
}

function locseeFiscalMonths(monthValue) {
  const [selectedYear, selectedMonth] = monthValue.split("-").map(Number);
  const fiscalEndYear = selectedMonth >= 10 ? selectedYear + 1 : selectedYear;
  const startYear = fiscalEndYear - 1;
  return [
    { year: startYear, month: 10 },
    { year: startYear, month: 11 },
    { year: startYear, month: 12 },
    { year: fiscalEndYear, month: 1 },
    { year: fiscalEndYear, month: 2 },
    { year: fiscalEndYear, month: 3 },
    { year: fiscalEndYear, month: 4 },
    { year: fiscalEndYear, month: 5 },
    { year: fiscalEndYear, month: 6 },
    { year: fiscalEndYear, month: 7 },
    { year: fiscalEndYear, month: 8 },
    { year: fiscalEndYear, month: 9 }
  ];
}

function defaultLocseeSlotLabel(startDate, leaveDays) {
  return `LOC ${formatDisplayDate(startDate)} · ${leaveDays} day${leaveDays > 1 ? "s" : ""}`;
}

function locseeBusinessDates(startDate, count) {
  const dates = [];
  const day = parseLocalDate(startDate);
  while (dates.length < count) {
    const text = iso(day);
    if (isLocseeBusinessDay(text)) dates.push(text);
    day.setDate(day.getDate() + 1);
  }
  return dates;
}

function isLocseeBusinessDay(dateText) {
  const day = parseLocalDate(dateText).getDay();
  if (day === 0 || day === 6) return false;
  if (isHoliday(dateText)) return false;
  return !locseeSpecialHolidays.some(item => (item.holiday_date || item.date || "").slice(0, 10) === dateText);
}

function parseNameList(text) {
  return text.split(/[\n,;]/).map(item => item.trim()).filter(Boolean);
}

function findStaffByName(name) {
  const target = normalizeName(name);
  return staff.find(item => normalizeName(item.name) === target || normalizeName(item.username) === target);
}

function uniqueNames(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = normalizeName(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeName(name) {
  return String(name || "").replace(/\s+/g, "").toLowerCase();
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function calculateOt(start, end, deductMinutes = 0) {
  if (!start || !end) return { hours: 0, minutes: 0 };
  const startMinutes = toMinutes(start);
  let endMinutes = toMinutes(end);
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  const total = Math.max(0, endMinutes - startMinutes - Math.max(0, Number(deductMinutes || 0)));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

function normalizeMinutes(minutes) {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

function toMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function daysInMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const lastDate = new Date(year, month, 0).getDate();
  return Array.from({ length: lastDate }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function isWeekend(dateText) {
  const day = parseLocalDate(dateText).getDay();
  return day === 0 || day === 6;
}

function thaiDay(date) {
  return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][date.getDay()];
}

function formatLongDate(dateText) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parseLocalDate(dateText));
}

function formatShortDate(dateText) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short" }).format(parseLocalDate(dateText));
}

function formatDisplayDate(dateText) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short", year: "numeric" }).format(parseLocalDate(dateText));
}

function formatMonthTitle(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatTime(value) {
  return value.replace(":", ".");
}

function formatDurationMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} ชม.${minutes ? ` ${minutes} นาที` : ""}`;
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function scheduleGroupForRole(role) {
  return role === "PN" || role === "HP" ? "PN" : "RN";
}

function schedulePositionGroupLabel(role) {
  if (role === "Head Nurse") return "Head Nurse";
  if (role === "Supervisor") return "Supervisor";
  if (role === "RN") return "Nurse";
  if (role === "PN") return "PN";
  if (role === "HP") return "HP";
  return role;
}

function activeStaff() {
  return staff.filter(person => !person.isSystem);
}

function orderedStaff(excludeSystem = false) {
  const rows = excludeSystem ? activeStaff() : [...staff];
  return rows.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name, "th"));
}

function normalizeStaffOrder() {
  let changed = false;
  orderedStaff(true).forEach((person, index) => {
    if (person.sortOrder !== index) {
      person.sortOrder = index;
      changed = true;
    }
  });
  if (changed) writeStore(STORE.staff, staff);
}

function ensureDefaultAdmin() {
  let adminUser = staff.find(person => person.id === "staff-admin" || person.username === "admin");
  if (!adminUser) {
    staff.unshift({ id: "staff-admin", name: "Admin ShiftMate", role: "System", leaveEntitlement: 0, otBalance: 0, sortOrder: -1, accessRole: "admin", username: "admin", password: "admin123", isSystem: true });
    writeStore(STORE.staff, staff);
    return;
  }
  normalizeSystemAdmin(adminUser);
  writeStore(STORE.staff, staff);
}

function normalizeSystemAdmin(person) {
  if (person.id !== "staff-admin" && person.username !== "admin" && !person.isSystem) return;
  person.id = "staff-admin";
  person.name = person.name || "Admin ShiftMate";
  person.role = "System";
  person.leaveEntitlement = 0;
  person.otBalance = 0;
  person.sortOrder = -1;
  person.accessRole = "admin";
  person.username = "admin";
  person.password = "admin123";
  person.isSystem = true;
}

function isRnApprover(person) {
  return person.role === "RN" || person.role === "Head Nurse" || person.role === "Supervisor";
}

function canApproveOt(person) {
  return isRnApprover(person);
}

function summaryCodesForGroup(group) {
  return group === "PN" ? ["S1", "S3", "S5", "vac", "ลาศึกษาต่อ", "อบรม", "ประชุม", "หยุด"] : ["R1", "R3", "R4", "RR", "vac", "ลาศึกษาต่อ", "อบรม", "ประชุม", "หยุด"];
}

function codeClass(code) {
  const map = {
    R1: "code-r1",
    R3: "code-r3",
    R4: "code-r4",
    RR: "code-rr",
    S1: "code-s1",
    S3: "code-s3",
    S5: "code-s5",
    vac: "code-vac",
    "ลาศึกษาต่อ": "code-study",
    "อบรม": "code-training",
    "ประชุม": "code-meeting",
    "หยุด": "code-off"
  };
  return map[code] || "";
}

function roleRank(role) {
  return { "Head Nurse": 0, Supervisor: 1, RN: 2, PN: 3, HP: 4 }[role] ?? 9;
}

function currentUser() {
  return staff.find(person => person.id === currentUserId) || null;
}

function userRole() {
  return currentUser()?.accessRole || "";
}

function canManageStaff() {
  return userRole() === "admin";
}

function canViewStaff() {
  return ["admin", "head_nurse"].includes(userRole());
}

function canEditSchedule() {
  return ["admin", "head_nurse"].includes(userRole());
}

function canViewUnitDashboard() {
  return ["admin", "head_nurse"].includes(userRole());
}

function canRecordOtForOthers() {
  return true;
}

function canRecordOtFor(staffId) {
  return canRecordOtForOthers() || staffId === currentUserId;
}

function canApproveRecord(record) {
  const role = userRole();
  if (["admin", "head_nurse"].includes(role)) return true;
  if (role === "senior" && record.approverId === currentUserId) return true;
  return false;
}

function canSeePendingOt(record) {
  return canApproveRecord(record);
}

function canSeeOtRecord(record) {
  return true;
}

function canEditOtRecord(record) {
  if (["admin", "head_nurse"].includes(userRole())) return true;
  return record.staffId === currentUserId && !record.approvedBy;
}

function canDeleteOtRecord(record) {
  if (["admin", "head_nurse"].includes(userRole())) return true;
  return record.staffId === currentUserId && !record.approvedBy;
}

function canManageLeaveRequests() {
  return ["admin", "head_nurse"].includes(userRole());
}

function canEditLeaveRequest(request) {
  return canManageLeaveRequests() || (request.staffId === currentUserId && request.status === "pending");
}

function canDeleteLeaveRequest(request) {
  return canManageLeaveRequests() || (request.staffId === currentUserId && request.status === "pending");
}

function accessLabel(role) {
  return ({ admin: "Admin", head_nurse: "Head Nurse", senior: "Senior", staff: "Staff" })[role] || "Staff";
}

function positionLabel(role) {
  if (role === "Head Nurse" || role === "Supervisor") return "RN";
  return role;
}

function staffAvatarText(person) {
  if (person.accessRole === "head_nurse") return "HN";
  if (person.accessRole === "senior") return "SN";
  return positionLabel(person.role).slice(0, 2).toUpperCase();
}

function avatarClass(person) {
  if (person.accessRole === "head_nurse") return "avatar-head";
  if (person.accessRole === "senior") return "avatar-senior";
  if (positionLabel(person.role) === "RN") return "avatar-rn";
  if (positionLabel(person.role) === "PN") return "avatar-pn";
  return "avatar-staff";
}

function roleBadgeClass(role) {
  return ({ head_nurse: "badge-head", senior: "badge-senior", admin: "badge-admin", staff: "badge-staff" })[role] || "badge-staff";
}

function positionBadgeClass(role) {
  return ({ RN: "badge-rn", "Head Nurse": "badge-rn", Supervisor: "badge-rn", PN: "badge-pn", HP: "badge-hp" })[role] || "badge-hp";
}

function generatePassword() {
  const syllables = ["shift", "mate", "or", "rn", "pink", "blue", "loc", "care"];
  return `${syllables[Math.floor(Math.random() * syllables.length)]}${Math.floor(1000 + Math.random() * 9000)}`;
}

function listItem(title, value) {
  return `<div class="list-item"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(value)}</small></div>`;
}

function emptyItem(text) {
  return `<div class="list-item"><small>${escapeHtml(text)}</small></div>`;
}

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function initials(name) {
  return String(name || "?").trim().slice(0, 2).toUpperCase();
}

function seedStaff() {
  return [
    { id: "staff-admin", name: "Admin ShiftMate", role: "System", leaveEntitlement: 0, otBalance: 0, sortOrder: -1, accessRole: "admin", username: "admin", password: "admin123", isSystem: true },
    { id: "staff-rn-1", name: "หัวหน้าเวร RN", role: "Head Nurse", leaveEntitlement: 15, otBalance: 0, sortOrder: 0, accessRole: "head_nurse", username: "head", password: "head123" },
    { id: "staff-rn-2", name: "พยาบาล RN 1", role: "RN", leaveEntitlement: 15, otBalance: 0, sortOrder: 1, accessRole: "senior", username: "senior", password: "senior123" },
    { id: "staff-rn-3", name: "พยาบาล RN 2", role: "RN", leaveEntitlement: 15, otBalance: 0, sortOrder: 2, accessRole: "staff", username: "staff", password: "staff123" },
    { id: "staff-pn-1", name: "ผู้ช่วย PN 1", role: "PN", leaveEntitlement: 15, otBalance: 0, sortOrder: 3, accessRole: "staff", username: "pn1", password: "staff123" },
    { id: "staff-pn-2", name: "ผู้ช่วย PN 2", role: "PN", leaveEntitlement: 15, otBalance: 0, sortOrder: 4, accessRole: "staff", username: "pn2", password: "staff123" },
    { id: "staff-hp-1", name: "เจ้าหน้าที่ HP 1", role: "HP", leaveEntitlement: 15, otBalance: 0, sortOrder: 5, accessRole: "staff", username: "hp1", password: "staff123" }
  ];
}
