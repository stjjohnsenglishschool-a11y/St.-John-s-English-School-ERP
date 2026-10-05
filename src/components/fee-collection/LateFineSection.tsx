import React from "react";
import { Clock } from "lucide-react";

type LateFineSectionProps = {
  fineAmount: number;
  setFineAmount: (amt: number) => void;
  fineAnalysisReason: string;
  mode: "create" | "edit" | "view";
};

export const LateFineSection: React.FC<LateFineSectionProps> = ({
  fineAmount,
  setFineAmount,
  fineAnalysisReason,
  mode,
}) => {
  return (
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
          {fineAnalysisReason}
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
  );
};
