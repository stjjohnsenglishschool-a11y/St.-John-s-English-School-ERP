import { Printer, X } from "lucide-react";
import { getCurrentAcademicYear } from "../lib/academicYear";

interface FeeReceiptProps {
  receipt: Record<string, unknown>;
  onClose: () => void;
}

export default function FeeReceiptModal({ receipt, onClose }: FeeReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const amountPaid = Number(receipt.amount_paid || 0);
  const amountDue = Number(receipt.amount_due || 0);
  const balance = Math.max(0, amountDue - amountPaid);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 23, 44, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
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
          borderRadius: "14px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
            borderTopLeftRadius: "14px",
            borderTopRightRadius: "14px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)" }}>
            Fee Receipt Preview
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handlePrint}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "var(--blue)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div
          id="printable-fee-receipt"
          style={{
            padding: "36px 40px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#1e293b",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              borderBottom: "2px solid #0f3661",
              paddingBottom: "16px",
              marginBottom: "20px",
            }}
          >
            <img
              src="https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg"
              alt="Logo"
              style={{
                width: "72px",
                height: "72px",
                objectFit: "contain",
                border: "2px solid #d9ae45",
                borderRadius: "50%",
                padding: "2px",
              }}
            />
            <div style={{ flex: 1 }}>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  margin: 0,
                  color: "#0f3661",
                  letterSpacing: "0.5px",
                }}
              >
                ST. JOHN&apos;S ENGLISH SCHOOL
              </h1>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                Affiliation No: WB/ENG/2012/948 • School Code: SJES-WB-70001
              </div>
              <div style={{ fontSize: "11px", color: "#475569" }}>
                Kolkata, West Bengal • Email: st.jjohnsenglishschool@gmail.com •
                Phone: +91 96743 68297
              </div>
            </div>
          </div>

          {/* Receipt Title & Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#0f3661",
                  letterSpacing: "1px",
                  borderBottom: "2px solid #f59e0b",
                  paddingBottom: "2px",
                }}
              >
                Fee Payment Receipt
              </span>
            </div>
            <div style={{ textAlign: "right", fontSize: "12px" }}>
              <div>
                <b>Receipt No:</b>{" "}
                <span style={{ color: "#0f3661", fontWeight: 800 }}>
                  {String(receipt.receipt_number || "REC-AUTOGEN")}
                </span>
              </div>
              <div style={{ color: "#64748b" }}>
                <b>Date:</b>{" "}
                {String(
                  receipt.payment_date || new Date().toISOString().slice(0, 10)
                )}
              </div>
            </div>
          </div>

          {/* Student Info Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              background: "#f8fafc",
              padding: "14px 18px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
              marginBottom: "24px",
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>Student Name:</span>{" "}
              <b style={{ color: "#0f3661" }}>
                {String(receipt.student_name || "—")}
              </b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Admission No:</span>{" "}
              <b>{String(receipt.admission_no || "—")}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Class & Section:</span>{" "}
              <b>{String(receipt.class_name || "—")}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Academic Year:</span>{" "}
              <b>{String(receipt.academic_year || getCurrentAcademicYear())}</b>
            </div>
          </div>

          {/* Fee Itemization Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              marginBottom: "24px",
            }}
          >
            <thead>
              <tr style={{ background: "#0f3661", color: "#fff" }}>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    borderRadius: "6px 0 0 0",
                  }}
                >
                  Sl.
                </th>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>
                  Particulars / Description
                </th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>
                  Due Amount (₹)
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    borderRadius: "0 6px 0 0",
                  }}
                >
                  Paid (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 14px" }}>1</td>
                <td style={{ padding: "12px 14px" }}>
                  <b>{String(receipt.fee_type || "Tuition Fee")}</b>
                  {receipt.remarks ? (
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {String(receipt.remarks)}
                    </div>
                  ) : null}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  ₹{amountDue.toLocaleString("en-IN")}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#059669",
                  }}
                >
                  ₹{amountPaid.toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #0f3661", fontWeight: 800 }}>
                <td
                  colSpan={3}
                  style={{ padding: "12px 14px", textAlign: "right" }}
                >
                  Total Amount Received:
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    textAlign: "right",
                    fontSize: "15px",
                    color: "#059669",
                  }}
                >
                  ₹{amountPaid.toLocaleString("en-IN")}
                </td>
              </tr>
              {balance > 0 && (
                <tr style={{ color: "#dc2626", fontWeight: 700 }}>
                  <td
                    colSpan={3}
                    style={{ padding: "8px 14px", textAlign: "right" }}
                  >
                    Remaining Balance Due:
                  </td>
                  <td style={{ padding: "8px 14px", textAlign: "right" }}>
                    ₹{balance.toLocaleString("en-IN")}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Payment metadata */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "12px",
              color: "#475569",
              background: "#fafafa",
              padding: "12px 16px",
              borderRadius: "6px",
              marginBottom: "40px",
            }}
          >
            <div>
              <b>Payment Mode:</b>{" "}
              {String(receipt.payment_mode || "Cash / Bank Transfer")}
            </div>
            <div>
              <b>Status:</b>{" "}
              <span
                style={{
                  color:
                    receipt.status === "paid"
                      ? "#059669"
                      : receipt.status === "partial"
                      ? "#d97706"
                      : "#dc2626",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {String(receipt.status || "paid")}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "48px",
              paddingTop: "16px",
            }}
          >
            <div style={{ textAlign: "center", width: "160px" }}>
              <div
                style={{
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Cashier / Accounts
              </div>
            </div>

            <div style={{ textAlign: "center", width: "180px" }}>
              <div
                style={{
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#0f3661",
                }}
              >
                Authorized Signatory
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>
                St. John&apos;s English School
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: "10px",
              color: "#94a3b8",
              marginTop: "30px",
              borderTop: "1px dashed #cbd5e1",
              paddingTop: "8px",
            }}
          >
            * Computer-generated fee voucher. Fees once paid are non-refundable.
          </div>
        </div>
      </div>
    </div>
  );
}
