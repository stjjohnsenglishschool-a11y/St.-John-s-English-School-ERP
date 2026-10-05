import React from "react";

type PaymentSummarySectionProps = {
  feesAmount: number;
  fineAmount: number;
  isFineWaivedAndApproved: boolean;
  amountPaid: number;
  setAmountPaid: (amt: number) => void;
  amountDue: number;
  totalPayable: number;
  mode: "create" | "edit" | "view";
};

export const PaymentSummarySection: React.FC<PaymentSummarySectionProps> = ({
  feesAmount,
  fineAmount,
  isFineWaivedAndApproved,
  amountPaid,
  setAmountPaid,
  amountDue,
  totalPayable,
  mode,
}) => {
  return (
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
  );
};
