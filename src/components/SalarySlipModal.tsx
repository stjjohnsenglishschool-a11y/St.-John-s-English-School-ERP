import React, { useState, useEffect, useRef } from "react";
import { Printer, Download, X, Calendar, User, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { fetchCollectionData } from "../lib/firebase";
import { calculateEmployeeLeaveSummary, EmployeeLeaveSummary } from "../lib/leaveSalaryRules";

interface SalarySlipProps {
  slip: Record<string, unknown>;
  onClose: () => void;
}

export default function SalarySlipModal({ slip, onClose }: SalarySlipProps) {
  const [downloading, setDownloading] = useState(false);
  const [employeeData, setEmployeeData] = useState<Record<string, any>>({});
  const [allLeaves, setAllLeaves] = useState<Record<string, any>[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<EmployeeLeaveSummary | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  // Month & Year parsing
  const slipMonth = String(slip.month || "August");
  const slipYear = Number(slip.year || new Date().getFullYear());

  // Load employee details and leave records to ensure up-to-date calculation
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const empId = slip.emp_id || slip.emp_code || slip.id;
        const [empRecords, leaveRecords] = await Promise.all([
          fetchCollectionData("employee_master"),
          fetchCollectionData("leave_application"),
        ]);

        if (!isMounted) return;

        let matchedEmp: Record<string, any> = { ...slip };
        if (empRecords && empRecords.length > 0) {
          const found = empRecords.find(
            (e: any) =>
              (empId && (e.emp_id === empId || e.emp_code === empId)) ||
              (slip.employee_name &&
                `${e.first_name || ""} ${e.last_name || ""}`.trim().toLowerCase() ===
                  String(slip.employee_name).trim().toLowerCase())
          );
          if (found) {
            matchedEmp = { ...found, ...slip };
          }
        }
        setEmployeeData(matchedEmp);
        setAllLeaves(leaveRecords || []);

        // Calculate leave summary
        const summary = calculateEmployeeLeaveSummary(matchedEmp, leaveRecords || [], slipMonth, slipYear);
        setLeaveSummary(summary);
      } catch (err) {
        console.warn("Failed to load employee/leave data for salary slip:", err);
        const fallbackSummary = calculateEmployeeLeaveSummary(slip, [], slipMonth, slipYear);
        setLeaveSummary(fallbackSummary);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [slip, slipMonth, slipYear]);

  // Earnings calculations
  const basic = Number(slip.basic_salary || employeeData.basic_salary || 0);
  const hra = Number(slip.hra || 0);
  const da = Number(slip.da || 0);
  const otherAllow = Number(slip.other_allowances || 0);
  const gross = Number(slip.gross_salary || basic + hra + da + otherAllow);

  // Leave Without Pay (LWP) calculation
  const lwpDays = Number(slip.lwp_days ?? leaveSummary?.lwpDays ?? 0);
  const lwpDeduction = Number(
    slip.lwp_deduction ??
      (leaveSummary?.lwpSalaryDeduction !== undefined
        ? leaveSummary.lwpSalaryDeduction
        : Math.round(lwpDays * (basic > 0 ? basic / 30 : 0)))
  );

  // Deductions calculations
  const pf = Number(slip.pf_deduction || 0);
  const esi = Number(slip.esi_deduction || 0);
  const tds = Number(slip.tds || 0);
  const otherDed = Number(slip.other_deductions || 0);
  const totalDed = Number(
    slip.total_deductions || pf + esi + tds + lwpDeduction + otherDed
  );

  // Net Take-Home Salary
  const netSalary = Number(slip.net_salary || Math.max(0, gross - totalDed));

  // Employee meta details
  const empName = String(
    slip.employee_name ||
      `${employeeData.first_name || ""} ${employeeData.last_name || ""}`.trim() ||
      "Staff Member"
  );
  const empCode = String(
    slip.emp_code || slip.emp_id || employeeData.emp_code || employeeData.emp_id || "EMP-001"
  );
  const designation = String(
    slip.designation || employeeData.designation || "Teaching Staff"
  );
  const department = String(
    slip.department || employeeData.department || "Academic Faculty"
  );
  const joiningDate = String(
    employeeData.date_of_joining || employeeData.joining_date || slip.date_of_joining || "—"
  );
  const employmentStatus =
    leaveSummary?.employmentStatus ||
    String(employeeData.employment_status || slip.employment_status || "Permanent");
  const isProbationary = employmentStatus === "Probationary";

  const paymentMode = String(slip.payment_mode || "Bank Transfer");
  const disbursementDate = String(
    slip.payment_date ||
      slip.disbursement_date ||
      new Date().toISOString().split("T")[0]
  );
  const status = String(slip.status || "PAID").toUpperCase();

  // Print Payslip handler
  const handlePrint = () => {
    window.print();
  };

  // Direct Download PDF handler using jsPDF + html2canvas
  const handleDownloadPdf = async () => {
    const el = printableRef.current;
    if (!el) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Fit gracefully onto the single A4 sheet
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, Math.min(pdfHeight, imgHeight));
      pdf.save(`Payslip_${empCode}_${slipMonth}_${slipYear}.pdf`);
    } catch (err) {
      console.warn("Failed to generate direct PDF, using browser print:", err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 23, 44, 0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="printable-modal-card"
        style={{
          background: "#fff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "840px",
          maxHeight: "94vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions Toolbar (Hidden during print) */}
        <div
          className="no-print"
          style={{
            padding: "14px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
            borderTopLeftRadius: "14px",
            borderTopRightRadius: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f3661" }}>
              Monthly Payslip Preview
            </span>
            <span
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: isProbationary ? "#fef3c7" : "#dcfce7",
                color: isProbationary ? "#92400e" : "#166534",
                fontWeight: 700,
              }}
            >
              {employmentStatus}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              title="Download official PDF file"
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f3661",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Download size={15} /> {downloading ? "Generating..." : "Download PDF"}
            </button>

            <button
              onClick={handlePrint}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                border: "none",
                background: "#0f3661",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(15, 54, 97, 0.25)",
              }}
            >
              <Printer size={15} /> Print Payslip
            </button>

            <button
              onClick={onClose}
              title="Close window"
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

        {/* Printable Official A4 Payslip Sheet */}
        <div
          id="printable-salary-slip"
          ref={printableRef}
          style={{
            padding: "32px 36px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#1e293b",
            background: "#ffffff",
            boxSizing: "border-box",
            lineHeight: 1.4,
          }}
        >
          {/* Print specific stylesheet inline to guarantee perfect single-page A4 printing */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 10mm;
              }
              body * {
                visibility: hidden;
              }
              #printable-salary-slip, #printable-salary-slip * {
                visibility: visible;
              }
              #printable-salary-slip {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {/* School Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              borderBottom: "2px solid #0f3661",
              paddingBottom: "14px",
              marginBottom: "16px",
            }}
          >
            <img
              src="https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg"
              alt="School Emblem"
              style={{
                width: "72px",
                height: "72px",
                objectFit: "contain",
                border: "2px solid #d9ae45",
                borderRadius: "50%",
                padding: "2px",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <h1
                style={{
                  fontSize: "23px",
                  fontWeight: 900,
                  margin: 0,
                  color: "#0f3661",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                ST. JOHN&apos;S ENGLISH SCHOOL
              </h1>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px", fontWeight: 500 }}>
                Affiliation No: WB/ENG/2012/948 • School Code: SJES-WB-70001
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "1px" }}>
                Kolkata, West Bengal • Email: st.jjohnsenglishschool@gmail.com
              </div>
            </div>
          </div>

          {/* Statement of Earnings & Month Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  color: "#0f3661",
                  letterSpacing: "0.8px",
                  borderBottom: "3px solid #f59e0b",
                  paddingBottom: "3px",
                }}
              >
                SALARY SLIP & STATEMENT OF EARNINGS
              </span>
            </div>
            <div style={{ textAlign: "right", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Month & Year:</span>{" "}
              <span style={{ color: "#0f3661", fontWeight: 800, fontSize: "14px" }}>
                {slipMonth} {slipYear}
              </span>
            </div>
          </div>

          {/* Employee Details Card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 24px",
              background: "#f8fafc",
              padding: "12px 18px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>Employee Name:</span>{" "}
              <b style={{ color: "#0f3661", fontSize: "13px" }}>{empName}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Employee ID / Code:</span>{" "}
              <b style={{ color: "#0f3661" }}>{empCode}</b>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Designation:</span>{" "}
              <b>{designation}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Department:</span>{" "}
              <b>{department}</b>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Joining Date:</span>{" "}
              <b>{joiningDate}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Employment Status:</span>{" "}
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: isProbationary ? "#fef3c7" : "#dcfce7",
                  color: isProbationary ? "#92400e" : "#166534",
                  border: `1px solid ${isProbationary ? "#fde68a" : "#bbf7d0"}`,
                }}
              >
                {employmentStatus}
              </span>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Payment Mode:</span>{" "}
              <b>{paymentMode}</b>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Disbursement Date:</span>{" "}
              <b>{disbursementDate}</b>
            </div>
          </div>

          {/* Earnings & Deductions 2-Column Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginBottom: "16px",
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
                  padding: "8px 14px",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
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
                    <td style={{ padding: "6px 14px", color: "#475569" }}>Basic Salary</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
                      ₹{basic.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 14px", color: "#475569" }}>House Rent (HRA)</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
                      ₹{hra.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 14px", color: "#475569" }}>Dearness Allowance (DA)</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
                      ₹{da.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 14px", color: "#475569" }}>Other Allowances</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
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
                    <td style={{ padding: "8px 14px", color: "#0f3661" }}>Gross Earnings</td>
                    <td
                      style={{
                        padding: "8px 14px",
                        textAlign: "right",
                        color: "#0f3661",
                        fontSize: "13px",
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
                  padding: "8px 14px",
                  fontWeight: 800,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
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
                    <td style={{ padding: "6px 14px", color: "#475569" }}>Provident Fund (PF)</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
                      ₹{pf.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 14px", color: "#475569" }}>ESI Insurance</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
                      ₹{esi.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 14px", color: "#475569" }}>Tax Deducted at Source (TDS)</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
                      ₹{tds.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 14px", color: lwpDeduction > 0 ? "#b91c1c" : "#475569" }}>
                      Leave Without Pay (LWP)
                      {lwpDays > 0 && (
                        <span style={{ fontSize: "10px", color: "#b91c1c", marginLeft: "4px" }}>
                          ({lwpDays}d)
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "6px 14px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: lwpDeduction > 0 ? "#b91c1c" : "inherit",
                      }}
                    >
                      ₹{lwpDeduction.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 14px", color: "#475569" }}>Other Deductions</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", fontWeight: 600 }}>
                      ₹{otherDed.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr
                    style={{
                      background: "#fef2f2",
                      fontWeight: 800,
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <td style={{ padding: "8px 14px", color: "#dc2626" }}>Total Deductions</td>
                    <td
                      style={{
                        padding: "8px 14px",
                        textAlign: "right",
                        color: "#dc2626",
                        fontSize: "13px",
                      }}
                    >
                      ₹{totalDed.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary Highlight Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f3661 0%, #1e4b85 100%)",
              color: "#fff",
              padding: "14px 22px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#cbd5e1",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  fontWeight: 700,
                }}
              >
                NET TAKE-HOME SALARY
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                Status: <span style={{ color: "#86efac", fontWeight: 700 }}>{status}</span>
              </div>
            </div>
            <div style={{ fontSize: "25px", fontWeight: 900, color: "#4ade80" }}>
              ₹{netSalary.toLocaleString("en-IN")}
            </div>
          </div>

          {/* DEDICATED LEAVE SUMMARY SECTION (Requirements 1, 5, 6) */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              overflow: "hidden",
              marginBottom: "24px",
              background: "#fafafa",
            }}
          >
            <div
              style={{
                background: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f3661", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Leave Summary (Session: {leaveSummary?.sessionName || "1 April to 31 March"})
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                PL Rule: Max 2 PL / Month
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "1px",
                background: "#e2e8f0",
              }}
            >
              <div style={{ background: "#fff", padding: "8px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>PL Opening</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f3661", marginTop: "2px" }}>
                  {leaveSummary?.plOpeningBalance || 0}
                </div>
              </div>

              <div style={{ background: "#fff", padding: "8px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>PL Credited</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f3661", marginTop: "2px" }}>
                  {leaveSummary?.plCreditedThisSession || 0}
                </div>
              </div>

              <div style={{ background: "#fff", padding: "8px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>PL Taken (Month)</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f3661", marginTop: "2px" }}>
                  {leaveSummary?.plTakenThisMonth || 0}
                </div>
              </div>

              <div style={{ background: "#fff", padding: "8px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>PL Taken (Session)</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f3661", marginTop: "2px" }}>
                  {leaveSummary?.plTakenThisSession || 0}
                </div>
              </div>

              <div style={{ background: "#eff6ff", padding: "8px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#1d4ed8", fontWeight: 700 }}>PL Balance</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: "#1e40af", marginTop: "2px" }}>
                  {leaveSummary?.plBalance || 0}
                </div>
              </div>
            </div>

            {/* Sub-row for Approved, Rejected, LWP Days & LWP Deduction */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "1px",
                background: "#e2e8f0",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div style={{ background: "#fff", padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Approved Leave Days</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534", marginTop: "1px" }}>
                  {leaveSummary?.approvedLeaveDaysThisMonth || 0} Days
                </div>
              </div>

              <div style={{ background: "#fff", padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Rejected Leave Days</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626", marginTop: "1px" }}>
                  {leaveSummary?.rejectedLeaveDaysThisMonth || 0} Days
                </div>
              </div>

              <div style={{ background: "#fff", padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Leave Without Pay (LWP)</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: lwpDays > 0 ? "#dc2626" : "#475569", marginTop: "1px" }}>
                  {lwpDays} Day{lwpDays === 1 ? "" : "s"}
                </div>
              </div>

              <div style={{ background: "#fef2f2", padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#991b1b", fontWeight: 600 }}>LWP Salary Deduction</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#dc2626", marginTop: "1px" }}>
                  ₹{lwpDeduction.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* Authorised Signatures */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: "24px",
            }}
          >
            <div style={{ textAlign: "center", width: "170px" }}>
              <div
                style={{
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Employee Signature
              </div>
            </div>

            <div style={{ textAlign: "center", width: "200px" }}>
              <div
                style={{
                  borderTop: "1px solid #94a3b8",
                  paddingTop: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#0f3661",
                }}
              >
                Principal / Authorised Signatory
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                St. John&apos;s English School
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
