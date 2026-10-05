import React from "react";
import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";

type LetterNoticesProps = {
  modTable: "warning_letter" | "offer_letter" | "employee_document";
  isStaffOrTeacher: boolean;
};

export const LetterNotices: React.FC<LetterNoticesProps> = ({
  modTable,
  isStaffOrTeacher,
}) => {
  if (modTable === "warning_letter") {
    return (
      <div
        style={{
          background: isStaffOrTeacher ? "#fef2f2" : "#fff7ed",
          border: `1px solid ${isStaffOrTeacher ? "#fecaca" : "#fed7aa"}`,
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "14px",
          fontSize: "13px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              color: isStaffOrTeacher ? "#991b1b" : "#9a3412",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertTriangle size={18} color={isStaffOrTeacher ? "#dc2626" : "#ea580c"} />
            <span>
              {isStaffOrTeacher
                ? "Official Warning Letters & Notices"
                : "Staff Warning Letters & Memorandums"}
            </span>
          </div>
          <div style={{ color: isStaffOrTeacher ? "#b91c1c" : "#c2410c", fontSize: "12px", marginTop: "3px" }}>
            {isStaffOrTeacher
              ? "Official notices issued by Principal / Administration. Click 'Download / Print' to view and print your copy."
              : "Official disciplinary notices issued by Principal with acknowledgement records."}
          </div>
        </div>
      </div>
    );
  }

  if (modTable === "offer_letter") {
    return (
      <div
        style={{
          background: isStaffOrTeacher ? "#eff6ff" : "#f0fdf4",
          border: `1px solid ${isStaffOrTeacher ? "#bfdbfe" : "#bbf7d0"}`,
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "14px",
          fontSize: "13px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              color: isStaffOrTeacher ? "#1e40af" : "#166534",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FileText size={18} color={isStaffOrTeacher ? "#2563eb" : "#16a34a"} />
            <span>
              {isStaffOrTeacher
                ? "Official Employment Offer & Appointment Letters"
                : "Candidate Offer & Appointment Letter Register"}
            </span>
          </div>
          <div style={{ color: isStaffOrTeacher ? "#3b82f6" : "#15803d", fontSize: "12px", marginTop: "3px" }}>
            {isStaffOrTeacher
              ? "Official appointment and employment terms issued by Administration. Click 'Download / Print' to view your letter."
              : "Issue and track signed offer letters, joining dates, and employment terms."}
          </div>
        </div>
      </div>
    );
  }

  if (modTable === "employee_document") {
    return (
      <div
        style={{
          background: isStaffOrTeacher ? "#f8fafc" : "#eff6ff",
          border: `1px solid ${isStaffOrTeacher ? "#e2e8f0" : "#bfdbfe"}`,
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "14px",
          fontSize: "13px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              color: isStaffOrTeacher ? "#334155" : "#1e40af",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldCheck size={18} color={isStaffOrTeacher ? "#475569" : "#2563eb"} />
            <span>
              {isStaffOrTeacher
                ? "My Official Staff Documents & Certificates"
                : "Employee Document & Verification Repository"}
            </span>
          </div>
          <div style={{ color: isStaffOrTeacher ? "#64748b" : "#3b82f6", fontSize: "12px", marginTop: "3px" }}>
            {isStaffOrTeacher
              ? "Official employee certificates and records verified by Administration. Click 'Download' to view any file."
              : "Store and verify staff KYC documents, qualification proofs, and certificates."}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
