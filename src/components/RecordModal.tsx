import React, { useState, FormEvent } from "react";
import { X } from "lucide-react";
import { modules, moduleName } from "../modules";
import { getCurrentAcademicYear } from "../lib/academicYear";
import { normalizeUserModules, DEFAULT_INCOME_HEADS, supabase } from "../lib/supabase";
import { validateLeaveApplicationRule } from "../lib/leaveSalaryRules";
import FeeCollectionModal from "./FeeCollectionModal";
import FormField from "./FormField";

type Row = Record<string, unknown>;

export interface RecordModalProps {
  mode: "create" | "edit" | "view";
  mod: (typeof modules)[string];
  row?: Row;
  currentUser?: {
    user_name: string;
    user_full_name: string;
    role: string;
    allowed_modules: string[];
  } | null;
  currentEmployeeRecord?: Record<string, unknown> | null;
  isStaffOrTeacher?: boolean;
  close: () => void;
  save: (v: Row) => void;
}

export default function RecordModal({
  mode,
  mod,
  row,
  currentUser,
  currentEmployeeRecord,
  isStaffOrTeacher,
  close,
  save,
}: RecordModalProps) {
  const [values, setValues] = useState<Row>(() => {
    const initial = Object.fromEntries(
      mod.fields.map((x) => [
        x.key,
        row?.[x.key] ??
          (x.key === "academic_year"
            ? getCurrentAcademicYear()
            : x.key === "year" && x.type === "number"
            ? new Date().getFullYear()
            : x.type === "boolean"
            ? true
            : x.type === "array"
            ? []
            : ""),
      ])
    );

    if (mod.table === "user_master") {
      const parsedArr = normalizeUserModules(row);
      initial.allowed_modules = parsedArr;
      initial.active_module = parsedArr;
      if (row?.user_id) {
        initial.user_id = row.user_id;
      }
    }

    if (mod.table === "leave_application" && mode === "create") {
      initial.status = "pending";
      initial.leave_type = "PL (Privilege Leave)";
      const todayStr = new Date().toISOString().slice(0, 10);
      initial.from_date = initial.from_date || todayStr;
      initial.to_date = initial.to_date || todayStr;
      initial.total_days = 1;
      initial.approved_by = "";

      // Auto-lock to current teacher/staff identity
      if (isStaffOrTeacher || currentEmployeeRecord) {
        const empId = String(currentEmployeeRecord?.emp_id || currentEmployeeRecord?.emp_code || "");
        const empName = String(
          currentEmployeeRecord?.full_name ||
            `${currentEmployeeRecord?.first_name || ""} ${currentEmployeeRecord?.last_name || ""}`.trim() ||
            currentUser?.user_full_name ||
            ""
        );
        if (empId) initial.emp_id = empId;
        if (empName) initial.employee_name = empName;
      }
    }

    // Auto-fill Assignments with logged in teacher name and current date
    if (mod.table === "assignments_master" && mode === "create") {
      const todayStr = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().slice(0, 10);

      const staffName =
        String(currentEmployeeRecord?.full_name || "") ||
        `${String(currentEmployeeRecord?.first_name || "")} ${String(currentEmployeeRecord?.last_name || "")}`.trim() ||
        currentUser?.user_full_name ||
        currentUser?.user_name ||
        "Faculty";

      initial.assigned_by = initial.assigned_by || staffName;
      initial.assigned_date = initial.assigned_date || todayStr;
      initial.due_date = initial.due_date || nextWeekStr;
      initial.status = initial.status || "active";
      initial.class_name = initial.class_name || "CLASS I";
    }

    // Auto-fill Notices with logged in user and current date
    if (mod.table === "notice_automation" && mode === "create") {
      const todayStr = new Date().toISOString().slice(0, 10);
      const authorName =
        String(currentEmployeeRecord?.full_name || "") ||
        currentUser?.user_full_name ||
        currentUser?.user_name ||
        "Administration";

      initial.created_by = initial.created_by || authorName;
      initial.scheduled_at = initial.scheduled_at || todayStr;
      initial.send_via = initial.send_via || "Email";
      initial.status = initial.status || "scheduled";
    }

    // Auto-fill Incomes & Expenses with logged in user
    if (mod.table === "income_master" && mode === "create") {
      initial.received_by =
        initial.received_by ||
        currentUser?.user_full_name ||
        currentUser?.user_name ||
        "Accounts";
      initial.income_date = initial.income_date || new Date().toISOString().slice(0, 10);
      initial.payment_mode = initial.payment_mode || "Cash";
    }

    if (mod.table === "expense_master" && mode === "create") {
      initial.recorded_by =
        initial.recorded_by ||
        currentUser?.user_full_name ||
        currentUser?.user_name ||
        "Accounts";
      initial.expense_date = initial.expense_date || new Date().toISOString().slice(0, 10);
      initial.payment_mode = initial.payment_mode || "Cash";
    }

    if ((mod.table === "salary_slip" || mod.fields.some((f) => f.key === "month")) && mode === "create") {
      const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });
      initial.month = initial.month || currentMonthName;
      if (mod.table === "salary_slip") {
        initial.year = initial.year || new Date().getFullYear();
        initial.status = initial.status || "generated";
        initial.payment_mode = initial.payment_mode || "Bank Transfer";
        initial.payment_date = initial.payment_date || new Date().toISOString().slice(0, 10);
      }
    }

    return initial;
  });

  // If table is fees_collection, use the specialized FeeCollectionModal
  if (mod.table === "fees_collection") {
    return (
      <FeeCollectionModal
        isOpen={true}
        mode={mode}
        initialData={row || values}
        onClose={close}
        onSave={async (data) => {
          save(data);
        }}
      />
    );
  }

  // Business logic auto calculations
  const updateField = (key: string, v: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [key]: v };

      // User Master module sync
      if (mod.table === "user_master") {
        if (key === "allowed_modules") {
          next.active_module = v;
        } else if (key === "active_module") {
          next.allowed_modules = v;
        }
      }

      // Department Code auto generator
      if (mod.table === "department_master" && key === "department_name" && mode === "create") {
        const raw = String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (raw.length > 0) {
          next.department_code = `DEPT-${raw.slice(0, 4)}`;
        }
      }

      // Vendor Code auto generator
      if (mod.table === "vendor_master" && key === "vendor_name" && mode === "create") {
        const raw = String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (raw.length > 0) {
          next.vendor_code = `VND-${raw.slice(0, 4)}`;
        }
      }

      // Salary slip auto calculation: Gross, Deductions, Net
      if (mod.table === "salary_slip") {
        const basic = Number(key === "basic_salary" ? v : next.basic_salary) || 0;
        const hra = Number(key === "hra" ? v : next.hra) || 0;
        const da = Number(key === "da" ? v : next.da) || 0;
        const otherA = Number(key === "other_allowances" ? v : next.other_allowances) || 0;
        const gross = basic + hra + da + otherA;
        next.gross_salary = gross;

        const lwpDays = Number(key === "lwp_days" ? v : next.lwp_days) || 0;
        let lwpDed = Number(key === "lwp_deduction" ? v : next.lwp_deduction) || 0;
        if ((key === "lwp_days" || key === "basic_salary") && lwpDays > 0 && basic > 0) {
          lwpDed = Math.round(lwpDays * (basic / 30));
          next.lwp_deduction = lwpDed;
        }

        const pf = Number(key === "pf_deduction" ? v : next.pf_deduction) || 0;
        const esi = Number(key === "esi_deduction" ? v : next.esi_deduction) || 0;
        const tds = Number(key === "tds" ? v : next.tds) || 0;
        const otherD = Number(key === "other_deductions" ? v : next.other_deductions) || 0;
        const deductions = pf + esi + tds + lwpDed + otherD;
        next.total_deductions = deductions;
        next.net_salary = Math.max(0, gross - deductions);
      }

      // Fees collection fine & due calculation
      if (mod.table === "fees_collection") {
        const feesAmt = Number(key === "fees_amount" ? v : next.fees_amount) || 0;
        const paid = Number(key === "amount_paid" ? v : next.amount_paid) || 0;
        const pDateStr = String(key === "payment_date" ? v : next.payment_date || "");
        const dMonthStr = String(key === "due_month" ? v : next.due_month || "");
        const acadYear = String(next.academic_year || getCurrentAcademicYear());

        let computedFine = 0;
        if (pDateStr && dMonthStr) {
          const pDate = new Date(pDateStr);
          if (!isNaN(pDate.getTime())) {
            const payYear = pDate.getFullYear();
            const payMonthIdx = pDate.getMonth();
            const payDay = pDate.getDate();

            const monthMap: Record<string, number> = {
              January: 0, February: 1, March: 2, April: 3,
              May: 4, June: 5, July: 6, August: 7,
              September: 8, October: 9, November: 10, December: 11,
            };
            const dueMonthIdx = monthMap[dMonthStr];
            if (dueMonthIdx !== undefined) {
              const parts = acadYear.split("-");
              const baseYear = parseInt(parts[0], 10) || payYear;
              const dueYear = dueMonthIdx >= 3 ? baseYear : baseYear + 1;
              const payMonthCode = payYear * 12 + payMonthIdx;
              const dueMonthCode = dueYear * 12 + dueMonthIdx;

              if (payMonthCode < dueMonthCode) {
                computedFine = 0;
              } else if (payMonthCode === dueMonthCode) {
                computedFine = payDay <= 10 ? 0 : 50;
              } else {
                computedFine = 100;
              }
            }
          }
        }

        const fineAmt = key === "fine_amount" ? (Number(v) || 0) : (computedFine || Number(next.fine_amount) || 0);
        next.fine_amount = fineAmt;

        const fineWaived = Boolean(key === "fine_waived" ? v : next.fine_waived);
        const approvalText = String(
          key === "principal_approval"
            ? v
            : next.principal_approval || next.waive_approved_by_principal || ""
        ).trim();
        const hasApproval = approvalText.length > 0 && approvalText.toLowerCase() !== "false";

        // Fine Waived requires Principal Approval field to be filled
        const effectiveFine = (fineWaived && hasApproval) ? 0 : fineAmt;
        next.waive_approved_by_principal = Boolean(fineWaived && hasApproval);

        const total = feesAmt + effectiveFine;
        const due = Math.max(0, total - paid);
        next.amount_due = due;

        if (due === 0 && paid > 0) {
          next.status = "paid";
        } else if (paid > 0 && due > 0) {
          next.status = "partial";
        } else {
          next.status = "pending";
        }
      }

      // Leave calculation
      if (mod.table === "leave_application" && (key === "from_date" || key === "to_date")) {
        const from = String(key === "from_date" ? v : next.from_date);
        const to = String(key === "to_date" ? v : next.to_date);
        if (from && to) {
          const diff = Math.ceil(
            (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24)
          ) + 1;
          if (diff > 0) next.total_days = diff;
        }
      }

      // Leave Balance auto calculation: Balance = Entitled - Taken
      if (mod.table === "leave_balance") {
        const entitled = Number(key === "total_entitled" ? v : next.total_entitled) || 0;
        const taken = Number(key === "total_taken" ? v : next.total_taken) || 0;
        next.balance_remaining = Math.max(0, entitled - taken);
      }

      // Income head master: auto head_code generator
      if (mod.table === "income_head_master" && key === "head_name" && mode === "create") {
        const raw = String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        const cat = String(next.head_category || "Fee");
        const prefix = cat.includes("Uniform") ? "INC-MAT" : cat.includes("Extra") ? "INC-EXT" : "INC-FEE";
        if (raw.length > 0 && !next.head_code) {
          next.head_code = `${prefix}-${raw.slice(0, 6)}`;
        }
      }

      // Income master: auto category, description and default amount on selecting income_type
      if (mod.table === "income_master" && key === "income_type") {
        const found = DEFAULT_INCOME_HEADS.find(
          (h) => h.head_name.toLowerCase() === String(v || "").toLowerCase()
        );
        if (found) {
          if (!next.income_category || next.income_category === "Fee Income") {
            next.income_category = found.head_category;
          }
          if (found.default_amount > 0 && (!next.amount || Number(next.amount) === 0)) {
            next.amount = found.default_amount;
          }
          if (!next.description) {
            next.description = found.description || found.head_name;
          }
        }
      }

      return next;
    });
  };

  const onSelectRelationDetails = (record: Record<string, unknown>) => {
    const empFullName =
      (record.full_name as string) ||
      `${(record.first_name as string) || ""} ${(record.last_name as string) || ""}`.trim() ||
      (record.name as string) ||
      "";

    // When student is selected in fees, attendance, or student idcards
    if (
      mod.table === "fees_collection" ||
      mod.table === "student_attendance" ||
      mod.table === "student_idcard" ||
      mod.table === "escort_card"
    ) {
      setValues((prev) => ({
        ...prev,
        student_name: (record.full_name as string) || (record.student_name as string) || prev.student_name,
        admission_no: (record.admission_no as string) || prev.admission_no,
        class_name: (record.class_name as string) || prev.class_name,
        section: (record.section as string) || prev.section,
        roll_no: (record.roll_no as string) || prev.roll_no,
        father_name: (record.father_name as string) || prev.father_name,
        guardian_name: (record.guardian_name as string) || (record.father_name as string) || prev.guardian_name,
        guardian_mobile: (record.guardian_mobile as string) || (record.father_mobile as string) || prev.guardian_mobile,
      }));
    }

    // When employee is selected in HR / Employee modules
    if (
      mod.table === "leave_balance" ||
      mod.table === "leave_ledger" ||
      mod.table === "leave_application" ||
      mod.table === "salary_slip" ||
      mod.table === "warning_letter" ||
      mod.table === "offer_letter" ||
      mod.table === "employee_document" ||
      mod.table === "teacher_idcard"
    ) {
      setValues((prev) => {
        const fullBasic = Number(record.basic_salary || prev.basic_salary || 0);
        const empIdentifier = (record.emp_id as string) || (record.id as string) || prev.user_id || prev.emp_id;
        const updated: Row = {
          ...prev,
          user_id: empIdentifier,
          emp_id: empIdentifier,
          employee_name: empFullName || prev.employee_name,
          emp_code: (record.emp_code as string) || prev.emp_code,
          department: (record.department as string) || prev.department,
          designation: (record.designation as string) || prev.designation,
          basic_salary: fullBasic,
        };

        // For salary slip: handle resigned employee pro-rata salary & warnings
        if (mod.table === "salary_slip") {
          const empStatus = String(record.employment_status || (record.is_active === false ? "Inactive" : "Active"));
          const lastWorking = String(record.last_working_date || record.date_of_leaving || record.resignation_date || "");

          const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });
          const monthStr = String(prev.month || currentMonthName);
          const yearNum = Number(prev.year || new Date().getFullYear());

          const parseMonthIdx = (m: string | number) => {
            if (typeof m === "number") return m;
            const str = String(m || "").trim().toLowerCase();
            const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
            const idx = months.findIndex((name) => name.startsWith(str.slice(0, 3)));
            return idx !== -1 ? idx + 1 : 9;
          };

          const slipMonthIdx = parseMonthIdx(monthStr);

          if ((empStatus === "Resigned" || empStatus === "Terminated" || empStatus === "Inactive") && lastWorking) {
            const [lYear, lMonth, lDay] = lastWorking.split("-").map(Number);
            if (lYear && lMonth && lDay) {
              const totalDays = new Date(yearNum, slipMonthIdx, 0).getDate() || 30;

              if (yearNum === lYear && slipMonthIdx === lMonth) {
                // Resignation month: calculate pro-rata salary up to last working date
                const daysWorked = Math.min(lDay, totalDays);
                const unworkedDays = Math.max(0, totalDays - daysWorked);
                const proratedBasic = Math.round((fullBasic / totalDays) * daysWorked);
                const lwpDeduction = Math.round((fullBasic / totalDays) * unworkedDays);

                updated.basic_salary = proratedBasic;
                updated.lwp_days = unworkedDays;
                updated.lwp_deduction = lwpDeduction;
                updated.gross_salary = proratedBasic + Number(prev.hra || 0) + Number(prev.da || 0) + Number(prev.other_allowances || 0);
                updated.total_deductions = Number(prev.pf_deduction || 0) + Number(prev.esi_deduction || 0) + Number(prev.tds || 0) + lwpDeduction + Number(prev.other_deductions || 0);
                updated.net_salary = Math.max(0, (updated.gross_salary as number) - (updated.total_deductions as number));
                updated.resignation_settlement = true;
                updated.remarks = `✓ Resigned staff pro-rata salary: ${daysWorked} days worked up to Last Working Date (${lastWorking}). ${unworkedDays} days deducted as LWP.`;
              } else if (yearNum > lYear || (yearNum === lYear && slipMonthIdx > lMonth)) {
                // Month is after last working date: warn admin
                updated.remarks = `⚠️ EXCLUDED FROM REGULAR PAYROLL: Employee resigned on ${lastWorking}. Past last working date. Processing final settlement / pending dues only.`;
                updated.resignation_settlement = true;
              }
            }
          }

          // Check for rejected leave applications in this month (automatic LOP deduction rule)
          if (supabase && (record.emp_id || record.emp_code)) {
            const empId = String(record.emp_id || record.emp_code);
            Promise.resolve(
              supabase
                .from("leave_application")
                .select("*")
                .eq("emp_id", empId)
                .eq("status", "rejected")
            )
              .then(({ data: rejectedLeaves }) => {
                if (rejectedLeaves && rejectedLeaves.length > 0) {
                  let rejDays = 0;
                  for (const l of rejectedLeaves) {
                    const fDate = new Date(l.from_date);
                    if (fDate.getMonth() + 1 === slipMonthIdx && fDate.getFullYear() === yearNum) {
                      rejDays += Number(l.total_days || 1);
                    }
                  }
                  if (rejDays > 0) {
                    setValues((curr) => {
                      const curBasic = Number(curr.basic_salary || 0);
                      const curLwp = rejDays;
                      const curLwpDed = Math.round(curLwp * (curBasic / 30));
                      const curGross = Number(curr.gross_salary || 0);
                      const curDeds =
                        Number(curr.pf_deduction || 0) +
                        Number(curr.esi_deduction || 0) +
                        Number(curr.tds || 0) +
                        curLwpDed +
                        Number(curr.other_deductions || 0);
                      return {
                        ...curr,
                        lwp_days: curLwp,
                        lwp_deduction: curLwpDed,
                        total_deductions: curDeds,
                        net_salary: Math.max(0, curGross - curDeds),
                        remarks:
                          (curr.remarks ? curr.remarks + " • " : "") +
                          `Auto-deducted ${curLwp} rejected absence / LOP day(s) (₹${curLwpDed}).`,
                      };
                    });
                  }
                }
              })
              .catch(() => {});
          }
        }

        // For leave balance: initialize smart defaults
        if (mod.table === "leave_balance" && mode === "create") {
          const entitled = Number(prev.total_entitled) || 7;
          const taken = Number(prev.total_taken) || 0;
          const rem = Math.max(0, entitled - taken);
          updated.total_entitled = entitled;
          updated.total_taken = taken;
          updated.total_pending = Number(prev.total_pending) || 0;
          updated.balance_remaining = rem;
          updated.current_pl_balance = rem;
          updated.last_updated_date = new Date().toISOString().split("T")[0];
          updated.leave_type = "PL";
        }

        // For leave ledger: initialize smart defaults
        if (mod.table === "leave_ledger" && mode === "create") {
          updated.transaction_date = prev.transaction_date || new Date().toISOString().split("T")[0];
          updated.type = prev.type || "Credit";
          updated.amount = Number(prev.amount) || 1;
          updated.balance_after = Number(prev.balance_after) || 1;
          updated.reference_id = prev.reference_id || `PL-${new Date().getFullYear()}`;
        }

        return updated;
      });
    }
  };

  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (mod.table === "leave_application" && mode === "create") {
      const fromDate = String(values.from_date || "");
      const toDate = String(values.to_date || fromDate);
      const reqDays = Number(values.total_days || 1);

      // Fetch employee record and available balance from Supabase
      const empId = String(values.emp_id || currentEmployeeRecord?.emp_id || "");
      let empRecord = currentEmployeeRecord;

      if (!empRecord && empId && supabase) {
        const { data: emps } = await supabase.from("employee_master").select("*").eq("emp_id", empId);
        if (emps && emps.length > 0) empRecord = emps[0];
      }

      let plBalance = 0;
      let balRecord: any = null;
      if (empId && supabase) {
        const { data: balRows } = await supabase.from("leave_balance").select("*").eq("emp_id", empId).eq("leave_type", "PL");
        if (balRows && balRows.length > 0) {
          balRecord = balRows[0];
          plBalance = Number(balRecord.current_pl_balance ?? balRecord.balance_remaining ?? 0);
        }
      }

      // Check probation & Supabase balance rule
      if (empRecord?.date_of_joining) {
        const check = validateLeaveApplicationRule({
          employee: empRecord,
          fromDate,
          toDate,
          leaveType: "PL",
          savedLeaveBalance: balRecord,
        });
        if (!check.valid) {
          setErrorMsg(check.error || "Leave application validation failed.");
          return;
        }
      }

      if (reqDays > plBalance) {
        setErrorMsg(`Insufficient PL Balance. You have only ${plBalance} PL available.`);
        return;
      }
    }

    save(values);
  };

  return (
    <div className="modal-bg">
      <form className="record-modal" onSubmit={submit}>
        <header>
          <div>
            <span>{mode.toUpperCase()} RECORD</span>
            <h2>{moduleName(mod.table)}</h2>
            <p>
              {mode === "view"
                ? "Review saved database record."
                : "Complete the fields below. Changes persist directly to Supabase."}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close modal">
            <X />
          </button>
        </header>

        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              padding: "10px 16px",
              borderRadius: "8px",
              margin: "12px 24px 0",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="form-grid">
          {mod.fields.map((field) => (
            <FormField
              key={field.key}
              field={field}
              tableName={mod.table}
              mode={mode}
              currentUser={currentUser}
              currentEmployeeRecord={currentEmployeeRecord}
              isStaffOrTeacher={isStaffOrTeacher}
              value={values[field.key]}
              disabled={mode === "view"}
              change={(v) => updateField(field.key, v)}
              onRelationSelected={onSelectRelationDetails}
            />
          ))}
        </div>

        <footer>
          <button type="button" onClick={close}>
            {mode === "view" ? "Close" : "Cancel"}
          </button>
          {mode !== "view" && (
            <button className="save" type="submit">
              {mode === "edit" ? "Save changes" : mod.table === "leave_application" ? "Submit Leave Application" : "Create record"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
