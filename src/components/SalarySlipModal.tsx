import { Printer, X } from "lucide-react";

interface SalarySlipProps {
  slip: Record<string, unknown>;
  onClose: () => void;
}

export default function SalarySlipModal({ slip, onClose }: SalarySlipProps) {
  const handlePrint = () => {
    window.print();
  };

  const basic = Number(slip.basic_salary || 0);
  const hra = Number(slip.hra || 0);
  const da = Number(slip.da || 0);
  const otherAllow = Number(slip.other_allowances || 0);
  const gross = Number(slip.gross_salary || basic + hra + da + otherAllow);

  const pf = Number(slip.pf_deduction || 0);
  const esi = Number(slip.esi_deduction || 0);
  const tds = Number(slip.tds || 0);
  const otherDed = Number(slip.other_deductions || 0);
  const totalDed = Number(slip.total_deductions || pf + esi + tds + otherDed);

  const netSalary = Number(slip.net_salary || Math.max(0, gross - totalDed));

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
          maxWidth: "760px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions */}
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
            Monthly Payslip Preview
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
              <Printer size={15} /> Print Payslip
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

        {/* Printable Official Payslip Body */}
        <div
          id="printable-salary-slip"
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
                Kolkata, West Bengal • Email: st.jjohnsenglishschool@gmail.com
              </div>
            </div>
          </div>

          {/* Payslip Month Header */}
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
                Salary Slip & Statement of Earnings
              </span>
            </div>
            <div style={{ textAlign: "right", fontSize: "13px" }}>
              <b>Month & Year:</b>{" "}
              <span style={{ color: "#0f3661", fontWeight: 800 }}>
                {String(slip.month || "Current Month")}{" "}
                {String(slip.year || new Date().getFullYear())}
              </span>
            </div>
          </div>

          {/* Employee Meta Box */}
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
              <span style={{ color: "#64748b" }}>Employee Name:</span>{" "}
              <b style={{ color: "#0f3661" }}>
                {String(slip.employee_name || "—")}
              </b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Employee ID / Code:</span>{" "}
              <b>{String(slip.emp_id || slip.emp_code || "—")}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Payment Mode:</span>{" "}
              <b>{String(slip.payment_mode || "Bank Transfer")}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Disbursement Date:</span>{" "}
              <b>{String(slip.payment_date || "—")}</b>
            </div>
          </div>

          {/* Earnings & Deductions 2-Column Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Earnings Column */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#0f3661",
                  color: "#fff",
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                Earnings
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>Basic Salary</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{basic.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>House Rent (HRA)</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{hra.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>Dearness Allowance (DA)</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{da.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>Other Allowances</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{otherAllow.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr
                    style={{
                      background: "#f8fafc",
                      fontWeight: 800,
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <td style={{ padding: "10px 14px" }}>Gross Earnings</td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        color: "#0f3661",
                      }}
                    >
                      ₹{gross.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions Column */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                Deductions
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>Provident Fund (PF)</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{pf.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>ESI Insurance</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{esi.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>Tax Deducted at Source (TDS)</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{tds.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px" }}>Other Deductions</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      ₹{otherDed.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr
                    style={{
                      background: "#f8fafc",
                      fontWeight: 800,
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <td style={{ padding: "10px 14px" }}>Total Deductions</td>
                    <td
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        color: "#dc2626",
                      }}
                    >
                      ₹{totalDed.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f3661 0%, #1e4b85 100%)",
              color: "#fff",
              padding: "16px 22px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "36px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#cbd5e1",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Net Take-Home Salary
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                Status: {String(slip.status || "Paid").toUpperCase()}
              </div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#4ade80" }}>
              ₹{netSalary.toLocaleString("en-IN")}
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
                Employee Signature
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
                Principal / Bursar
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
