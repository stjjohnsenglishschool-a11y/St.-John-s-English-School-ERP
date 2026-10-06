import React, { useState } from "react";
import { ShieldCheck, Plus, Sparkles, FileText, BookOpen, Check, ExternalLink, X, Code } from "lucide-react";
import { SUPABASE_LEAVE_MIGRATION_SQL } from "../lib/supabase";

type LeaveNoticesProps = {
  modTable: "leave_application" | "leave_balance" | "leave_ledger";
  rows: Record<string, unknown>[];
  isStaffOrTeacher: boolean;
  setQuery: (q: string) => void;
  setPage: (p: number) => void;
  setActive: (a: string) => void;
  setModal: (m: { mode: "create" | "edit" | "view"; row?: any } | null) => void;
  handleAutoInitLeaveBalances: () => Promise<void>;
  getCurrentAcademicYear: () => string;
  getLeaveSession: () => { sessionName: string };
  setToast?: (msg: string) => void;
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
  setToast,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_LEAVE_MIGRATION_SQL);
    setCopiedSql(true);
    if (setToast) {
      setToast("✓ Copied complete Supabase SQL for leave_balance & leave_ledger to clipboard!");
    }
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const sqlModalElement = showSqlModal && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={() => setShowSqlModal(false)}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "#0f3661",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Code size={20} color="#93c5fd" />
            <div>
              <div style={{ fontWeight: 800, fontSize: "15px" }}>Supabase PostgreSQL Schema: leave_balance & leave_ledger</div>
              <div style={{ fontSize: "12px", color: "#bfdbfe" }}>
                Tables: public.leave_balance (user_id, current_pl_balance, last_updated_date) & public.leave_ledger
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSqlModal(false)}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, background: "#0f172a", color: "#e2e8f0" }}>
          <pre
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
            }}
          >
            {SUPABASE_LEAVE_MIGRATION_SQL}
          </pre>
        </div>

        <div
          style={{
            padding: "12px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Copy and paste this script directly into your Supabase Dashboard SQL Editor.
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleCopySql}
              style={{
                background: copiedSql ? "#16a34a" : "#0f3661",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {copiedSql ? <Check size={15} /> : <FileText size={15} />}
              {copiedSql ? "SQL Copied!" : "Copy SQL"}
            </button>
            <a
              href="https://supabase.com/dashboard/project/dbliogptcikqyzkbqnus/sql/new"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={15} />
              Open SQL Editor
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  if (modTable === "leave_application") {
    return (
      <>
        {sqlModalElement}
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
              • 6 Months Probation (0 PL) • 1 PL Monthly Credit after 6 months • Principal approval workflow • Rejected absences trigger LOP salary deduction
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            <button
              onClick={() => setActive("leave_ledger")}
              style={{
                background: "#eff6ff",
                color: "#1e40af",
                border: "1px solid #bfdbfe",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <BookOpen size={13} />
              Leave Ledger
            </button>
          </div>
        </div>
      </>
    );
  }

  if (modTable === "leave_balance") {
    return (
      <>
        {sqlModalElement}
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
                  ? `My Privilege Leave (PL) Balance (${getCurrentAcademicYear()})`
                  : `Staff Privilege Leave (PL) Register (${getCurrentAcademicYear()})`}
              </span>
            </div>
            <div style={{ color: isStaffOrTeacher ? "#15803d" : "#3b82f6", fontSize: "12px", marginTop: "3px" }}>
              • Schema: user_id, current_pl_balance, last_updated_date • 6 Months Probation (0 PL) • 1 PL Monthly Credit for Eligible Staff • Persisted directly in Supabase
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setActive("leave_ledger")}
              style={{
                background: "#fff",
                color: "#1e40af",
                border: "1px solid #bfdbfe",
                padding: "7px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <BookOpen size={14} />
              Leave Ledger
            </button>
            {!isStaffOrTeacher && (
              <button
                onClick={() => setShowSqlModal(true)}
                title="View or Copy Supabase SQL for leave_balance & leave_ledger"
                style={{
                  background: "#0f3661",
                  color: "#fff",
                  border: "none",
                  padding: "7px 13px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Code size={14} />
                Supabase SQL
              </button>
            )}
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
                title="Automatically calculate & sync 1 PL/month for all staff based on Date of Joining directly in Supabase"
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
                Sync & Auto-Credit Staff PL
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  if (modTable === "leave_ledger") {
    return (
      <>
        {sqlModalElement}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
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
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div
              style={{
                fontWeight: 800,
                color: "#0f172a",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <BookOpen size={18} color="#0f3661" />
              <span>
                {isStaffOrTeacher
                  ? `My Privilege Leave (PL) Ledger Audit Trail (${getCurrentAcademicYear()})`
                  : `Official PL Leave Ledger & Audit Trail (${getCurrentAcademicYear()})`}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "#dbeafe",
                  color: "#1e40af",
                }}
              >
                {rows.length} Ledger Transactions
              </span>
            </div>
            <div style={{ color: "#475569", fontSize: "12px", marginTop: "3px" }}>
              • Schema: user_id, transaction_date, type (Credit/Debit), amount, balance_after, reference_id • Automatic Monthly PL Credits & Debits
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setActive("leave_balance")}
              style={{
                background: "#fff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                padding: "7px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              View Balances
            </button>
            <button
              onClick={() => setShowSqlModal(true)}
              title="View or Copy Supabase SQL for leave_balance & leave_ledger"
              style={{
                background: "#0f3661",
                color: "#fff",
                border: "none",
                padding: "7px 13px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Code size={14} />
              View / Copy SQL
            </button>
            {!isStaffOrTeacher && (
              <button
                onClick={handleAutoInitLeaveBalances}
                title="Automatically calculate & sync 1 PL/month for all staff based on Date of Joining directly in Supabase"
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
                Sync Ledger & Balances
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  return null;
};
