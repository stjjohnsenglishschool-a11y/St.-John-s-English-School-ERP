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
  const [principalApproval, setPrincipalApproval] = useState<string>("");
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
      const initPrincipalApproval = String(
        initialData.principal_approval ||
        (initialData.waive_approved_by_principal ? (initialData.approved_by || "Approved by Principal") : "")
      );
      setPrincipalApproval(initPrincipalApproval);
      setWaiveApprovedByPrincipal(Boolean(initPrincipalApproval.trim().length > 0));
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
  // "Also, add a checkbox for 'Fine Waived' that requires a 'Principal Approval' field to be filled before it applies."
  const isFineWaivedAndApproved = fineWaived && Boolean(principalApproval && principalApproval.trim().length > 0);
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
        principal_approval: principalApproval,
        waive_approved_by_principal: Boolean(isFineWaivedAndApproved),
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
            padding: "16px 20px",
            background: "linear-gradient(135deg, #0f3661 0%, #1e40af 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CreditCard size={20} style={{ color: "#93c5fd" }} />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
              {mode === "create" ? "Collect Student Fees & Dues" : mode === "edit" ? "Edit Fee Record" : "View Fee Record"}
            </h2>
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
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
          }}
        >
          {/* Section 1: Class and Student Selection */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#0f3661",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <User size={14} /> Student Details
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
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
                    marginBottom: "4px",
                  }}
                >
                  Class <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={className}
                  onChange={(e) => handleClassChange(e.target.value)}
                  disabled={mode === "view"}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
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
                        {cls} {count > 0 ? `(${count})` : ""}
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
                    marginBottom: "4px",
                  }}
                >
                  Student Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  disabled={mode === "view" || !className}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: className ? "#ffffff" : "#f1f5f9",
                    fontSize: "13px",
                    color: "#0f172a",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  <option value="">
                    {!className
                      ? "Select Class first"
                      : classStudents.length === 0
                      ? "No students found"
                      : "-- Choose Student --"}
                  </option>
                  {classStudents.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.full_name || s.student_name} {s.admission_no ? `(${s.admission_no})` : ""}{" "}
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
                    marginBottom: "4px",
                  }}
                >
                  Admission No
                </label>
                <input
                  type="text"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  readOnly={mode === "view"}
                  placeholder="e.g. ADM-001"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
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
                    marginBottom: "4px",
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
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
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
                  marginTop: "10px",
                  padding: "6px 10px",
                  background: "#eff6ff",
                  borderRadius: "6px",
                  border: "1px solid #bfdbfe",
                  fontSize: "12px",
                  color: "#1e40af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <div>
                  <strong>{studentName}</strong> | Adm: {admissionNo || "—"} | Class: {className || "—"}
                </div>
                {studentFeeStatus.dueMonths.length > 0 && (
                  <div style={{ color: "#b45309", fontWeight: 600 }}>
                    ⚠️ {studentFeeStatus.dueMonths.length} Months Due
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
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#0f3661",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Calendar size={14} /> Due Month
              </div>
              <div style={{ display: "flex", gap: "8px", fontSize: "11px", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#15803d" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} /> Paid
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#b45309" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f59e0b" }} /> Due
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#1d4ed8" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6" }} /> Active
                </span>
              </div>
            </div>

            {/* Months Selector Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "6px",
                marginBottom: "10px",
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
                      padding: "6px 4px",
                      borderRadius: "6px",
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
                      fontSize: "11px",
                      fontWeight: isSelected ? 700 : 600,
                      cursor: mode === "view" ? "default" : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{m.slice(0, 3)}</span>
                    <span style={{ fontSize: "9px", opacity: 0.85 }}>
                      {isPaid ? "✓ Paid" : isSelected ? "● Active" : "Due"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Due Month Dropdown (Simple & direct) */}
            <div style={{ maxWidth: "260px" }}>
              <select
                value={dueMonth}
                onChange={(e) => setDueMonth(e.target.value)}
                disabled={mode === "view"}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "13px",
                  color: "#0f172a",
                  fontWeight: 600,
                  outline: "none",
                }}
              >
                {ACADEMIC_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} {studentFeeStatus.paidMonths.has(m) ? "(Paid)" : "(Due)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Fee Details & Pricing */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#0f3661",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <DollarSign size={14} /> Fee Details
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
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
                    marginBottom: "4px",
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
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
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
                    marginBottom: "4px",
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
                      padding: "8px 10px 8px 22px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "14px",
                      color: "#0f172a",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748b",
                      fontSize: "13px",
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
                    marginBottom: "4px",
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
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Late Fine */}
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#9a3412",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Clock size={14} /> Late Fine
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: fineAmount > 0 ? "#b45309" : "#15803d",
                  fontWeight: 600,
                  background: fineAmount > 0 ? "#fef3c7" : "#dcfce7",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: `1px solid ${fineAmount > 0 ? "#fde68a" : "#bbf7d0"}`,
                }}
              >
                {fineAnalysis.reason}
              </div>
            </div>

            <div style={{ maxWidth: "200px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#9a3412",
                  marginBottom: "4px",
                }}
              >
                Fine Amount (₹)
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
                    padding: "8px 10px 8px 22px",
                    borderRadius: "6px",
                    border: "1px solid #fdba74",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#9a3412",
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9a3412",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  ₹
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Fine Concession / Waiver (Approved by Principal) */}
          <div
            style={{
              background: fineWaived ? "#f0fdf4" : "#f8fafc",
              border: fineWaived ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: fineWaived ? "10px" : "0",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: mode === "view" ? "default" : "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: fineWaived ? "#15803d" : "#334155",
                }}
              >
                <input
                  type="checkbox"
                  checked={fineWaived}
                  onChange={(e) => {
                    if (mode === "view") return;
                    setFineWaived(e.target.checked);
                    if (e.target.checked && !fineWaiveReason) {
                      setFineWaiveReason("Principal Approval");
                    }
                  }}
                  disabled={mode === "view"}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }}
                />
                Fine Waiver / Concession
              </label>

              {fineWaived && (
                <span style={{ fontSize: "11px", fontWeight: 700, color: isFineWaivedAndApproved ? "#15803d" : "#b45309" }}>
                  {isFineWaivedAndApproved ? "✓ 100% Fine Waived (₹0)" : "Pending Principal Approval (Fine remains active)"}
                </span>
              )}
            </div>

            {fineWaived && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Principal Approval Required Field */}
                <div
                  style={{
                    padding: "10px 12px",
                    background: isFineWaivedAndApproved ? "#dcfce7" : "#fff7ed",
                    borderRadius: "8px",
                    border: isFineWaivedAndApproved ? "1.5px solid #86efac" : "1.5px solid #fdba74",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: isFineWaivedAndApproved ? "#14532d" : "#c2410c",
                      marginBottom: "4px",
                    }}
                  >
                    Principal Approval *
                  </label>
                  <input
                    type="text"
                    value={principalApproval}
                    onChange={(e) => {
                      if (mode === "view") return;
                      const val = e.target.value;
                      setPrincipalApproval(val);
                      setWaiveApprovedByPrincipal(val.trim().length > 0);
                      if (val.trim().length > 0 && !approvedBy) {
                        setApprovedBy(val);
                      }
                    }}
                    readOnly={mode === "view"}
                    placeholder="Enter Principal approval details (e.g. Fr. Principal Approval #842)"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: `1.5px solid ${isFineWaivedAndApproved ? "#86efac" : "#fb923c"}`,
                      background: "#ffffff",
                      fontSize: "12px",
                      color: "#0f172a",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: "11px", marginTop: "4px", fontWeight: 600, color: isFineWaivedAndApproved ? "#15803d" : "#c2410c" }}>
                    {isFineWaivedAndApproved
                      ? "✓ Principal approval verified. The late fine is waived (₹0)."
                      : "⚠ Fine waiver will NOT apply until this Principal Approval field is filled."}
                  </div>
                </div>

                {/* Reason & Approver */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: "3px",
                      }}
                    >
                      Reason
                    </label>
                    <input
                      type="text"
                      value={fineWaiveReason}
                      onChange={(e) => setFineWaiveReason(e.target.value)}
                      readOnly={mode === "view"}
                      placeholder="e.g. Approved concession"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "12px",
                        color: "#0f172a",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: "3px",
                      }}
                    >
                      Approving Authority
                    </label>
                    <input
                      type="text"
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      readOnly={mode === "view"}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "12px",
                        color: "#0f172a",
                        fontWeight: 600,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Payment Summary & Amount Paid */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f3661 0%, #0369a1 100%)",
              color: "#ffffff",
              borderRadius: "10px",
              padding: "16px",
              boxShadow: "0 4px 12px rgba(15, 54, 97, 0.2)",
            }}
          >
            {/* Terms Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: "8px",
                alignItems: "center",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "8px", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 600 }}>Fees</div>
                <div style={{ fontSize: "16px", fontWeight: 800 }}>₹{feesAmount.toLocaleString("en-IN")}</div>
              </div>

              <div style={{ fontSize: "16px", fontWeight: 800, color: "#bfdbfe" }}>+</div>

              <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "8px", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 600 }}>Fine</div>
                <div style={{ fontSize: "16px", fontWeight: 800 }}>
                  {isFineWaivedAndApproved ? (
                    <span style={{ color: "#86efac" }}>₹0</span>
                  ) : (
                    <span>₹{fineAmount.toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: "16px", fontWeight: 800, color: "#bfdbfe" }}>-</div>

              <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "8px", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 600 }}>Paid</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#86efac" }}>
                  ₹{amountPaid.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ fontSize: "16px", fontWeight: 800, color: "#bfdbfe" }}>=</div>

              <div
                style={{
                  background: amountDue > 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)",
                  padding: "8px",
                  borderRadius: "6px",
                  border: amountDue > 0 ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(34, 197, 94, 0.5)",
                }}
              >
                <div style={{ fontSize: "11px", color: "#ffffff", fontWeight: 700 }}>Due</div>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>
                  ₹{amountDue.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Amount Paid Input and Quick Action */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "10px",
                alignItems: "end",
                background: "rgba(255, 255, 255, 0.12)",
                padding: "10px 12px",
                borderRadius: "8px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginBottom: "4px",
                  }}
                >
                  Amount Received (₹) <span style={{ color: "#fca5a5" }}>*</span>
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
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    background: "#ffffff",
                    fontSize: "15px",
                    color: "#0f172a",
                    fontWeight: 800,
                    outline: "none",
                  }}
                />
              </div>

              {mode !== "view" && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(totalPayable)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      background: "#22c55e",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Pay Full (₹{totalPayable})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(0)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      fontSize: "12px",
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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
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
                  marginBottom: "4px",
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
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "13px",
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
                  marginBottom: "4px",
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
                    padding: "8px 10px",
                    borderRadius: "6px",
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
                    title="Generate new receipt"
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: "#f1f5f9",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={13} />
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
                  marginBottom: "4px",
                }}
              >
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                readOnly={mode === "view"}
                placeholder="Optional notes..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
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
              paddingTop: "12px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
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
                  padding: "8px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #0f3661 0%, #1e40af 100%)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(15, 54, 97, 0.2)",
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Save & Generate Receipt
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
