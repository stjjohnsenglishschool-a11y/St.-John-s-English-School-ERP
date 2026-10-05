import React from "react";
import { Calendar } from "lucide-react";
import { ACADEMIC_MONTHS } from "./constants";

type DueMonthTrackerSectionProps = {
  dueMonth: string;
  setDueMonth: (month: string) => void;
  studentFeeStatus: { paidMonths: Set<string>; dueMonths: string[] };
  mode: "create" | "edit" | "view";
};

export const DueMonthTrackerSection: React.FC<DueMonthTrackerSectionProps> = ({
  dueMonth,
  setDueMonth,
  studentFeeStatus,
  mode,
}) => {
  return (
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

      {/* Selected Due Month Dropdown */}
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
  );
};
