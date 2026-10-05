import React, { useState } from "react";
import { X, Check, Copy, ExternalLink } from "lucide-react";
import {
  STAFF_GOOGLE_SHEET_ID,
  generateStaffAppsScriptCode,
} from "../lib/googleDriveSheets";

export interface EmployeeGoogleScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployeeGoogleScriptModal({
  isOpen,
  onClose,
}: EmployeeGoogleScriptModalProps) {
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const scriptCode = generateStaffAppsScriptCode(
    typeof window !== "undefined" ? window.location.origin : ""
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "800px", width: "92%" }}>
        <div className="modal-header">
          <div>
            <span className="modal-tag">GOOGLE WORKSPACE SYNC</span>
            <h2>Google Apps Script for Employee Master (code.gs)</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: "20px",
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "16px",
              fontSize: "13px",
              color: "#334155",
            }}
          >
            <b>📋 4-Step Quick Setup in Google Sheets:</b>
            <ol
              style={{
                margin: "8px 0 0 18px",
                padding: 0,
                lineHeight: "1.6",
              }}
            >
              <li>
                Open your Staff Google Sheet (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${STAFF_GOOGLE_SHEET_ID}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline" }}
                >
                  Click here to open
                </a>
                )
              </li>
              <li>
                Go to <b>Extensions &rarr; Apps Script</b> in the top menu of
                your Google Sheet.
              </li>
              <li>
                Delete any default code in <b>Code.gs</b>, paste the script
                below, and click <b>💾 Save</b>.
              </li>
              <li>
                Refresh your Google Sheet. You will see a new menu:{" "}
                <b>
                  🏫 SJES Staff Master &rarr; 🛠️ 1. Setup Staff Sheet &
                  Headers
                </b>
                . Click it to automatically create all 24 headers!
              </li>
            </ol>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}
            >
              Google Apps Script (code.gs):
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(scriptCode);
                setCopiedScript(true);
                setTimeout(() => setCopiedScript(false), 2500);
              }}
              style={{
                background: copiedScript ? "#16a34a" : "#2563eb",
                color: "#ffffff",
                border: "none",
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
            >
              {copiedScript ? <Check size={14} /> : <Copy size={14} />}
              {copiedScript ? "Copied to Clipboard!" : "Copy code.gs"}
            </button>
          </div>

          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              overflowX: "auto",
              maxHeight: "340px",
              lineHeight: "1.5",
              border: "1px solid #1e293b",
            }}
          >
            <code>{scriptCode}</code>
          </pre>

          <div
            style={{
              marginTop: "16px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "12px",
              color: "#1e40af",
            }}
          >
            <b>📊 24 Standard Column Headers Generated:</b>
            <div
              style={{
                marginTop: "6px",
                color: "#1e3a8a",
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              {[
                "1. Emp Code",
                "2. First Name",
                "3. Last Name",
                "4. Category",
                "5. Department",
                "6. Designation",
                "7. Employment Type",
                "8. Employment Status",
                "9. Date of Joining",
                "10. Date of Birth",
                "11. Gender",
                "12. Blood Group",
                "13. Mobile Primary",
                "14. WhatsApp",
                "15. Official Email",
                "16. Personal Email",
                "17. Basic Salary",
                "18. Classes Assigned",
                "19. Specialisation",
                "20. Photo URL",
                "21. Document URL",
                "22. Address",
                "23. Academic Year",
                "24. Last Updated",
              ].map((h) => (
                <span
                  key={h}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontSize: "11px",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="modal-footer"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <a
            href={`https://docs.google.com/spreadsheets/d/${STAFF_GOOGLE_SHEET_ID}/edit`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              padding: "8px 14px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} /> Open Staff Google Sheet
          </a>
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
