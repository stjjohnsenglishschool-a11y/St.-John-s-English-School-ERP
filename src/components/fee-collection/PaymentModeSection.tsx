import React from "react";
import { RefreshCw } from "lucide-react";
import { PAYMENT_MODES } from "./constants";

type PaymentModeSectionProps = {
  paymentMode: string;
  setPaymentMode: (pm: string) => void;
  receiptNumber: string;
  setReceiptNumber: (rn: string) => void;
  generateReceiptNumber: () => string;
  remarks: string;
  setRemarks: (r: string) => void;
  mode: "create" | "edit" | "view";
};

export const PaymentModeSection: React.FC<PaymentModeSectionProps> = ({
  paymentMode,
  setPaymentMode,
  receiptNumber,
  setReceiptNumber,
  generateReceiptNumber,
  remarks,
  setRemarks,
  mode,
}) => {
  return (
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
  );
};
