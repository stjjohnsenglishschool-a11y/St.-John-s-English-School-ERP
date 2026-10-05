import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CreditCard,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { fetchCollectionData } from "../lib/supabase";
import { getCurrentAcademicYear } from "../lib/academicYear";

import { ACADEMIC_MONTHS, STANDARD_CLASSES } from "./fee-collection/constants";
import { generateReceiptNumber, calculateFine } from "./fee-collection/utils";
import { StudentSelectionSection } from "./fee-collection/StudentSelectionSection";
import { DueMonthTrackerSection } from "./fee-collection/DueMonthTrackerSection";
import { FeeDetailsSection } from "./fee-collection/FeeDetailsSection";
import { LateFineSection } from "./fee-collection/LateFineSection";
import { FineWaiverSection } from "./fee-collection/FineWaiverSection";
import { PaymentSummarySection } from "./fee-collection/PaymentSummarySection";
import { PaymentModeSection } from "./fee-collection/PaymentModeSection";

export interface FeeCollectionModalProps {
  isOpen: boolean;
  mode: "create" | "edit" | "view";
  initialData?: Record<string, any>;
  onClose: () => void;
  onSave: (data: Record<string, any>) => Promise<void>;
  setToast?: (toast: { type: "success" | "error" | "info"; message: string }) => void;
}

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
      const curMonthIdx = new Date().getMonth();
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

  // Recalculate fine when payment date or due month changes
  useEffect(() => {
    if (mode === "view") return;
    const { fine } = calculateFine(paymentDate, dueMonth, academicYear);
    setFineAmount(fine);
  }, [paymentDate, dueMonth, academicYear, mode]);

  // Effective fine after waiver & principal approval check
  const isFineWaivedAndApproved = fineWaived && Boolean(principalApproval && principalApproval.trim().length > 0);
  const effectiveFine = isFineWaivedAndApproved ? 0 : Number(fineAmount || 0);

  // Amount due calculation
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

  const fineAnalysis = calculateFine(paymentDate, dueMonth, academicYear);

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
          <StudentSelectionSection
            className={className}
            allClasses={allClasses}
            allStudents={allStudents}
            handleClassChange={handleClassChange}
            studentId={studentId}
            handleStudentSelect={handleStudentSelect}
            classStudents={classStudents}
            admissionNo={admissionNo}
            setAdmissionNo={setAdmissionNo}
            academicYear={academicYear}
            setAcademicYear={setAcademicYear}
            studentName={studentName}
            studentFeeStatus={studentFeeStatus}
            mode={mode}
          />

          {/* Section 2: Due Months Status Tracker */}
          <DueMonthTrackerSection
            dueMonth={dueMonth}
            setDueMonth={setDueMonth}
            studentFeeStatus={studentFeeStatus}
            mode={mode}
          />

          {/* Section 3: Fee Details & Pricing */}
          <FeeDetailsSection
            feeType={feeType}
            setFeeType={setFeeType}
            feesAmount={feesAmount}
            setFeesAmount={setFeesAmount}
            setAutoFetchedFromStruct={setAutoFetchedFromStruct}
            paymentDate={paymentDate}
            setPaymentDate={setPaymentDate}
            mode={mode}
          />

          {/* Section 4: Late Fine */}
          <LateFineSection
            fineAmount={fineAmount}
            setFineAmount={setFineAmount}
            fineAnalysisReason={fineAnalysis.reason}
            mode={mode}
          />

          {/* Section 5: Fine Concession / Waiver */}
          <FineWaiverSection
            fineWaived={fineWaived}
            setFineWaived={setFineWaived}
            principalApproval={principalApproval}
            setPrincipalApproval={setPrincipalApproval}
            setWaiveApprovedByPrincipal={setWaiveApprovedByPrincipal}
            fineWaiveReason={fineWaiveReason}
            setFineWaiveReason={setFineWaiveReason}
            approvedBy={approvedBy}
            setApprovedBy={setApprovedBy}
            isFineWaivedAndApproved={isFineWaivedAndApproved}
            mode={mode}
          />

          {/* Section 6: Payment Summary & Amount Paid */}
          <PaymentSummarySection
            feesAmount={feesAmount}
            fineAmount={fineAmount}
            isFineWaivedAndApproved={isFineWaivedAndApproved}
            amountPaid={amountPaid}
            setAmountPaid={setAmountPaid}
            amountDue={amountDue}
            totalPayable={totalPayable}
            mode={mode}
          />

          {/* Section 7: Payment Mode, Receipt Number & Remarks */}
          <PaymentModeSection
            paymentMode={paymentMode}
            setPaymentMode={setPaymentMode}
            receiptNumber={receiptNumber}
            setReceiptNumber={setReceiptNumber}
            generateReceiptNumber={generateReceiptNumber}
            remarks={remarks}
            setRemarks={setRemarks}
            mode={mode}
          />

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
