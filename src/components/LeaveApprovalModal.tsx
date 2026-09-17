import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Calendar, Clock, User, FileText, ShieldCheck, X } from "lucide-react";
import { calculateEmployeeLeaveSummary } from "../lib/leaveSalaryRules";
import { saveDocument, logActivity } from "../lib/firebase";

interface LeaveApprovalModalProps {
  leaveApp: Record<string, any>;
  employee?: Record<string, any>;
  allLeaves?: Record<string, any>[];
  onClose: () => void;
  onSuccess: () => void;
  setToast: (msg: string) => void;
}

export default function LeaveApprovalModal({
  leaveApp,
  employee = {},
  allLeaves = [],
  onClose,
  onSuccess,
  setToast,
}: LeaveApprovalModalProps) {
  const [remarks, setRemarks] = useState(leaveApp.remarks || "");
  const [submitting, setSubmitting] = useState(false);

  // Compute leave metrics and probation status
  const fromDate = leaveApp.from_date || leaveApp.leave_date || "";
  const toDate = leaveApp.to_date || fromDate;
  const requestedDays = Number(leaveApp.total_days || 1);
  const leaveType = leaveApp.leave_type || "PL (Privilege Leave)";

  const dateObj = fromDate ? new Date(fromDate) : new Date();
  const monthName = dateObj.toLocaleString("default", { month: "long" });
  const yearNum = dateObj.getFullYear();

  const summary = calculateEmployeeLeaveSummary(employee, allLeaves, monthName, yearNum);

  const isProbationary = summary.employmentStatus === "Probationary";
  const isPL = leaveType.toUpperCase().includes("PL") || leaveType.toUpperCase().includes("PRIVILEGE");
  const hasInsufficientBalance = isPL && requestedDays > summary.plBalance;
  const monthlyLimitExceeded = isPL && (summary.plTakenThisMonth + requestedDays > 2);

  const handleDecision = async (decision: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      const updatedApp = {
        ...leaveApp,
        status: decision,
        approved_by: decision === "approved" ? "Principal" : undefined,
        rejected_by: decision === "rejected" ? "Principal" : undefined,
        decision_date: new Date().toISOString().split("T")[0],
        remarks: remarks || (decision === "approved" ? "Approved by Principal" : "Rejected by Principal"),
        updated_at: new Date().toISOString(),
      };

      // 1. Save updated leave application to Firebase
      await saveDocument("leave_application", "leave_app_id", updatedApp);

      // 2. If approved and it's PL: Record deduction in leave_balance
      if (decision === "approved" && isPL) {
        const empId = employee.emp_id || employee.emp_code || leaveApp.emp_id || leaveApp.emp_code;
        const balanceDoc = {
          emp_id: empId,
          employee_name:
            (employee.first_name ? `${employee.first_name} ${employee.last_name || ""}`.trim() : null) ||
            leaveApp.employee_name ||
            employee.full_name ||
            "Employee",
          leave_type: "PL",
          academic_year: summary.sessionName,
          total_entitled: summary.plOpeningBalance + summary.plCreditedThisSession,
          total_taken: summary.plTakenThisSession + requestedDays,
          balance_remaining: Math.max(0, summary.plBalance - requestedDays),
          updated_at: new Date().toISOString(),
        };
        await saveDocument("leave_balance", "balance_id", {
          balance_id: `BAL_${empId}_PL`,
          ...balanceDoc,
        });
      }

      // 3. Log audit activity
      logActivity({
        action: `Principal ${decision.toUpperCase()} leave request for ${leaveApp.employee_name} (${requestedDays} days)`,
        module: "leave_application",
        status: "success",
      }).catch(() => {});

      setToast(
        decision === "approved"
          ? `Leave approved for ${leaveApp.employee_name}. Leave balance adjusted.`
          : `Leave rejected. Treated as unauthorized absence / LWP with daily salary deduction.`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error processing leave decision:", err);
      setToast(`Error processing decision: ${err.message || "Failed to update record"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "620px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f3661 0%, #1e4b85 100%)",
            color: "#fff",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                padding: "8px",
                borderRadius: "10px",
                display: "flex",
              }}
            >
              <ShieldCheck size={22} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800 }}>Principal Leave Approval</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>
                Review and decide leave entitlement & salary impact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#fff",
              padding: "6px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px", maxHeight: "75vh", overflowY: "auto" }}>
          {/* Employee & Status Card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              padding: "14px 18px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
          >
            <div>
              <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 600 }}>Employee Name</div>
              <div style={{ fontWeight: 800, color: "#0f3661", fontSize: "15px", marginTop: "2px" }}>
                {leaveApp.employee_name || employee.first_name || "—"}
              </div>
              <div style={{ color: "#64748b", fontSize: "12px" }}>
                Code: <b>{employee.emp_code || leaveApp.emp_code || leaveApp.emp_id || "—"}</b>
              </div>
            </div>

            <div>
              <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: 600 }}>Employment Status</div>
              <div style={{ marginTop: "4px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: isProbationary ? "#fef3c7" : "#dcfce7",
                    color: isProbationary ? "#92400e" : "#166534",
                    border: `1px solid ${isProbationary ? "#fde68a" : "#bbf7d0"}`,
                  }}
                >
                  {summary.employmentStatus} ({summary.completedMonths} months completed)
                </span>
              </div>
              <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                Joined: {summary.joiningDate}
              </div>
            </div>
          </div>

          {/* Leave Details Box */}
          <div
            style={{
              padding: "16px",
              background: "#ffffff",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Leave Requested</span>
              <span
                style={{
                  background: "#e0f2fe",
                  color: "#0369a1",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                {leaveType}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "4px" }}>
              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>From Date</div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", marginTop: "2px" }}>{fromDate}</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>To Date</div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", marginTop: "2px" }}>{toDate}</div>
              </div>
              <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "8px", border: "1px solid #dbeafe" }}>
                <div style={{ fontSize: "11px", color: "#1d4ed8" }}>Total Requested</div>
                <div style={{ fontWeight: 800, fontSize: "15px", color: "#1e40af", marginTop: "2px" }}>
                  {requestedDays} Day{requestedDays > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {leaveApp.reason && (
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#475569", background: "#fafaf9", padding: "10px", borderRadius: "6px", border: "1px solid #f5f5f4" }}>
                <b>Reason:</b> {leaveApp.reason}
              </div>
            )}
          </div>

          {/* Rules & Balances Grid */}
          <div
            style={{
              padding: "16px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f3661", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Leave Balance & Policy Check ({summary.sessionName})
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "4px" }}>
              <div style={{ background: "#fff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Credited PL</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f3661" }}>{summary.plCreditedThisSession} PL</div>
              </div>
              <div style={{ background: "#fff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Taken This Month</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: summary.plTakenThisMonth >= 2 ? "#dc2626" : "#0f3661" }}>
                  {summary.plTakenThisMonth} / 2 PL
                </div>
              </div>
              <div style={{ background: "#fff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Available PL Balance</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: summary.plBalance > 0 ? "#16a34a" : "#dc2626" }}>
                  {summary.plBalance} PL
                </div>
              </div>
            </div>

            {/* Warnings if rule limits violated */}
            {isProbationary && isPL && (
              <div style={{ display: "flex", gap: "8px", background: "#fef3c7", padding: "10px", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "12px", color: "#92400e" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <b>Probation Notice:</b> Employee is in 6-month probation. PL is typically restricted. If approved, it will consume available balance or be granted by special Principal discretion.
                </div>
              </div>
            )}

            {monthlyLimitExceeded && (
              <div style={{ display: "flex", gap: "8px", background: "#fef2f2", padding: "10px", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "12px", color: "#991b1b" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <b>Monthly Limit Warning:</b> Permanent employees can take at most 2 PL per calendar month. This request exceeds that guideline.
                </div>
              </div>
            )}

            {hasInsufficientBalance && (
              <div style={{ display: "flex", gap: "8px", background: "#fef2f2", padding: "10px", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "12px", color: "#991b1b" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <b>Insufficient Balance:</b> Requested {requestedDays} days, but available PL balance is only {summary.plBalance}.
                </div>
              </div>
            )}
          </div>

          {/* Salary Deduction Impact Transparency */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#166534",
            }}
          >
            <b>Salary Impact Policy:</b>
            <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
              <li>
                <b>If Approved:</b> Deducts {requestedDays} PL from balance. Employee receives <b>full normal salary</b> (no deduction).
              </li>
              <li>
                <b>If Rejected:</b> Balance is <b>NOT deducted</b>. Treated as Unauthorized Absence / LWP. Automatically deducts{" "}
                <b>₹{Math.round(requestedDays * summary.dailySalaryRate).toLocaleString("en-IN")}</b> ({requestedDays} days × ₹{summary.dailySalaryRate}/day) on this month&apos;s salary slip.
              </li>
            </ul>
          </div>

          {/* Remarks input */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>
              Principal Remarks / Notes:
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved as per school leave rules / Disapproved due to examination schedule"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            padding: "16px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#64748b",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              disabled={submitting}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#dc2626",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
              }}
            >
              <XCircle size={16} /> Reject (Apply LWP Deduction)
            </button>

            <button
              type="button"
              onClick={() => handleDecision("approved")}
              disabled={submitting}
              style={{
                padding: "9px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#16a34a",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
              }}
            >
              <CheckCircle2 size={16} /> Approve Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
