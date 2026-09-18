import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CreditCard,
  Calendar,
  User,
  BookOpen,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { fetchCollectionData } from "../lib/supabase";
import { getCurrentAcademicYear } from "../lib/academicYear";

export interface FeeCollectionModalProps {
  isOpen: boolean;
  mode: "create" | "edit" | "view";
  initialData?: Record<string, any>;
  onClose: () => void;
  onSave: (data: Record<string, any>) => Promise<void>;
  setToast?: (toast: { type: "success" | "error" | "info"; message: string }) => void;
}

const ACADEMIC_MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

const STANDARD_CLASSES = [
  "PG",
  "NURSERY",
  "LKG",
  "UKG",
  "CLASS I",
  "CLASS II",
  "CLASS III",
  "CLASS IV",
  "CLASS V",
  "CLASS VI",
  "CLASS VII",
  "CLASS VIII",
  "CLASS IX",
  "CLASS X",
];

const FEE_TYPES = [
  "Monthly Tuition Fee",
  "Admission Fee",
  "Annual / Session Fee",
  "Examination Fee",
  "Computer / Smart Class Fee",
  "Transport Fee",
  "Activity / Sports Fee",
  "Development Fee",
  "Miscellaneous",
];

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

export default function FeeCollectionModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSave,
  setToast,
}: FeeCollectionModalProps) {
  // Form State
  const [className, setClassName] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [admissionNo, setAdmissionNo] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [dueMonth, setDueMonth] = useState<string>("");
  const [feeType, setFeeType] = useState<string>("Monthly Tuition Fee");
  const [feesAmount, setFeesAmount] = useState<number>(0);
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [fineWaived, setFineWaived] = useState<boolean>(false);
  const [waiveApprovedByPrincipal, setWaiveApprovedByPrincipal] = useState<boolean>(false);
  const [fineWaiveReason, setFineWaiveReason] = useState<string>("");
  const [approvedBy, setApprovedBy] = useState<string>("Principal");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Background Data
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>(STANDARD_CLASSES);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [autoFetchedFromStruct, setAutoFetchedFromStruct] = useState<boolean>(false);

  // Generate Receipt Number
  const generateReceiptNumber = () => {
    const todayIso = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RCPT-${todayIso}-${rand}`;
  };

  // Load external tables on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [students, classes, structures, collections] = await Promise.all([
          fetchCollectionData("student_master"),
          fetchCollectionData("class_master"),
          fetchCollectionData("fees_structure"),
          fetchCollectionData("fees_collection"),
        ]);
        if (!isMounted) return;

        if (Array.isArray(students)) setAllStudents(students);
        if (Array.isArray(structures)) setFeeStructures(structures);
        if (Array.isArray(collections)) setFeeHistory(collections);

        if (Array.isArray(classes) && classes.length > 0) {
          const classNames = Array.from(
            new Set([
              ...STANDARD_CLASSES,
              ...classes.map((c) => String(c.class_name || "").trim()).filter(Boolean),
            ])
          );
          setAllClasses(classNames);
        }
      } catch (err) {
        console.error("Error loading fee collection metadata:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize form when opened or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialData && Object.keys(initialData).length > 0) {
      setClassName(initialData.class_name || "");
      setStudentId(initialData.student_id || "");
      setStudentName(initialData.student_name || "");
      setAdmissionNo(initialData.admission_no || "");
      setAcademicYear(initialData.academic_year || getCurrentAcademicYear());
      setDueMonth(initialData.due_month || ACADEMIC_MONTHS[new Date().getMonth() >= 3 ? new Date().getMonth() - 3 : new Date().getMonth() + 9] || "September");
      setFeeType(initialData.fee_type || "Monthly Tuition Fee");
      setFeesAmount(Number(initialData.fees_amount ?? initialData.amount_due ?? 0));
      setFineAmount(Number(initialData.fine_amount ?? 0));
      setFineWaived(Boolean(initialData.fine_waived));
      setWaiveApprovedByPrincipal(Boolean(initialData.waive_approved_by_principal));
      setFineWaiveReason(initialData.fine_waive_reason || "");
      setApprovedBy(initialData.approved_by || "Principal");
      setAmountPaid(Number(initialData.amount_paid ?? 0));
      setPaymentDate(initialData.payment_date || new Date().toISOString().slice(0, 10));
      setPaymentMode(initialData.payment_mode || "Cash");
      setReceiptNumber(initialData.receipt_number || generateReceiptNumber());
      setRemarks(initialData.remarks || "");
    } else {
      // Defaults for Create Mode
      const curMonthIdx = new Date().getMonth(); // 0-based: Jan=0, Feb=1, Mar=2, Apr=3...
      const academicIdx = curMonthIdx >= 3 ? curMonthIdx - 3 : curMonthIdx + 9;
      const defaultMonth = ACADEMIC_MONTHS[academicIdx] || "September";

      setClassName("UKG");
      setStudentId("");
      setStudentName("");
      setAdmissionNo("");
      setAcademicYear(getCurrentAcademicYear());
      setDueMonth(defaultMonth);
      setFeeType("Monthly Tuition Fee");
      setFeesAmount(1000);
      setFineAmount(0);
      setFineWaived(false);
      setWaiveApprovedByPrincipal(false);
      setFineWaiveReason("");
      setApprovedBy("Principal");
      setAmountPaid(1000);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMode("Cash");
      setReceiptNumber(generateReceiptNumber());
      setRemarks("");
    }
  }, [isOpen, initialData]);

  // Filter students based on selected Class
  const classStudents = useMemo(() => {
    if (!className) return allStudents;
    const target = className.trim().toUpperCase();
    return allStudents.filter((s) => {
      const sClass = String(s.class_name || "").trim().toUpperCase();
      return sClass === target;
    });
  }, [allStudents, className]);

  // Compute student paid months & pending due months from history
  const studentFeeStatus = useMemo(() => {
    if (!admissionNo && !studentId) return { paidMonths: new Set<string>(), dueMonths: [] };
    const paid = new Set<string>();

    const matches = feeHistory.filter(
      (f) =>
        (f.admission_no && f.admission_no === admissionNo) ||
        (f.student_id && f.student_id === studentId)
    );

    matches.forEach((f) => {
      if (f.due_month && (f.status === "paid" || Number(f.amount_paid) >= Number(f.amount_due))) {
        paid.add(f.due_month);
      }
    });

    const dueMonths = ACADEMIC_MONTHS.filter((m) => !paid.has(m));
    return { paidMonths: paid, dueMonths };
  }, [feeHistory, admissionNo, studentId]);

  // Lookup fee amount from fees_structure whenever class or fee type changes
  useEffect(() => {
    if (!className || !feeType || feeStructures.length === 0) return;
    const targetClass = className.trim().toUpperCase();
    const targetFeeType = feeType.trim().toLowerCase();

    const matched = feeStructures.find(
      (fs) =>
        String(fs.class_name || "").trim().toUpperCase() === targetClass &&
        String(fs.fee_type || "").trim().toLowerCase() === targetFeeType
    );

    if (matched && matched.amount !== undefined && matched.amount !== null) {
      const amt = Number(matched.amount);
      setFeesAmount(amt);
      setAutoFetchedFromStruct(true);
      if (mode === "create" && amountPaid === 0) {
        setAmountPaid(amt);
      }
    } else {
      setAutoFetchedFromStruct(false);
    }
  }, [className, feeType, feeStructures, mode]);

  // Fine Calculation rule implementation:
  // "If student Pay Fees in every Month 10 then Ok If After 10 The Add 50 rs Fine for This month
  // If It Gose To Next Month then 100 automaticaly Add There"
  const calculateFine = (pDateStr: string, dMonthStr: string): { fine: number; reason: string } => {
    if (!pDateStr || !dMonthStr) return { fine: 0, reason: "No payment date or due month specified" };
    const pDate = new Date(pDateStr);
    if (isNaN(pDate.getTime())) return { fine: 0, reason: "Invalid date" };

    const payYear = pDate.getFullYear();
    const payMonthIdx = pDate.getMonth(); // 0 to 11
    const payDay = pDate.getDate();

    // Determine due month index in calendar year
    // Academic year runs April (idx 3) to March (idx 2 next year)
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

    const dueMonthIdx = monthMap[dMonthStr];
    if (dueMonthIdx === undefined) return { fine: 0, reason: "Standard on-time payment" };

    // Resolve calendar year for the due month based on academic year (e.g. 2026-27)
    let dueYear = payYear;
    const parts = academicYear.split("-");
    const baseYear = parseInt(parts[0], 10) || payYear;
    if (dueMonthIdx >= 3) {
      // April to December belongs to start year
      dueYear = baseYear;
    } else {
      // January to March belongs to next year
      dueYear = baseYear + 1;
    }

    const payMonthCode = payYear * 12 + payMonthIdx;
    const dueMonthCode = dueYear * 12 + dueMonthIdx;

    if (payMonthCode < dueMonthCode) {
      // Advance payment
      return { fine: 0, reason: `Advance Payment for ${dMonthStr} (₹0 Fine)` };
    }

    if (payMonthCode === dueMonthCode) {
      // Same month payment: On or before 10th is OK (0 fine), after 10th is 50 rs fine
      if (payDay <= 10) {
        return { fine: 0, reason: `Paid on or before 10th of ${dMonthStr} (On-Time: ₹0 Fine)` };
      } else {
        return { fine: 50, reason: `Paid on ${pDateStr} (After 10th of ${dMonthStr}: ₹50 Late Fine applied)` };
      }
    }

    // Payment in subsequent month(s) (payMonthCode > dueMonthCode)
    const diffMonths = payMonthCode - dueMonthCode;
    return {
      fine: 100,
      reason: `Overdue by ${diffMonths} month(s) (Paid in subsequent month: ₹100 Overdue Fine applied)`,
    };
  };

  // Recalculate fine when payment date or due month changes (unless editing a pre-existing custom fine)
  useEffect(() => {
    if (mode === "view") return;
    const { fine } = calculateFine(paymentDate, dueMonth);
    setFineAmount(fine);
  }, [paymentDate, dueMonth, academicYear, mode]);

  // Effective fine after waiver & principal approval check:
  // "And There Must Keep A Option For Consession Of Wave off Fine option And Its Must Be Approve By Principal"
  const isFineWaivedAndApproved = fineWaived && waiveApprovedByPrincipal;
  const effectiveFine = isFineWaivedAndApproved ? 0 : Number(fineAmount || 0);

  // User calculation formula:
  // "Amount due" This calculation is fees Ammount +fine - amount paid"
  const totalPayable = Number(feesAmount || 0) + effectiveFine;
  const amountDue = Math.max(0, totalPayable - Number(amountPaid || 0));

  // Determine payment status
  const currentStatus =
    amountDue === 0 && amountPaid > 0
      ? "paid"
      : amountPaid > 0 && amountDue > 0
      ? "partial"
      : "pending";

  // Handle student selection
  const handleStudentSelect = (selectedId: string) => {
    setStudentId(selectedId);
    const stu = allStudents.find((s) => s.student_id === selectedId);
    if (stu) {
      setStudentName(stu.full_name || stu.student_name || "");
      setAdmissionNo(stu.admission_no || "");
      if (stu.class_name && stu.class_name !== className) {
        setClassName(stu.class_name);
      }
      // Auto suggest the earliest unpaid month for this student
      const matches = feeHistory.filter(
        (f) =>
          (f.admission_no && f.admission_no === stu.admission_no) ||
          (f.student_id && f.student_id === selectedId)
      );
      const paidMonths = new Set(
        matches
          .filter((f) => f.status === "paid" || Number(f.amount_paid) >= Number(f.amount_due))
          .map((f) => f.due_month)
          .filter(Boolean)
      );
      const firstUnpaid = ACADEMIC_MONTHS.find((m) => !paidMonths.has(m));
      if (firstUnpaid) {
        setDueMonth(firstUnpaid);
      }
    }
  };

  // Handle Class change
  const handleClassChange = (newClass: string) => {
    setClassName(newClass);
    // If currently selected student is not in this class, clear student selection
    const stu = allStudents.find((s) => s.student_id === studentId);
    if (stu && String(stu.class_name || "").toUpperCase() !== newClass.toUpperCase()) {
      setStudentId("");
      setStudentName("");
      setAdmissionNo("");
    }
  };

  // Handle Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setToast?.({ type: "error", message: "Please select or enter a student." });
      return;
    }
    if (!dueMonth) {
      setToast?.({ type: "error", message: "Please select a due month." });
      return;
    }
    if (feesAmount <= 0) {
      setToast?.({ type: "error", message: "Fees amount must be greater than 0." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        ...(initialData || {}),
        class_name: className,
        student_id: studentId || initialData?.student_id,
        admission_no: admissionNo,
        student_name: studentName,
        academic_year: academicYear,
        due_month: dueMonth,
        fee_type: feeType,
        fees_amount: Number(feesAmount),
        fine_amount: Number(fineAmount),
        fine_waived: Boolean(fineWaived),
        waive_approved_by_principal: Boolean(waiveApprovedByPrincipal),
        fine_waive_reason: fineWaiveReason,
        approved_by: approvedBy,
        amount_due: Number(amountDue),
        amount_paid: Number(amountPaid),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        receipt_number: receiptNumber || generateReceiptNumber(),
        status: currentStatus,
        remarks: remarks,
      };

      await onSave(payload);
      setToast?.({
        type: "success",
        message: `Fee record for ${studentName} (${dueMonth}) saved successfully!`,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to save fee collection record:", err);
      setToast?.({
        type: "error",
        message: err?.message || "Failed to save fee collection record.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const fineAnalysis = calculateFine(paymentDate, dueMonth);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "860px",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #0f3661 0%, #1e40af 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={20} style={{ color: "#93c5fd" }} />
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {mode === "create" ? "Collect Student Fees & Dues" : mode === "edit" ? "Edit Fee Record" : "View Fee Record"}
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#bfdbfe" }}>
              Class-wise fee structure, automated late fine calculation & Principal concession workflow
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              borderRadius: "8px",
              color: "#ffffff",
              padding: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
          }}
        >
          {/* Section 1: Class and Student Selection */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f3661",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <User size={15} /> Student & Academic Details
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {/* Class Dropdown */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Select Class <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={className}
                  onChange={(e) => handleClassChange(e.target.value)}
                  disabled={mode === "view"}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#0f172a",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  <option value="">-- Choose Class --</option>
                  {allClasses.map((cls) => {
                    const count = allStudents.filter(
                      (s) => String(s.class_name || "").trim().toUpperCase() === cls.toUpperCase()
                    ).length;
                    return (
                      <option key={cls} value={cls}>
                        {cls} {count > 0 ? `(${count} students)` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Student Dropdown (Filtered by Class) */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Select Student Name <span style={{ color: "#ef4444" }}>*</span>
                  {className && (
                    <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b", marginLeft: "4px" }}>
                      ({classStudents.length} enrolled)
                    </span>
                  )}
                </label>
                <select
                  value={studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  disabled={mode === "view" || !className}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: className ? "#ffffff" : "#f1f5f9",
                    fontSize: "14px",
                    color: "#0f172a",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  <option value="">
                    {!className
                      ? "First select a Class above"
                      : classStudents.length === 0
                      ? "No students found in this class"
                      : "-- Choose Student --"}
                  </option>
                  {classStudents.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.full_name || s.student_name} ({s.admission_no || "No Adm No"}){" "}
                      {s.roll_no ? `• Roll ${s.roll_no}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admission Number */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Admission Number
                </label>
                <input
                  type="text"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  readOnly={mode === "view"}
                  placeholder="e.g. ADM-2026-001"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>

              {/* Academic Year */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Academic Session
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  readOnly={mode === "view"}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Selected Student Confirmation Pill */}
            {studentName && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  background: "#eff6ff",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                  fontSize: "12px",
                  color: "#1e40af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <strong>Student:</strong> {studentName} &nbsp;|&nbsp; <strong>Adm No:</strong> {admissionNo || "—"}{" "}
                  &nbsp;|&nbsp; <strong>Class:</strong> {className || "—"}
                </div>
                {studentFeeStatus.dueMonths.length > 0 && (
                  <div style={{ color: "#b45309", fontWeight: 600 }}>
                    ⚠️ {studentFeeStatus.dueMonths.length} Months Pending Dues
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Due Months Status Tracker */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0f3661",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Calendar size={15} /> Academic Due Months & Status
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "11px", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#15803d" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} /> Paid
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#b45309" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} /> Due / Unpaid
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#1d4ed8" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} /> Selected
                </span>
              </div>
            </div>

            {/* Months Selector Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "8px",
                marginBottom: "14px",
              }}
            >
              {ACADEMIC_MONTHS.map((m) => {
                const isPaid = studentFeeStatus.paidMonths.has(m);
                const isSelected = dueMonth === m;

                return (
                  <button
                    key={m}
                    type="button"
                    disabled={mode === "view"}
                    onClick={() => setDueMonth(m)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid #2563eb"
                        : isPaid
                        ? "1px solid #bbf7d0"
                        : "1px solid #fed7aa",
                      background: isSelected
                        ? "#eff6ff"
                        : isPaid
                        ? "#f0fdf4"
                        : "#fff7ed",
                      color: isSelected
                        ? "#1e40af"
                        : isPaid
                        ? "#166534"
                        : "#9a3412",
                      fontSize: "12px",
                      fontWeight: isSelected ? 700 : 600,
                      cursor: mode === "view" ? "default" : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 2px 4px rgba(37, 99, 235, 0.15)" : "none",
                    }}
                  >
                    <span>{m}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        opacity: 0.85,
                      }}
                    >
                      {isPaid ? "✓ Paid" : isSelected ? "● Active" : "⚠️ Due"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Due Month Dropdown and Info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "14px",
                alignItems: "center",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "4px",
                  }}
                >
                  Selected Due Month <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={dueMonth}
                  onChange={(e) => setDueMonth(e.target.value)}
                  disabled={mode === "view"}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#0f172a",
                    fontWeight: 700,
                    outline: "none",
                  }}
                >
                  {ACADEMIC_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m} {studentFeeStatus.paidMonths.has(m) ? "(Already Paid)" : "(Due)"}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1",
                  fontSize: "12px",
                  color: "#475569",
                  lineHeight: "1.4",
                }}
              >
                <strong>Dues Policy:</strong> Monthly tuition fees are payable by the <strong>10th</strong> of each
                month. If unpaid past the 10th, late fine applies automatically.
              </div>
            </div>
          </div>

          {/* Section 3: Fee Type & Fees Amount (Auto-fetched from fees_structure) */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f3661",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <DollarSign size={15} /> Fee Type & Structure Pricing
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr",
                gap: "14px",
              }}
            >
              {/* Fee Type Dropdown */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Fee Type <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  disabled={mode === "view"}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#0f172a",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  {FEE_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fees Amount */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Fees Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={feesAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFeesAmount(val);
                      setAutoFetchedFromStruct(false);
                    }}
                    readOnly={mode === "view"}
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 24px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "15px",
                      color: "#0f172a",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748b",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    ₹
                  </span>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Payment Date <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  readOnly={mode === "view"}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Structure Link Note */}
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: autoFetchedFromStruct ? "#15803d" : "#475569",
              }}
            >
              {autoFetchedFromStruct ? (
                <>
                  <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
                  <span>
                    Auto-linked to <strong>Fees Structure</strong> ({className} • {feeType}: ₹{feesAmount})
                  </span>
                </>
              ) : (
                <>
                  <Info size={14} style={{ color: "#64748b" }} />
                  <span>
                    Rates can be managed in <strong>Master Setup &gt; Fees Structure</strong>.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Section 4: Fine Column & Automated Fine Rules */}
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #ffedd5",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#9a3412",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Clock size={15} /> Late Fine Calculation Rules
              </div>
              <div
                style={{
                  fontSize: "11px",
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  border: "1px solid #fde68a",
                }}
              >
                Rule: Up to 10th: ₹0 | After 10th: ₹50 | Next Month: ₹100
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "14px",
                alignItems: "center",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#9a3412",
                    marginBottom: "6px",
                  }}
                >
                  Fine Column (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(Number(e.target.value))}
                    readOnly={mode === "view"}
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 24px",
                      borderRadius: "8px",
                      border: "1px solid #fdba74",
                      background: "#ffffff",
                      fontSize: "15px",
                      color: "#9a3412",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9a3412",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    ₹
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #fed7aa",
                  fontSize: "12px",
                  color: "#7c2d12",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "2px" }}>Auto-Assessed Status:</div>
                <div>{fineAnalysis.reason}</div>
              </div>
            </div>
          </div>

          {/* Section 5: Concession / Waive Off Fine (Approved by Principal) */}
          <div
            style={{
              background: fineWaived ? "#f0fdf4" : "#f8fafc",
              border: fineWaived ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "18px",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: fineWaived ? "#166534" : "#0f3661",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ShieldCheck size={16} /> Fine Concession & Waiver Option
              </div>

              {/* Toggle Waive Off */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: mode === "view" ? "default" : "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: fineWaived ? "#15803d" : "#475569",
                }}
              >
                <input
                  type="checkbox"
                  checked={fineWaived}
                  onChange={(e) => {
                    if (mode === "view") return;
                    setFineWaived(e.target.checked);
                    if (e.target.checked && !fineWaiveReason) {
                      setFineWaiveReason("Principal Approved Concession");
                    }
                  }}
                  disabled={mode === "view"}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }}
                />
                Apply Fine Waiver / Concession
              </label>
            </div>

            {fineWaived ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {/* Principal Approval Checkbox */}
                <div
                  style={{
                    padding: "12px 14px",
                    background: waiveApprovedByPrincipal ? "#dcfce7" : "#fef3c7",
                    borderRadius: "8px",
                    border: waiveApprovedByPrincipal ? "1px solid #86efac" : "1px solid #fde68a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: mode === "view" ? "default" : "pointer",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: waiveApprovedByPrincipal ? "#14532d" : "#78350f",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={waiveApprovedByPrincipal}
                      onChange={(e) => {
                        if (mode === "view") return;
                        setWaiveApprovedByPrincipal(e.target.checked);
                      }}
                      disabled={mode === "view"}
                      style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#15803d" }}
                    />
                    <span>Approved by Principal</span>
                  </label>

                  <div style={{ fontSize: "12px", fontWeight: 600 }}>
                    {waiveApprovedByPrincipal ? (
                      <span style={{ color: "#15803d", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={14} /> 100% Fine Waived Off (₹0 Added to Bill)
                      </span>
                    ) : (
                      <span style={{ color: "#b45309", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <AlertCircle size={14} /> Pending Principal Approval (Fine remains payable)
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason & Approver */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: "4px",
                      }}
                    >
                      Reason for Concession / Waiver
                    </label>
                    <input
                      type="text"
                      value={fineWaiveReason}
                      onChange={(e) => setFineWaiveReason(e.target.value)}
                      readOnly={mode === "view"}
                      placeholder="e.g. Approved due to illness / sibling discount / Principal order"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "13px",
                        color: "#0f172a",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: "4px",
                      }}
                    >
                      Approved Authority
                    </label>
                    <input
                      type="text"
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      readOnly={mode === "view"}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "13px",
                        color: "#0f172a",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Enable this option if the student has been granted a late fine concession or waiver by the Principal.
              </p>
            )}
          </div>

          {/* Section 6: Amount Due Mathematical Calculation Box */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f3661 0%, #0369a1 100%)",
              color: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "0 10px 25px -5px rgba(15, 54, 97, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                paddingBottom: "10px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Formula: Amount Due = Fees Amount + Fine - Amount Paid
              </div>
              <div
                style={{
                  fontSize: "11px",
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: 700,
                }}
              >
                Status: {currentStatus.toUpperCase()}
              </div>
            </div>

            {/* Formula Terms Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "12px",
                alignItems: "center",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "10px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 600 }}>Fees Amount</div>
                <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "2px" }}>₹{feesAmount.toLocaleString("en-IN")}</div>
              </div>

              <div style={{ fontSize: "18px", fontWeight: 800, color: "#bfdbfe" }}>+</div>

              <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "10px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 600 }}>Fine Column</div>
                <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "2px" }}>
                  {isFineWaivedAndApproved ? (
                    <span style={{ color: "#86efac" }}>₹0 (Waived)</span>
                  ) : (
                    <span>₹{fineAmount.toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: "18px", fontWeight: 800, color: "#bfdbfe" }}>-</div>

              <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "10px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 600 }}>Amount Paid</div>
                <div style={{ fontSize: "18px", fontWeight: 800, marginTop: "2px", color: "#86efac" }}>
                  ₹{amountPaid.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ fontSize: "18px", fontWeight: 800, color: "#bfdbfe" }}>=</div>

              <div
                style={{
                  background: amountDue > 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)",
                  padding: "10px",
                  borderRadius: "8px",
                  border: amountDue > 0 ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(34, 197, 94, 0.5)",
                }}
              >
                <div style={{ fontSize: "11px", color: "#ffffff", fontWeight: 700 }}>Amount Due</div>
                <div style={{ fontSize: "20px", fontWeight: 900, marginTop: "2px" }}>
                  ₹{amountDue.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Amount Paid Input and Quick Action */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "12px",
                alignItems: "end",
                background: "rgba(255, 255, 255, 0.12)",
                padding: "12px 14px",
                borderRadius: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginBottom: "6px",
                  }}
                >
                  Amount Received Now (₹) <span style={{ color: "#fca5a5" }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  readOnly={mode === "view"}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    background: "#ffffff",
                    fontSize: "16px",
                    color: "#0f172a",
                    fontWeight: 800,
                    outline: "none",
                  }}
                />
              </div>

              {mode !== "view" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(totalPayable)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "8px",
                      background: "#22c55e",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    Pay Full (₹{totalPayable})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(0)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 7: Payment Mode, Receipt Number & Remarks */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            {/* Payment Mode */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                disabled={mode === "view"}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "14px",
                  color: "#0f172a",
                  outline: "none",
                }}
              >
                {PAYMENT_MODES.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            {/* Receipt Number */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Receipt Number
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  readOnly={mode === "view"}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    color: "#0f172a",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
                {mode !== "view" && (
                  <button
                    type="button"
                    onClick={() => setReceiptNumber(generateReceiptNumber())}
                    title="Generate fresh receipt number"
                    style={{
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#f1f5f9",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Remarks / Collection Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                readOnly={mode === "view"}
                placeholder="Optional notes or bank transaction reference..."
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "13px",
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: "8px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            {mode !== "view" && (
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #0f3661 0%, #1e40af 100%)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 6px -1px rgba(15, 54, 97, 0.2)",
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Save & Generate Receipt
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
