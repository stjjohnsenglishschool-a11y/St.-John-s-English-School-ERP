import React from "react";
import { X, Copy } from "lucide-react";
import {
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_SHEET_ID,
  GOOGLE_SHEET_TAB_NAME,
} from "../lib/googleDriveSheets";

export interface StudentGoogleScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  setToast: (msg: string) => void;
}

export default function StudentGoogleScriptModal({
  isOpen,
  onClose,
  setToast,
}: StudentGoogleScriptModalProps) {
  if (!isOpen) return null;

  const scriptCode = `/**
 * Google Apps Script for St. John's English School - Student Data Realtime Sync
 * Target Spreadsheet: ${GOOGLE_SHEET_ID}
 * Target Tab: ${GOOGLE_SHEET_TAB_NAME}
 * Target Photo Drive Folder: ${GOOGLE_DRIVE_FOLDER_ID} (student_data_photo)
 */
const SPREADSHEET_ID = '${GOOGLE_SHEET_ID}';
const SHEET_TAB_NAME = '${GOOGLE_SHEET_TAB_NAME}';
const HEADERS = [
  'Admission No',
  'Roll No',
  'Academic Year',
  'Class Name',
  'Section',
  'Student Status',
  'Full Name',
  'Date of Birth',
  'Gender',
  'Blood Group',
  'Student Photo URL',
  'Father Name',
  'Father Mobile',
  'Father Occupation',
  'Father Photo URL',
  'Mother Name',
  'Mother Mobile',
  'Mother Occupation',
  'Mother Photo URL',
  'Address',
  'Last Updated'
];

function initializeStudentSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB_NAME);
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#1e3a8a');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
  for (let i = 1; i <= HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }
}`;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "750px", width: "90%" }}>
        <div className="modal-header">
          <div>
            <span className="modal-tag">GOOGLE WORKSPACE INTEGRATION</span>
            <h2>Google Apps Script Sync Code (code.gs)</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div
          style={{ padding: "20px", maxHeight: "70vh", overflowY: "auto" }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "#475569",
              marginBottom: "14px",
            }}
          >
            Copy this code into your Google Sheet (
            <b>Extensions &rarr; Apps Script</b>) to manage automatic sheet
            initialization, header formatting, and backup sync:
          </p>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(scriptCode);
                setToast("Apps Script code copied to clipboard!");
              }}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                zIndex: 10,
              }}
            >
              <Copy size={13} /> Copy Code
            </button>
            <pre
              style={{
                background: "#0f172a",
                color: "#e2e8f0",
                padding: "16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "monospace",
                overflowX: "auto",
                lineHeight: "1.5",
              }}
            >
              {scriptCode}
            </pre>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
