/**
 * Leave Calculation & Salary Rules for St. John's English School (SJES)
 * 
 * Rules:
 * 1. Leave accounting session runs from 1 April to 31 March every year.
 * 2. Employee remains on probation for 6 months from joining date.
 *    - After completing 6 months -> status changes automatically to "Permanent".
 *    - After completing 7 months -> automatically receives 1 PL (Privilege Leave) credited.
 *    - Duplicate crediting of initial 1 PL is strictly prevented.
 * 3. Monthly PL Rules:
 *    - Permanent employee can apply for max 2 PL in one calendar month (subject to available balance).
 *    - Cannot apply for more leave than available PL balance.
 * 4. Principal Approval Workflow:
 *    - Approved leave with sufficient balance -> deducts from leave balance, normal salary paid.
 *    - Rejected leave -> does NOT deduct leave balance, treated as unauthorized absence / LWP.
 *      Applicable daily salary rate deducted from salary: (basic_salary / 30) * rejected_days.
 */

export interface LeaveSession {
  sessionName: string; // e.g. "1 April 2026 to 31 March 2027"
  academicYear: string; // e.g. "2026-2027"
  startDate: string; // "2026-04-01"
  endDate: string; // "2027-03-31"
  startYear: number;
  endYear: number;
}

/**
 * Returns the 1 April to 31 March leave session for a given date or month/year.
 */
export function getLeaveSession(dateInput?: Date | string | null, targetMonth?: string, targetYear?: number): LeaveSession {
  let date: Date;

  if (targetYear) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let mIndex = 3; // default April
    if (targetMonth) {
      const match = monthNames.findIndex((m) => targetMonth.toLowerCase().startsWith(m));
      if (match >= 0) mIndex = match;
    }
    date = new Date(targetYear, mIndex, 15);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "string" && dateInput.trim()) {
    date = new Date(dateInput);
    if (isNaN(date.getTime())) date = new Date();
  } else {
    date = new Date();
  }

  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 3 = Apr, 11 = Dec

  let startYear = year;
  let endYear = year + 1;

  if (month < 3) {
    // January, February, March belongs to session starting in previous calendar year
    startYear = year - 1;
    endYear = year;
  }

  return {
    sessionName: `1 April ${startYear} to 31 March ${endYear}`,
    academicYear: `${startYear}-${endYear}`,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
    startYear,
    endYear,
  };
}

/**
 * Calculates completed calendar months between two dates.
 */
export function calculateCompletedMonths(joiningDateStr?: string | null, targetDate?: Date | string): number {
  if (!joiningDateStr) return 12; // Fallback to permanent if date not specified
  const joining = new Date(joiningDateStr);
  if (isNaN(joining.getTime())) return 12;

  const target = targetDate ? (targetDate instanceof Date ? targetDate : new Date(targetDate)) : new Date();
  if (isNaN(target.getTime()) || target < joining) return 0;

  let months = (target.getFullYear() - joining.getFullYear()) * 12 + (target.getMonth() - joining.getMonth());
  if (target.getDate() < joining.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

export interface ProbationStatus {
  status: "Probationary" | "Permanent";
  isPermanent: boolean;
  completedMonths: number;
  probationEndDate: string;
  hasCompletedSevenMonths: boolean;
  initialPLEffectiveDate: string;
}

/**
 * Calculates probation and permanent status according to Rule 2:
 * - 6 months probation from joining date
 * - After completing 6 months -> Permanent
 * - After completing 7 months -> eligible for 1 PL credited
 */
export function getEmployeeProbationStatus(joiningDateStr?: string | null, targetDate?: Date | string): ProbationStatus {
  if (!joiningDateStr) {
    return {
      status: "Permanent",
      isPermanent: true,
      completedMonths: 12,
      probationEndDate: "—",
      hasCompletedSevenMonths: true,
      initialPLEffectiveDate: "—",
    };
  }

  const joining = new Date(joiningDateStr);
  if (isNaN(joining.getTime())) {
    return {
      status: "Permanent",
      isPermanent: true,
      completedMonths: 12,
      probationEndDate: "—",
      hasCompletedSevenMonths: true,
      initialPLEffectiveDate: "—",
    };
  }

  const completedMonths = calculateCompletedMonths(joiningDateStr, targetDate);

  // 6 months probation end date
  const probEnd = new Date(joining);
  probEnd.setMonth(probEnd.getMonth() + 6);

  // 7 months initial PL credit date
  const pl7Date = new Date(joining);
  pl7Date.setMonth(pl7Date.getMonth() + 7);

  const isPermanent = completedMonths >= 6;
  const hasCompletedSevenMonths = completedMonths >= 7;

  return {
    status: isPermanent ? "Permanent" : "Probationary",
    isPermanent,
    completedMonths,
    probationEndDate: probEnd.toISOString().split("T")[0],
    hasCompletedSevenMonths,
    initialPLEffectiveDate: pl7Date.toISOString().split("T")[0],
  };
}

export interface EmployeeLeaveSummary {
  sessionName: string;
  employmentStatus: "Probationary" | "Permanent";
  completedMonths: number;
  joiningDate: string;
  plOpeningBalance: number;
  plCreditedThisSession: number;
  plTakenThisMonth: number;
  plTakenThisSession: number;
  plBalance: number;
  approvedLeaveDaysThisMonth: number;
  rejectedLeaveDaysThisMonth: number;
  lwpDays: number;
  dailySalaryRate: number;
  lwpSalaryDeduction: number;
  maxPLAllowedThisMonth: number;
  remainingPLAllowanceThisMonth: number;
  canApplyForPL: boolean;
}

/**
 * Calculates comprehensive Leave Summary for an employee for a specific month/session
 */
export function calculateEmployeeLeaveSummary(
  employee: Record<string, any>,
  allLeaveApps: Record<string, any>[] = [],
  monthName?: string,
  yearNum?: number
): EmployeeLeaveSummary {
  const currentYear = yearNum || new Date().getFullYear();
  const session = getLeaveSession(null, monthName, currentYear);

  // Determine target evaluation date for probation & monthly calculation
  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  let mIndex = new Date().getMonth();
  if (monthName) {
    const idx = monthNames.findIndex((m) => m.startsWith(monthName.toLowerCase().slice(0, 3)));
    if (idx >= 0) mIndex = idx;
  }
  const targetDate = new Date(currentYear, mIndex, 28);

  const joiningDateStr = employee.date_of_joining || employee.joining_date || "";
  const probation = getEmployeeProbationStatus(joiningDateStr, targetDate);

  // Leave Credited Calculation:
  // - If probationary (< 6 months completed): 0 PL
  // - Once completing 7 months: 1 initial PL credited (idempotent, never duplicate)
  // - For permanent employees: 1 PL per completed month in this session, capped at 12
  let plCredited = 0;
  let plOpeningBalance = Number(employee.pl_opening_balance || 0);

  if (probation.hasCompletedSevenMonths) {
    // Has passed 7 months: gets initial 1 PL + additional months worked as permanent in this session
    const monthsInSession = Math.max(1, Math.min(12, mIndex >= 3 ? mIndex - 2 : mIndex + 10));
    // Base 1 PL for month 7, then +1 for subsequent months (typical policy)
    plCredited = Math.max(1, monthsInSession);
  } else if (probation.isPermanent) {
    // Completed 6 months (probation finished, in month 7)
    plCredited = 0; // gets credited after month 7 completes
  } else {
    plCredited = 0;
  }

  // Filter leave applications for this employee
  const empId = employee.emp_id || employee.emp_code || employee.id;
  const empName = (employee.employee_name || `${employee.first_name || ""} ${employee.last_name || ""}`).trim().toLowerCase();

  const myLeaves = allLeaveApps.filter((l) => {
    const lEmpId = l.emp_id || l.emp_code;
    const lName = String(l.employee_name || "").trim().toLowerCase();
    if (empId && lEmpId && String(lEmpId) === String(empId)) return true;
    if (empName && lName && (empName.includes(lName) || lName.includes(empName))) return true;
    return false;
  });

  // Calculate leaves taken in this session and this specific month
  let plTakenThisSession = 0;
  let plTakenThisMonth = 0;
  let approvedLeaveDaysThisMonth = 0;
  let rejectedLeaveDaysThisMonth = 0;
  let lwpDays = 0;

  const sessionStart = new Date(session.startDate).getTime();
  const sessionEnd = new Date(session.endDate).getTime();

  for (const leave of myLeaves) {
    const status = String(leave.status || "pending").toLowerCase();
    const type = String(leave.leave_type || "PL").toUpperCase();
    const days = Number(leave.total_days || 1);
    const fromDateStr = leave.from_date || leave.leave_date;
    if (!fromDateStr) continue;

    const fromDate = new Date(fromDateStr);
    const leaveTime = fromDate.getTime();
    const inSession = leaveTime >= sessionStart && leaveTime <= sessionEnd;
    const inTargetMonth = fromDate.getMonth() === mIndex && fromDate.getFullYear() === currentYear;

    if (status === "approved") {
      if (inSession) {
        if (type.includes("PL") || type.includes("PRIVILEGE") || type.includes("EARNED")) {
          plTakenThisSession += days;
        }
      }
      if (inTargetMonth) {
        approvedLeaveDaysThisMonth += days;
        if (type.includes("PL") || type.includes("PRIVILEGE") || type.includes("EARNED")) {
          plTakenThisMonth += days;
        }
        if (type.includes("UNPAID") || type.includes("LWP")) {
          lwpDays += days;
        }
      }
    } else if (status === "rejected") {
      // RULE 4: Rejected leave treated as unauthorized absence / LWP!
      // Does NOT deduct leave balance.
      // Triggers salary deduction for those days!
      if (inTargetMonth) {
        rejectedLeaveDaysThisMonth += days;
        lwpDays += days;
      }
    }
  }

  // Available PL Balance
  const totalEntitled = plOpeningBalance + plCredited;
  const plBalance = Math.max(0, totalEntitled - plTakenThisSession);

  // Monthly PL Limit: Permanent employee max 2 PL in one calendar month
  const maxPLAllowedThisMonth = probation.isPermanent ? 2 : 0;
  const remainingPLAllowanceThisMonth = Math.max(0, maxPLAllowedThisMonth - plTakenThisMonth);
  const canApplyForPL = probation.isPermanent && plBalance > 0 && remainingPLAllowanceThisMonth > 0;

  // Daily Salary Rate & LWP Deduction:
  // Applicable daily salary rate = basic_salary / 30
  const basicSalary = Number(employee.basic_salary || 0);
  const dailySalaryRate = basicSalary > 0 ? Math.round((basicSalary / 30) * 100) / 100 : 0;
  const lwpSalaryDeduction = Math.round(lwpDays * dailySalaryRate);

  return {
    sessionName: session.sessionName,
    employmentStatus: probation.status,
    completedMonths: probation.completedMonths,
    joiningDate: joiningDateStr || "—",
    plOpeningBalance,
    plCreditedThisSession: plCredited,
    plTakenThisMonth,
    plTakenThisSession,
    plBalance,
    approvedLeaveDaysThisMonth,
    rejectedLeaveDaysThisMonth,
    lwpDays,
    dailySalaryRate,
    lwpSalaryDeduction,
    maxPLAllowedThisMonth,
    remainingPLAllowanceThisMonth,
    canApplyForPL,
  };
}

/**
 * Validates a leave application according to Rules 2, 3, and 4.
 */
export function validateLeaveApplicationRule(params: {
  employee: Record<string, any>;
  fromDate: string;
  toDate: string;
  leaveType: string;
  existingLeaves?: Record<string, any>[];
  currentAppId?: string;
}): { valid: boolean; error?: string; warning?: string; totalDays: number } {
  const { employee, fromDate, toDate, leaveType, existingLeaves = [], currentAppId } = params;

  if (!fromDate || !toDate) {
    return { valid: false, error: "Please select valid 'From Date' and 'To Date'.", totalDays: 0 };
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return { valid: false, error: "Invalid date format specified.", totalDays: 0 };
  }

  if (to < from) {
    return { valid: false, error: "'To Date' cannot be before 'From Date'.", totalDays: 0 };
  }

  const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;
  if (totalDays <= 0) {
    return { valid: false, error: "Leave duration must be at least 1 day.", totalDays: 0 };
  }

  const isPL = leaveType.toUpperCase().includes("PL") || leaveType.toUpperCase().includes("PRIVILEGE");

  // Evaluate probation & leave summary for the application month
  const monthName = from.toLocaleString("default", { month: "long" });
  const yearNum = from.getFullYear();
  const summary = calculateEmployeeLeaveSummary(employee, existingLeaves, monthName, yearNum);

  // Rule 2 & 3: Probationary employee cannot take PL
  if (isPL && summary.employmentStatus === "Probationary") {
    return {
      valid: false,
      error: `Employee is currently on Probation (${summary.completedMonths} of 6 months completed). Privilege Leave (PL) is only applicable for Permanent employees after probation. Please select Unpaid Leave or request Principal discretion.`,
      totalDays,
    };
  }

  // Rule 3: Monthly PL Maximum Limit (Max 2 PL in a calendar month)
  if (isPL) {
    // Check leaves already applied/taken in the same month
    let plAlreadyTakenThisMonth = 0;
    const fromMonth = from.getMonth();
    const fromYear = from.getFullYear();

    for (const l of existingLeaves) {
      if (currentAppId && (l.leave_app_id === currentAppId || l.id === currentAppId)) continue;
      const lStatus = String(l.status || "").toLowerCase();
      if (lStatus === "rejected" || lStatus === "cancelled") continue;

      const lType = String(l.leave_type || "").toUpperCase();
      if (!lType.includes("PL") && !lType.includes("PRIVILEGE")) continue;

      const lFrom = new Date(l.from_date || l.leave_date);
      if (!isNaN(lFrom.getTime()) && lFrom.getMonth() === fromMonth && lFrom.getFullYear() === fromYear) {
        plAlreadyTakenThisMonth += Number(l.total_days || 1);
      }
    }

    if (plAlreadyTakenThisMonth + totalDays > 2) {
      return {
        valid: false,
        error: `Monthly PL limit exceeded: Permanent employees can apply for a maximum of 2 PL per calendar month. Already taken/applied: ${plAlreadyTakenThisMonth} days. Requested: ${totalDays} days.`,
        totalDays,
      };
    }

    // Rule 3: Available Leave Balance Check
    if (totalDays > summary.plBalance) {
      return {
        valid: false,
        error: `Insufficient PL balance: Requested ${totalDays} day(s), but available balance is only ${summary.plBalance} PL.`,
        totalDays,
      };
    }
  }

  return { valid: true, totalDays };
}
