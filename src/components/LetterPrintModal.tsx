import { Printer, X } from "lucide-react";

interface LetterPrintProps {
  type: "warning" | "offer";
  data: Record<string, unknown>;
  onClose: () => void;
}

export default function LetterPrintModal({
  type,
  data,
  onClose,
}: LetterPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const isWarning = type === "warning";

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
          maxWidth: "740px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
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
            {isWarning ? "Official Warning Letter Preview" : "Job Offer Letter Preview"}
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
              <Printer size={15} /> Print Document
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

        {/* Printable Official Document Body */}
        <div
          style={{
            padding: "48px 56px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#1e293b",
            lineHeight: 1.7,
            fontSize: "14px",
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
              marginBottom: "24px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <img
              src="https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg"
              alt="Logo"
              style={{
                width: "70px",
                height: "70px",
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
                Kolkata, West Bengal • Email: st.jjohnsenglishschool@gmail.com
              </div>
            </div>
          </div>

          {/* Date & Ref */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "24px",
              fontSize: "13px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div>
              <b>Ref No:</b> SJES/HR/
              {isWarning ? "WL" : "OL"}/
              {String(data.letter_id || data.offer_id || "2024-001")}
            </div>
            <div>
              <b>Date:</b>{" "}
              {String(
                data.issue_date ||
                  data.offer_date ||
                  new Date().toISOString().slice(0, 10)
              )}
            </div>
          </div>

          {/* Document Title */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: isWarning ? "#b91c1c" : "#0f3661",
                borderBottom: `2px solid ${isWarning ? "#b91c1c" : "#0f3661"}`,
                paddingBottom: "4px",
              }}
            >
              {isWarning ? "Official Written Warning Notice" : "Letter of Employment Offer"}
            </span>
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: "20px" }}>
            <div>
              To,
              <br />
              <b>
                {String(
                  data.employee_name || data.candidate_name || "Recipient"
                )}
              </b>
              <br />
              {data.designation ? (
                <span>
                  Designation: <b>{String(data.designation)}</b>
                  <br />
                </span>
              ) : null}
              <span>St. John&apos;s English School, Kolkata</span>
            </div>
          </div>

          {isWarning ? (
            /* Warning Letter Body */
            <div>
              <div style={{ marginBottom: "16px", fontWeight: "bold" }}>
                Subject: {String(data.subject || "Official Warning regarding conduct / performance")}
              </div>
              <p>Dear {String(data.employee_name || "Colleague")},</p>
              <p>
                This letter serves as an official formal warning regarding your{" "}
                <b>{String(data.warning_type || "conduct / attendance / performance")}</b>.
              </p>
              <div
                style={{
                  background: "#fef2f2",
                  borderLeft: "4px solid #ef4444",
                  padding: "14px 18px",
                  margin: "18px 0",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "13px",
                }}
              >
                <b>Particulars of the Incident / Concern:</b>
                <div style={{ marginTop: "6px" }}>
                  {String(
                    data.description ||
                      "Failure to adhere to school operating standards and institutional timing expectations."
                  )}
                </div>
              </div>
              <p>
                Please note that St. John&apos;s English School values professionalism,
                punctuality, and dedication. You are hereby advised to rectify the above
                matter immediately. Failure to demonstrate satisfactory improvement may
                lead to further disciplinary action under school service rules.
              </p>
            </div>
          ) : (
            /* Offer Letter Body */
            <div>
              <div style={{ marginBottom: "16px", fontWeight: "bold" }}>
                Subject: Offer of Appointment for the position of {String(data.designation || "Faculty / Staff")}
              </div>
              <p>Dear {String(data.candidate_name || "Candidate")},</p>
              <p>
                We are delighted to offer you the position of{" "}
                <b>{String(data.designation || "Educator / Staff")}</b> at St. John&apos;s English
                School, Kolkata. We were impressed by your background, experience, and dedication
                to student growth.
              </p>
              <div
                style={{
                  background: "#f0fdf4",
                  borderLeft: "4px solid #22c55e",
                  padding: "14px 18px",
                  margin: "18px 0",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "13px",
                }}
              >
                <div>
                  <b>Starting Basic Remuneration:</b> ₹
                  {Number(data.basic_salary || 0).toLocaleString("en-IN")} per month + institutional allowances.
                </div>
                <div style={{ marginTop: "4px" }}>
                  <b>Date of Joining:</b>{" "}
                  {String(data.joining_date || "As mutually agreed")}
                </div>
                <div style={{ marginTop: "4px" }}>
                  <b>Offer Valid Until:</b>{" "}
                  {String(data.valid_until || "Within 7 days of issue")}
                </div>
              </div>
              <p>
                Kindly sign and return the duplicate copy of this letter as confirmation of your
                acceptance. We look forward to welcoming you to the St. John&apos;s faculty family.
              </p>
            </div>
          )}

          {/* Signatures */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "56px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div style={{ textAlign: "center", width: "200px" }}>
              <div
                style={{
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                {isWarning ? "Employee Acknowledgement" : "Candidate Acceptance Signature"}
              </div>
            </div>

            <div style={{ textAlign: "center", width: "200px" }}>
              <div
                style={{
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#0f3661",
                }}
              >
                {String(data.issued_by || "Fr. Principal / Director")}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>
                St. John&apos;s English School
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
