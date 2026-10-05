import React from "react";

type FineWaiverSectionProps = {
  fineWaived: boolean;
  setFineWaived: (waived: boolean) => void;
  principalApproval: string;
  setPrincipalApproval: (appr: string) => void;
  setWaiveApprovedByPrincipal: (val: boolean) => void;
  fineWaiveReason: string;
  setFineWaiveReason: (reason: string) => void;
  approvedBy: string;
  setApprovedBy: (approvedBy: string) => void;
  isFineWaivedAndApproved: boolean;
  mode: "create" | "edit" | "view";
};

export const FineWaiverSection: React.FC<FineWaiverSectionProps> = ({
  fineWaived,
  setFineWaived,
  principalApproval,
  setPrincipalApproval,
  setWaiveApprovedByPrincipal,
  fineWaiveReason,
  setFineWaiveReason,
  approvedBy,
  setApprovedBy,
  isFineWaivedAndApproved,
  mode,
}) => {
  return (
    <div
      style={{
        background: fineWaived ? "#f0fdf4" : "#f8fafc",
        border: fineWaived ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "14px 16px",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: fineWaived ? "10px" : "0",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: mode === "view" ? "default" : "pointer",
            fontSize: "13px",
            fontWeight: 700,
            color: fineWaived ? "#15803d" : "#334155",
          }}
        >
          <input
            type="checkbox"
            checked={fineWaived}
            onChange={(e) => {
              if (mode === "view") return;
              setFineWaived(e.target.checked);
              if (e.target.checked && !fineWaiveReason) {
                setFineWaiveReason("Principal Approval");
              }
            }}
            disabled={mode === "view"}
            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }}
          />
          Fine Waiver / Concession
        </label>

        {fineWaived && (
          <span style={{ fontSize: "11px", fontWeight: 700, color: isFineWaivedAndApproved ? "#15803d" : "#b45309" }}>
            {isFineWaivedAndApproved ? "✓ 100% Fine Waived (₹0)" : "Pending Principal Approval (Fine remains active)"}
          </span>
        )}
      </div>

      {fineWaived && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Principal Approval Required Field */}
          <div
            style={{
              padding: "10px 12px",
              background: isFineWaivedAndApproved ? "#dcfce7" : "#fff7ed",
              borderRadius: "8px",
              border: isFineWaivedAndApproved ? "1.5px solid #86efac" : "1.5px solid #fdba74",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: isFineWaivedAndApproved ? "#14532d" : "#c2410c",
                marginBottom: "4px",
              }}
            >
              Principal Approval *
            </label>
            <input
              type="text"
              value={principalApproval}
              onChange={(e) => {
                if (mode === "view") return;
                const val = e.target.value;
                setPrincipalApproval(val);
                setWaiveApprovedByPrincipal(val.trim().length > 0);
                if (val.trim().length > 0 && !approvedBy) {
                  setApprovedBy(val);
                }
              }}
              readOnly={mode === "view"}
              placeholder="Enter Principal approval details (e.g. Fr. Principal Approval #842)"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: `1.5px solid ${isFineWaivedAndApproved ? "#86efac" : "#fb923c"}`,
                background: "#ffffff",
                fontSize: "12px",
                color: "#0f172a",
                fontWeight: 600,
                outline: "none",
              }}
            />
            <div style={{ fontSize: "11px", marginTop: "4px", fontWeight: 600, color: isFineWaivedAndApproved ? "#15803d" : "#c2410c" }}>
              {isFineWaivedAndApproved
                ? "✓ Principal approval verified. The late fine is waived (₹0)."
                : "⚠ Fine waiver will NOT apply until this Principal Approval field is filled."}
            </div>
          </div>

          {/* Reason & Approver */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "3px",
                }}
              >
                Reason
              </label>
              <input
                type="text"
                value={fineWaiveReason}
                onChange={(e) => setFineWaiveReason(e.target.value)}
                readOnly={mode === "view"}
                placeholder="e.g. Approved concession"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "12px",
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "3px",
                }}
              >
                Approving Authority
              </label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                readOnly={mode === "view"}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "12px",
                  color: "#0f172a",
                  fontWeight: 600,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
