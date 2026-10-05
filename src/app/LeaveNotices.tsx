import React from "react";
import { ShieldCheck, Plus, Sparkles } from "lucide-react";

type LeaveNoticesProps = {
  modTable: "leave_application" | "leave_balance";
  rows: Record<string, unknown>[];
  isStaffOrTeacher: boolean;
  setQuery: (q: string) => void;
  setPage: (p: number) => void;
  setActive: (a: string) => void;
  setModal: (m: { mode: "create" | "edit" | "view"; row?: any } | null) => void;
  handleAutoInitLeaveBalances: () => Promise<void>;
  getCurrentAcademicYear: () => string;
  getLeaveSession: () => { sessionName: string };
};

export const LeaveNotices: React.FC<LeaveNoticesProps> = ({
  modTable,
  rows,
  isStaffOrTeacher,
  setQuery,
  setPage,
  setActive,
  setModal,
  handleAutoInitLeaveBalances,
  getCurrentAcademicYear,
  getLeaveSession,
}) => {
  if (modTable === "leave_application") {
    return (
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "10px",
          padding: "12px 18px",
          marginBottom: "14px",
          fontSize: "13px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, color: "#166534", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={18} color="#16a34a" />
            <span>SJES Leave Accounting Session: {getLeaveSession().sessionName}</span>
          </div>
          <div style={{ color: "#15803d", fontSize: "12px", marginTop: "3px" }}>
            • 6 Months Probation (Probationary → Permanent) • 1 PL Credited on Month 7 milestone • Max 2 PL / Month • Principal approval workflow with LWP salary deduction for rejected absences
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              setQuery("pending");
              setPage(1);
            }}
            style={{
              background: "#dcfce7",
              color: "#166534",
              border: "1px solid #86efac",
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Pending Approvals ({rows.filter((r) => String(r.status || "").toLowerCase() === "pending").length})
          </button>
          <button
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
            style={{
              background: "#fff",
              color: "#475569",
              border: "1px solid #cbd5e1",
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All Records
          </button>
        </div>
      </div>
    );
  }

  if (modTable === "leave_balance") {
    return (
      <div
        style={{
          background: isStaffOrTeacher ? "#f0fdf4" : "#eff6ff",
          border: `1px solid ${isStaffOrTeacher ? "#bbf7d0" : "#bfdbfe"}`,
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "14px",
          fontSize: "13px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              color: isStaffOrTeacher ? "#166534" : "#1e40af",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldCheck size={18} color={isStaffOrTeacher ? "#16a34a" : "#2563eb"} />
            <span>
              {isStaffOrTeacher
                ? `My Official Leave Entitlements & Balances (${getCurrentAcademicYear()})`
                : `Annual Staff Leave Balance Register (${getCurrentAcademicYear()})`}
            </span>
          </div>
          <div style={{ color: isStaffOrTeacher ? "#15803d" : "#3b82f6", fontSize: "12px", marginTop: "3px" }}>
            • Casual Leave (CL: 12d) • Medical Leave (ML: 10d) • Earned Leave (PL/EL: 15d) • Remaining = Entitled − Taken
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {isStaffOrTeacher ? (
            <button
              onClick={() => {
                setActive("leave_application");
                setModal({ mode: "create" });
              }}
              title="Apply for a new leave request"
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#fff",
                border: "none",
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(22,163,74,0.25)",
              }}
            >
              <Plus size={14} />
              Apply for Leave
            </button>
          ) : (
            <button
              onClick={handleAutoInitLeaveBalances}
              title="Automatically create annual leave balances for all active staff in Employee Master"
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                border: "none",
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
              }}
            >
              <Sparkles size={14} />
              Initialize All Staff Balances
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
