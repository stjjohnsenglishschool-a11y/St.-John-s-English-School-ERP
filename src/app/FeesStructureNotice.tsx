import React from "react";
import { ShieldCheck, FileText } from "lucide-react";
import { checkSupabaseTableStatus, SUPABASE_FEES_STRUCTURE_SQL } from "../lib/supabase";

type FeesStructureNoticeProps = {
  feesTableExists: boolean | null;
  feesTableChecking: boolean;
  recordCount: number;
  setToast: (msg: string) => void;
  setFeesTableChecking: (checking: boolean) => void;
  setFeesTableExists: (exists: boolean) => void;
  refresh: () => Promise<void> | void;
};

export const FeesStructureNotice: React.FC<FeesStructureNoticeProps> = ({
  feesTableExists,
  feesTableChecking,
  recordCount,
  setToast,
  setFeesTableChecking,
  setFeesTableExists,
  refresh,
}) => {
  return (
    <div
      style={{
        background: feesTableExists === false ? "#fff7ed" : "#f0f9ff",
        border: feesTableExists === false ? "1px solid #fed7aa" : "1px solid #bae6fd",
        borderRadius: "10px",
        padding: "14px 18px",
        marginBottom: "16px",
        fontSize: "13px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ flex: 1, minWidth: "280px" }}>
        <div style={{ fontWeight: 800, color: feesTableExists === false ? "#c2410c" : "#0369a1", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={18} color={feesTableExists === false ? "#ea580c" : "#0284c7"} />
          <span>Supabase Database Table: public.fees_structure</span>
          {feesTableChecking ? (
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Checking live database...</span>
          ) : feesTableExists === false ? (
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "#ffedd5", color: "#9a3412" }}>
              Table Not Found in Supabase
            </span>
          ) : feesTableExists === true ? (
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "#dcfce7", color: "#166534" }}>
              Live in Supabase ({recordCount} records)
            </span>
          ) : null}
        </div>
        <div style={{ color: "#475569", fontSize: "12px", marginTop: "4px" }}>
          {feesTableExists === false
            ? "The table does not exist in your Supabase PostgreSQL instance yet. Execute the SQL migration below in Supabase SQL Editor to create it directly in Supabase without any local dummy code."
            : "Class-wise fee structures and rates are loaded directly from your live Supabase database with zero dummy data."}
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(SUPABASE_FEES_STRUCTURE_SQL);
            setToast("Supabase fees_structure SQL copied to clipboard!");
          }}
          style={{
            background: "#0f3661",
            color: "#fff",
            border: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <FileText size={14} /> Copy Supabase SQL
        </button>
        <button
          type="button"
          onClick={() => {
            window.open("https://supabase.com/dashboard/project/dbliogptcikqyzkbqnus/sql/new", "_blank");
          }}
          style={{
            background: "#fff",
            color: "#0f3661",
            border: "1px solid #cbd5e1",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Open Supabase SQL Editor
        </button>
        <button
          type="button"
          onClick={async () => {
            setFeesTableChecking(true);
            const res = await checkSupabaseTableStatus("fees_structure");
            setFeesTableExists(res.exists);
            setFeesTableChecking(false);
            if (res.exists) {
              setToast("fees_structure verified live in Supabase!");
              void refresh();
            } else {
              setToast("Table still not found in Supabase. Please run the SQL in Supabase.");
            }
          }}
          style={{
            background: "#e2e8f0",
            color: "#334155",
            border: "none",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Check Again
        </button>
      </div>
    </div>
  );
};
