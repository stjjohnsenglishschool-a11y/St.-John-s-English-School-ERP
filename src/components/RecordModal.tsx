import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from "react";
import {
  X,
  Eye,
  EyeOff,
  Upload,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  fetchCollectionData,
  uploadToFirebaseStorage,
  DEFAULT_INCOME_HEADS,
} from "../lib/supabase";
import { getCurrentAcademicYear } from "../lib/academicYear";
import { modules, Field } from "../modules";
import FeeCollectionModal from "./FeeCollectionModal";

type Row = Record<string, unknown>;

export interface RecordModalProps {
  mode: "create" | "edit" | "view";
  mod: (typeof modules)[string];
  row?: Row;
  close: () => void;
  save: (v: Row) => void;
}

/**
 * Calculates late fee for fees_collection according to school rules:
 * - Payment on or before 10th of due month: ₹0
 * - Payment after 10th of due month: ₹50
 * - Payment crosses to next month (or later): ₹100
 */
export function calculateLateFee(
  paymentDateStr: string,
  dueMonthStr: string,
  academicYearStr: string = getCurrentAcademicYear()
): { fine: number; reason: string } {
  if (!paymentDateStr || !dueMonthStr) {
    return { fine: 0, reason: "No payment date or due month specified" };
  }

  const pDate = new Date(paymentDateStr);
  if (isNaN(pDate.getTime())) {
    return { fine: 0, reason: "Invalid payment date" };
  }

  const payYear = pDate.getFullYear();
  const payMonthIdx = pDate.getMonth(); // 0 to 11
  const payDay = pDate.getDate();

  const monthMap: Record<string, number> = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11,
  };

  const dueMonthIdx = monthMap[dueMonthStr];
  if (dueMonthIdx === undefined) {
    return { fine: 0, reason: "Standard on-time payment" };
  }

  // Academic year start year (e.g. "2026-27" -> 2026)
  const parts = academicYearStr.split("-");
  const baseYear = parseInt(parts[0], 10) || payYear;
  const dueYear = dueMonthIdx >= 3 ? baseYear : baseYear + 1;

  const payMonthCode = payYear * 12 + payMonthIdx;
  const dueMonthCode = dueYear * 12 + dueMonthIdx;

  if (payMonthCode < dueMonthCode) {
    return { fine: 0, reason: `Advance Payment for ${dueMonthStr} (₹0 Fine)` };
  }

  if (payMonthCode === dueMonthCode) {
    if (payDay <= 10) {
      return { fine: 0, reason: `Paid on or before 10th of ${dueMonthStr} (On-time: ₹0 Fine)` };
    } else {
      return { fine: 50, reason: `Paid after 10th of ${dueMonthStr} (₹50 Late Fine applied)` };
    }
  }

  const diffMonths = payMonthCode - dueMonthCode;
  return {
    fine: 100,
    reason: `Overdue across month by ${diffMonths} month(s) (₹100 Fine applied)`,
  };
}

export function RecordModal({
  mode,
  mod,
  row,
  close,
  save,
}: RecordModalProps) {
  const [values, setValues] = useState<Row>(() =>
    Object.fromEntries(
      mod.fields.map((x) => [
        x.key,
        row?.[x.key] ??
          (x.key === "academic_year"
            ? getCurrentAcademicYear()
            : x.key === "year" && x.type === "number"
            ? new Date().getFullYear()
            : x.type === "boolean"
            ? (x.key === "fine_waived" ? false : true)
            : x.type === "array"
            ? []
            : ""),
      ])
    )
  );

  // If table is fees_collection and user prefers specialized fee studio
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

  // Business logic auto calculations & field updates
  const updateField = (key: string, v: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [key]: v };

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

      // Salary slip auto calculation
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

      // Fees collection fine & due calculation logic:
      // - 50rs fine if payment is after 10th of the month
      // - 100rs if it crosses to the next month
      // - 'Fine Waived' checkbox requires 'Principal Approval' field to be filled before it applies
      if (mod.table === "fees_collection") {
        const feesAmt = Number(key === "fees_amount" ? v : next.fees_amount) || 0;
        const paid = Number(key === "amount_paid" ? v : next.amount_paid) || 0;
        const pDateStr = String(key === "payment_date" ? v : next.payment_date || "");
        const dMonthStr = String(key === "due_month" ? v : next.due_month || "");
        const acadYear = String(next.academic_year || getCurrentAcademicYear());

        let computedFine = 0;
        if (pDateStr && dMonthStr) {
          const fineInfo = calculateLateFee(pDateStr, dMonthStr, acadYear);
          computedFine = fineInfo.fine;
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

        // Fine Waived only applies if Principal Approval is filled
        const effectiveFine = (fineWaived && hasApproval) ? 0 : fineAmt;
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

      // Leave Balance auto calculation
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
        let allHeads = DEFAULT_INCOME_HEADS;
        try {
          const cached = localStorage.getItem("sjes_table_income_head_master");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              allHeads = parsed;
            }
          }
        } catch {}

        const found = allHeads.find(
          (h: any) => String(h.head_name || "").toLowerCase() === String(v || "").toLowerCase()
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

    if (
      mod.table === "leave_balance" ||
      mod.table === "leave_application" ||
      mod.table === "salary_slip" ||
      mod.table === "warning_letter" ||
      mod.table === "offer_letter" ||
      mod.table === "employee_document" ||
      mod.table === "teacher_idcard"
    ) {
      setValues((prev) => ({
        ...prev,
        employee_name: empFullName || prev.employee_name,
        emp_code: (record.emp_code as string) || prev.emp_code,
        department: (record.department as string) || prev.department,
        designation: (record.designation as string) || prev.designation,
        basic_salary: Number(record.basic_salary || prev.basic_salary || 0),
      }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(values);
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ maxWidth: "780px", width: "95%" }}
      >
        <header>
          <div>
            <h2>{mod.title || mod.table}</h2>
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

        {/* Dynamic Fees Calculation Banner for fees_collection */}
        {mod.table === "fees_collection" && (
          <div
            style={{
              margin: "0 24px 16px",
              padding: "12px 16px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#1e40af" }}>
                Fee Rule &amp; Fine Automation
              </div>
              <div style={{ fontSize: "11px", color: "#3b82f6" }}>
                On/Before 10th: ₹0 | After 10th: ₹50 | Next Month: ₹100 | Fine Waived requires Principal Approval
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700 }}>FINE:</span>{" "}
                <b style={{ color: values.fine_waived && String(values.principal_approval || "").trim() ? "#16a34a" : "#dc2626" }}>
                  ₹{values.fine_waived && String(values.principal_approval || "").trim() ? 0 : Number(values.fine_amount || 0)}
                </b>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700 }}>DUE:</span>{" "}
                <b style={{ color: "#1e3a8a", fontSize: "14px" }}>₹{Number(values.amount_due || 0)}</b>
              </div>
            </div>
          </div>
        )}

        <div className="form-grid">
          {mod.fields.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={values[field.key]}
              disabled={mode === "view"}
              change={(v) => updateField(field.key, v)}
              onRelationSelected={onSelectRelationDetails}
              allFormValues={values}
            />
          ))}
        </div>

        <footer>
          <button type="button" onClick={close}>
            {mode === "view" ? "Close" : "Cancel"}
          </button>
          {mode !== "view" && (
            <button className="save" type="submit">
              {mode === "edit" ? "Save changes" : "Create record"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}

export function FormField({
  field,
  value,
  disabled,
  change,
  onRelationSelected,
  allFormValues,
}: {
  key?: React.Key;
  field: Field;
  value: unknown;
  disabled: boolean;
  change: (v: unknown) => void;
  onRelationSelected?: (record: Record<string, unknown>) => void;
  allFormValues?: Row;
}) {
  const [relationOptions, setRelationOptions] = useState<Array<Record<string, unknown>>>([]);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (field.type !== "relation" || !field.reference) return;
    const reference = field.reference;
    fetchCollectionData(reference.table).then((data) => {
      setRelationOptions((data || []) as unknown as Array<Record<string, unknown>>);
    });
  }, [field]);

  // Dynamic Options for income_type and income_category pulling from income_head_master
  const dynamicOptions = useMemo(() => {
    if (field.key === "income_type") {
      try {
        const cached = localStorage.getItem("sjes_table_income_head_master");
        if (cached) {
          const heads = JSON.parse(cached);
          if (Array.isArray(heads) && heads.length > 0) {
            const names = heads.map((h: any) => h.head_name).filter(Boolean);
            return Array.from(new Set([...(field.options || []), ...names]));
          }
        }
      } catch {}
    }
    if (field.key === "income_category") {
      try {
        const cached = localStorage.getItem("sjes_table_income_head_master");
        if (cached) {
          const heads = JSON.parse(cached);
          if (Array.isArray(heads) && heads.length > 0) {
            const cats = heads.map((h: any) => h.head_category).filter(Boolean);
            return Array.from(new Set([...(field.options || []), ...cats]));
          }
        }
      } catch {}
    }
    return field.options || [];
  }, [field.key, field.options]);

  const isUrlOrFileField =
    field.key.endsWith("_url") ||
    field.key.endsWith("_photo") ||
    field.key === "attachment_url";

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadToFirebaseStorage(
        file,
        "school-documents",
        "records"
      );
      change(publicUrl);
    } catch {
      // Fallback handled inside upload
    } finally {
      setUploading(false);
    }
  };

  // Specific UI for 'Fine Waived' checkbox
  if (field.key === "fine_waived") {
    const isChecked = Boolean(value);
    const hasApproval = Boolean(
      allFormValues?.principal_approval &&
      String(allFormValues.principal_approval).trim().length > 0
    );

    return (
      <div
        style={{
          gridColumn: "1 / -1",
          background: isChecked ? "#f0fdf4" : "#f8fafc",
          border: `1.5px solid ${isChecked ? (hasApproval ? "#86efac" : "#fde047") : "#e2e8f0"}`,
          borderRadius: "8px",
          padding: "12px 14px",
          margin: "4px 0",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: disabled ? "default" : "pointer",
            fontWeight: 800,
            fontSize: "13px",
            color: isChecked ? "#15803d" : "#334155",
          }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            disabled={disabled}
            onChange={(e) => change(e.target.checked)}
            style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#16a34a" }}
          />
          <span>Fine Waived (Requires Principal Approval)</span>
        </label>
        {isChecked && (
          <div style={{ marginTop: "6px", fontSize: "11px", color: hasApproval ? "#15803d" : "#b45309", fontWeight: 600 }}>
            {hasApproval
              ? "✓ Principal Approval provided. Late fine is waived off (₹0)."
              : "⚠ Warning: You must fill the 'Principal Approval' field below to apply this fine waiver."}
          </div>
        )}
      </div>
    );
  }

  // Specific UI for 'Principal Approval' field
  if (field.key === "principal_approval") {
    const fineWaivedActive = Boolean(allFormValues?.fine_waived);
    return (
      <label className={fineWaivedActive ? "full" : ""}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {field.label}
          {fineWaivedActive && <b style={{ color: "#dc2626" }}>* (Required to waive fine)</b>}
        </span>
        <input
          disabled={disabled}
          required={fineWaivedActive}
          type="text"
          placeholder="e.g. Approved by Principal Fr. Johnathan D'Souza"
          value={String(value ?? "")}
          onChange={(e) => change(e.target.value)}
          style={{
            borderColor: fineWaivedActive && !String(value || "").trim() ? "#f87171" : undefined,
            background: fineWaivedActive && !String(value || "").trim() ? "#fff5f5" : undefined,
          }}
        />
        {fineWaivedActive && !String(value || "").trim() && (
          <span style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
            Enter Principal approval details to confirm fine waiver.
          </span>
        )}
      </label>
    );
  }

  // Password Input Field with Eye Toggle
  if (field.key === "password") {
    return (
      <label>
        <span>
          {field.label}
          {field.required && <b>*</b>}
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            disabled={disabled}
            required={field.required}
            type={showPassword ? "text" : "password"}
            placeholder="Enter account password"
            value={String(value ?? "")}
            onChange={(e) => change(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              padding: "0 10px",
              height: "38px",
              border: "1px solid #d4deec",
              borderRadius: "8px",
              background: "#f8fafc",
              cursor: "pointer",
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
    );
  }

  return (
    <label className={field.type === "textarea" ? "full" : ""}>
      <span>
        {field.label}
        {field.required && <b>*</b>}
      </span>

      {field.type === "textarea" || field.type === "array" ? (
        <textarea
          disabled={disabled}
          required={field.required}
          value={
            field.type === "array" && Array.isArray(value)
              ? value.join(", ")
              : String(value ?? "")
          }
          placeholder={field.type === "array" ? "Comma-separated values" : ""}
          onChange={(e) =>
            change(
              field.type === "array"
                ? e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : e.target.value
            )
          }
        />
      ) : field.type === "boolean" ? (
        <select
          disabled={disabled}
          value={String(value ?? true)}
          onChange={(e) => change(e.target.value === "true")}
        >
          <option value="true">Yes / Active</option>
          <option value="false">No / Inactive</option>
        </select>
      ) : field.type === "relation" && field.reference ? (
        <select
          disabled={disabled}
          required={field.required}
          value={String(value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            change(val);
            const found = relationOptions.find(
              (opt) => String(opt[field.reference!.value]) === val
            );
            if (found && onRelationSelected) {
              onRelationSelected(found);
            }
          }}
        >
          <option value="">Select...</option>
          {relationOptions.map((option) => {
            const val = String(option[field.reference!.value]);
            const name = String(
              option.employee_name ||
                option.full_name ||
                option[field.reference!.label] ||
                val
            );
            return (
              <option key={val} value={val}>
                {name}
              </option>
            );
          })}
        </select>
      ) : field.type === "select" ? (
        <select
          disabled={disabled}
          required={field.required}
          value={String(value ?? "")}
          onChange={(e) => change(e.target.value)}
        >
          <option value="">Select option...</option>
          {dynamicOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      ) : isUrlOrFileField ? (
        <div style={{ display: "grid", gap: "6px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              disabled={disabled}
              required={field.required}
              type="text"
              placeholder="https://..."
              value={String(value ?? "")}
              onChange={(e) => change(e.target.value)}
              style={{ flex: 1 }}
            />
            {!disabled && (
              <label
                style={{
                  padding: "0 12px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f0f4fa",
                  border: "1px solid #d4deec",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#1e3a8a",
                }}
              >
                <Upload size={14} />
                <span>Upload</span>
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </label>
            )}
          </div>
          {uploading && <div style={{ fontSize: "11px", color: "#2563eb" }}>Uploading file...</div>}
        </div>
      ) : (
        <input
          disabled={disabled}
          required={field.required}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={String(value ?? "")}
          onChange={(e) =>
            change(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
          }
        />
      )}
    </label>
  );
}

export default RecordModal;
