const STORE = {
  staff: "shiftmate.staff",
  schedule: "shiftmate.schedule",
  ot: "shiftmate.ot",
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

let staff = readStore(STORE.staff, seedStaff());
let schedule = readStore(STORE.schedule, {});
let otRecords = readStore(STORE.ot, []);
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
  vacationCreditDays: document.querySelector("#vacationCreditDays")
};

init();

function init() {
  ensureDefaultAdmin();
  const today = new Date();
  el.todayLabel.textContent = formatLongDate(iso(today));
  el.scheduleMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  el.otFilterMonth.value = el.scheduleMonth.value;
  el.otDate.value = iso(today);
  setTab(localStorage.getItem(STORE.activeTab) || "dashboard");
  bindEvents();
  syncAuthState();
  renderAll();
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
  el.otFilterStaff.addEventListener("change", renderOt);
  el.otFilterMonth.addEventListener("change", renderOt);
  el.otFilterType.addEventListener("change", renderOt);
  el.otFilterStatus.addEventListener("change", renderOt);
  el.otSummarySearch.addEventListener("input", renderOtSummary);
  el.clearOtForm.addEventListener("click", clearOtForm);
  [el.otStart, el.otEnd, el.otDeductMinutes].forEach(input => input.addEventListener("input", updateOtLiveTotal));

  document.addEventListener("click", event => {
    const editStaffId = event.target.closest("[data-edit-staff]")?.dataset.editStaff;
    const deleteStaffId = event.target.closest("[data-delete-staff]")?.dataset.deleteStaff;
    const moveStaffId = event.target.closest("[data-move-staff]")?.dataset.moveStaff;
    const deleteOtId = event.target.closest("[data-delete-ot]")?.dataset.deleteOt;
    const approveOtId = event.target.closest("[data-approve-ot]")?.dataset.approveOt;
    const editOtId = event.target.closest("[data-edit-ot]")?.dataset.editOt;
    const hospitalOtId = event.target.closest("[data-hospital-ot]")?.dataset.hospitalOt;

    if (editStaffId && canManageStaff()) editStaff(editStaffId);
    if (deleteStaffId && canManageStaff()) deleteStaff(deleteStaffId);
    if (moveStaffId && canManageStaff()) moveStaff(moveStaffId, event.target.closest("[data-move-staff]").dataset.direction);
    if (deleteOtId) deleteOtRecord(deleteOtId);
    if (editOtId) editOtRecord(editOtId);
    if (approveOtId) approveOtRecord(approveOtId);
    if (hospitalOtId) toggleHospitalPosted(hospitalOtId);
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
  const user = staff.find(person => (person.username || "").toLowerCase() === username && person.password === password);
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
  const start = new Date(`${date}T00:00:00`);
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

  el.staffRows.innerHTML = filtered.map(person => `
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
  `).join("") || `<div class="staff-empty"><div class="empty-mascot">👩‍⚕️</div><strong>ยังไม่มีข้อมูลเจ้าหน้าที่</strong><small>ลองเพิ่มเจ้าหน้าที่ใหม่ หรือปรับคำค้นหาอีกครั้ง</small>${canManageStaff() ? `<button class="btn primary" type="button" id="emptyAddStaff">เพิ่มเจ้าหน้าที่</button>` : ""}</div>`;
  document.querySelector("#emptyAddStaff")?.addEventListener("click", () => {
    clearStaffForm();
    el.staffName.focus();
  });
}

function saveStaff(event) {
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

  const index = staff.findIndex(item => item.id === person.id);
  if (index >= 0) staff[index] = person;
  else staff.push(person);
  writeStore(STORE.staff, staff);
  clearStaffForm();
  renderAll();
}

function moveStaff(id, direction) {
  normalizeStaffOrder();
  const sorted = orderedStaff(true);
  const index = sorted.findIndex(item => item.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
  const currentOrder = sorted[index].sortOrder;
  sorted[index].sortOrder = sorted[targetIndex].sortOrder;
  sorted[targetIndex].sortOrder = currentOrder;
  staff = sorted.sort((a, b) => a.sortOrder - b.sortOrder);
  writeStore(STORE.staff, staff);
  renderAll();
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

function deleteStaff(id) {
  const person = staff.find(item => item.id === id);
  if (!person || !confirm(`ลบ ${person.name} ออกจากรายชื่อใช่ไหม`)) return;
  staff = staff.filter(item => item.id !== id);
  Object.keys(schedule).forEach(key => {
    if (key.includes(`|${id}|`)) delete schedule[key];
  });
  otRecords = otRecords.filter(item => item.staffId !== id);
  writeStore(STORE.staff, staff);
  writeStore(STORE.schedule, schedule);
  writeStore(STORE.ot, otRecords);
  renderAll();
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
    const dateObj = new Date(`${date}T00:00:00`);
    const staffing = staffingForDate(date);
    const holiday = holidayName(date);
    const holidayTag = holiday ? `<b class="day-holiday">${escapeHtml(holiday)}</b>` : "";
    return `<div class="schedule-cell day-head ${dayClass(date)}"${holiday ? ` title="${escapeHtml(holiday)}"` : ""}>${dateObj.getDate()}<br><small>${thaiDay(dateObj)}</small>${holidayTag}<em class="${staffing.status}">RN ${staffing.rn}/${staffing.rnTarget}<br>PN ${staffing.pn}/${staffing.pnTarget}</em></div>`;
  }).join("");

  const rows = people.map(person => `
    <div class="schedule-cell name"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role)}</small></div>
      ${days.map(date => scheduleInputCell(person, date, disabled)).join("")}
  `).join("");

  const summaryRows = summaryCodesForGroup(activeScheduleGroup).map(code => `
    <div class="schedule-cell summary-label">${code}</div>
    ${days.map(date => `<div class="schedule-cell summary-cell ${dayClass(date)}">${countShiftCode(date, code, people)}</div>`).join("")}
  `).join("");

  el.scheduleTable.innerHTML = `
    <div class="schedule-month-banner">${activeScheduleGroup} · ${formatMonthTitle(el.scheduleMonth.value)}</div>
    <div class="schedule-grid" style="--days:${days.length}">
      <div class="schedule-cell head">เจ้าหน้าที่</div>
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
  const day = new Date(`${date}T00:00:00`).getDay();
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
        <div class="ot-date-dot"><strong>${new Date(`${item.date}T00:00:00`).getDate()}</strong><span>${thaiMonthShort(item.date)}</span></div>
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
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { month: "short" }).format(new Date(`${dateText}T00:00:00`));
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
  const day = new Date(`${dateText}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function thaiDay(date) {
  return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][date.getDay()];
}

function formatLongDate(dateText) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${dateText}T00:00:00`));
}

function formatShortDate(dateText) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short" }).format(new Date(`${dateText}T00:00:00`));
}

function formatDisplayDate(dateText) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dateText}T00:00:00`));
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
  const adminUser = staff.find(person => person.username === "admin");
  if (!adminUser) {
    staff.unshift({ id: "staff-admin", name: "Admin ShiftMate", role: "System", leaveEntitlement: 0, otBalance: 0, sortOrder: -1, accessRole: "admin", username: "admin", password: "admin123", isSystem: true });
    writeStore(STORE.staff, staff);
    return;
  }
  adminUser.isSystem = true;
  adminUser.role = "System";
  adminUser.leaveEntitlement = 0;
  adminUser.otBalance = 0;
  if (adminUser.accessRole !== "admin") {
    adminUser.accessRole = "admin";
  }
  writeStore(STORE.staff, staff);
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
