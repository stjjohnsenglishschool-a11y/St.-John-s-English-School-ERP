import React from "react";
import { DollarSign } from "lucide-react";
import { FEE_TYPES } from "./constants";

type FeeDetailsSectionProps = {
  feeType: string;
  setFeeType: (type: string) => void;
  feesAmount: number;
  setFeesAmount: (amt: number) => void;
  setAutoFetchedFromStruct: (val: boolean) => void;
  paymentDate: string;
  setPaymentDate: (date: string) => void;
  mode: "create" | "edit" | "view";
};

export const FeeDetailsSection: React.FC<FeeDetailsSectionProps> = ({
  feeType,
  setFeeType,
  feesAmount,
  setFeesAmount,
  setAutoFetchedFromStruct,
  paymentDate,
  setPaymentDate,
  mode,
}) => {
  return (
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
  );
};
