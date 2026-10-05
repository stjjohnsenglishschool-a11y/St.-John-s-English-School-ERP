import React from "react";
import {
  ArrowUpDown,
  Cloud,
  Download,
  Edit3,
  Eye,
  Paperclip,
  Printer,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { modules, moduleName, label } from "../modules";
import { formatImageUrl, handleImageError } from "../lib/imageUtils";

type Row = Record<string, unknown>;

export interface PageHeaderProps {
  mod: (typeof modules)[string];
  total: number;
}

export function PageHeader({ mod, total }: PageHeaderProps) {
  return (
    <section className="page-head" style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
        <h1 style={{ margin: 0 }}>{moduleName(mod.table)}</h1>
        <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
          {total} records
        </span>
      </div>
    </section>
  );
}

export interface DataTableProps {
  mod: (typeof modules)[string];
  rows: Row[];
  loading: boolean;
  isStaffOrTeacher?: boolean;
  sortCol: string | null;
  sortAsc: boolean;
  onSort: (col: string) => void;
  view: (r: Row) => void;
  edit: (r: Row) => void;
  remove: (r: Row) => void;
  printReceipt?: (r: Row) => void;
  printSlip?: (r: Row) => void;
  printLetter?: (type: "warning" | "offer", r: Row) => void;
  onReviewLeave?: (r: Row) => void;
}

export default function DataTable({
  mod,
  rows,
  loading,
  isStaffOrTeacher,
  sortCol,
  sortAsc,
  onSort,
  view,
  edit,
  remove,
  printReceipt,
  printSlip,
  printLetter,
  onReviewLeave,
}: DataTableProps) {
  if (loading)
    return (
      <div className="empty">
        <RefreshCw className="spin" />
        <h3>Loading from Database...</h3>
        <p>Querying real-time database records.</p>
      </div>
    );
  if (!rows.length)
    return (
      <div className="empty" style={{ padding: "48px 20px", textAlign: "center" }}>
        <Cloud style={{ width: 44, height: 44, color: "#94a3b8", margin: "0 auto 12px" }} />
        <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: "#1e293b", fontWeight: 600 }}>
          No records found in {moduleName(mod.table)}
        </h3>
        <p style={{ margin: "0", color: "#64748b", fontSize: "14px", maxWidth: "420px", marginInline: "auto" }}>
          There are no rows in this table yet. Use "Add Entry" or import a CSV from the toolbar above to get started.
        </p>
      </div>
    );

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {mod.columns.map((c) => (
              <th
                key={c}
                onClick={() => onSort(c)}
                style={{ cursor: "pointer", userSelect: "none" }}
                title={`Sort by ${label(c)}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>{label(c)}</span>
                  <ArrowUpDown
                    size={12}
                    style={{
                      opacity: sortCol === c ? 1 : 0.3,
                      color: sortCol === c ? "var(--blue)" : "inherit",
                    }}
                  />
                </div>
              </th>
            ))}
            <th style={{ width: "110px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r[mod.primaryKey] || i)}>
              {mod.columns.map((c) => (
                <td key={c}>
                  {c.includes("status") || c === "is_active" ? (
                    <span
                      className="status"
                      style={{
                        background:
                          String(r[c]) === "false" ||
                          String(r[c]).toLowerCase() === "absent" ||
                          String(r[c]).toLowerCase() === "rejected" ||
                          String(r[c]).toLowerCase() === "cancelled"
                            ? "#fff0f0"
                            : String(r[c]).toLowerCase() === "pending" ||
                              String(r[c]).toLowerCase() === "partial" ||
                              String(r[c]).toLowerCase() === "draft"
                            ? "#fff7e6"
                            : "#e9f8f1",
                        color:
                          String(r[c]) === "false" ||
                          String(r[c]).toLowerCase() === "absent" ||
                          String(r[c]).toLowerCase() === "rejected" ||
                          String(r[c]).toLowerCase() === "cancelled"
                            ? "#c44558"
                            : String(r[c]).toLowerCase() === "pending" ||
                              String(r[c]).toLowerCase() === "partial" ||
                              String(r[c]).toLowerCase() === "draft"
                            ? "#b5731c"
                            : "#187454",
                      }}
                    >
                      <i
                        style={{
                          background:
                            String(r[c]) === "false" ||
                            String(r[c]).toLowerCase() === "absent"
                              ? "#c44558"
                              : String(r[c]).toLowerCase() === "pending"
                              ? "#b5731c"
                              : "#1fa472",
                        }}
                      />
                      {String(r[c] ?? (c === "is_active" ? "Active" : "—"))}
                    </span>
                  ) : c === "fine_amount" && mod.table === "fees_collection" ? (
                    (() => {
                      const isWaived = Boolean(r.fine_waived && r.waive_approved_by_principal);
                      const fine = Number(r[c] || 0);
                      if (isWaived) {
                        return (
                          <span style={{ color: "#15803d", fontWeight: 700, fontSize: "12px", background: "#f0fdf4", padding: "2px 8px", borderRadius: "6px", border: "1px solid #bbf7d0", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            ✓ ₹0 (Waived)
                          </span>
                        );
                      }
                      if (fine > 0) {
                        return (
                          <span style={{ color: "#9a3412", fontWeight: 700, fontSize: "12px", background: "#fff7ed", padding: "2px 8px", borderRadius: "6px", border: "1px solid #ffedd5" }}>
                            ₹{fine.toLocaleString("en-IN")}
                          </span>
                        );
                      }
                      return <span style={{ color: "#166534", fontSize: "12px", fontWeight: 600 }}>₹0</span>;
                    })()
                  ) : c === "due_month" ? (
                    <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      📅 {String(r[c] || "—")}
                    </span>
                  ) : c.includes("amount") ||
                    c.includes("salary") ||
                    c.includes("price") ||
                    c.includes("cost") ? (
                    typeof r[c] === "number" ? (
                      `₹${Number(r[c]).toLocaleString("en-IN")}`
                    ) : (
                      String(r[c] ?? "—")
                    )
                  ) : c.includes("photo_url") || c.includes("file_url") ? (
                    r[c] ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <img
                          src={formatImageUrl(String(r[c]))}
                          alt="Photo"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                          style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid #cbd5e1" }}
                        />
                        <a
                          href={formatImageUrl(String(r[c]))}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--blue)", textDecoration: "underline", fontSize: "12px" }}
                        >
                          View Link
                        </a>
                      </div>
                    ) : (
                      "—"
                    )
                  ) : c === "attachment_url" || c === "attachments" ? (
                    (() => {
                      const raw = r[c];
                      if (!raw) return "—";
                      let list: string[] = [];
                      if (Array.isArray(raw)) {
                        list = raw;
                      } else if (typeof raw === "string" && raw.trim().startsWith("[")) {
                        try {
                          const parsed = JSON.parse(raw);
                          if (Array.isArray(parsed)) list = parsed;
                        } catch {}
                      } else if (typeof raw === "string" && raw.trim().length > 0) {
                        list = raw.includes(",") ? raw.split(",").map((s) => s.trim()) : [raw.trim()];
                      }
                      if (list.length === 0) return "—";
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                          {list.map((url, idx) => (
                            <a
                              key={idx}
                              href={formatImageUrl(url)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                                borderRadius: "5px",
                                padding: "2px 7px",
                                fontSize: "11px",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <Paperclip size={12} color="#2563eb" />
                              <span>{list.length > 1 ? `File ${idx + 1}` : "Attachment"}</span>
                            </a>
                          ))}
                        </div>
                      );
                    })()
                  ) : c === "password" ? (
                    <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", border: "1px solid #cbd5e1", fontWeight: 600, color: "#0f172a" }}>
                      🔑 {String(r[c] || "admin123")}
                    </span>
                  ) : c === "allowed_modules" || c === "active_module" ? (
                    (() => {
                      const mods = Array.isArray(r[c]) ? (r[c] as string[]) : typeof r[c] === "string" ? String(r[c]).split(",") : [];
                      if (!mods.length) return <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No modules selected</span>;
                      if (mods.length >= 25) return <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>All Modules ({mods.length})</span>;
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "260px" }}>
                          {mods.slice(0, 3).map((m) => (
                            <span key={m} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: "4px", fontSize: "11px", border: "1px solid #bfdbfe", fontWeight: 500 }}>
                              {moduleName(m.trim())}
                            </span>
                          ))}
                          {mods.length > 3 && (
                            <span style={{ background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                              +{mods.length - 3} more
                            </span>
                          )}
                        </div>
                      );
                    })()
                  ) : c === "head_category" || c === "income_category" ? (
                    (() => {
                      const cat = String(r[c] || "");
                      const isFee = cat.toLowerCase().includes("fee");
                      const isUniform = cat.toLowerCase().includes("uniform");
                      return (
                        <span
                          style={{
                            background: isFee ? "#dbeafe" : isUniform ? "#fef3c7" : "#dcfce7",
                            color: isFee ? "#1e40af" : isUniform ? "#92400e" : "#166534",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            display: "inline-block",
                            border: `1px solid ${isFee ? "#bfdbfe" : isUniform ? "#fde68a" : "#bbf7d0"}`,
                          }}
                        >
                          {cat || "—"}
                        </span>
                      );
                    })()
                  ) : c === "head_code" ? (
                    <span
                      style={{
                        fontFamily: "monospace",
                        background: "#f8fafc",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        border: "1px solid #e2e8f0",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      {String(r[c] || "—")}
                    </span>
                  ) : (
                    String(r[c] ?? "—")
                  )}
                </td>
              ))}
              <td>
                <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                  {mod.table === "leave_application" && onReviewLeave && (
                    <button
                      onClick={() => onReviewLeave(r)}
                      title="Principal Review & Leave Approval"
                      style={{
                        color: "#0f3661",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <ShieldCheck size={13} color="#1d4ed8" />
                      <span>Review</span>
                    </button>
                  )}
                  {mod.table === "fees_collection" && printReceipt && (
                    <button
                      onClick={() => printReceipt(r)}
                      title="Print Fee Receipt"
                      style={{ color: "var(--blue)" }}
                    >
                      <Printer />
                    </button>
                  )}
                  {mod.table === "salary_slip" && printSlip && (
                    <button
                      onClick={() => printSlip(r)}
                      title="Print Salary Payslip"
                      style={{ color: "var(--blue)" }}
                    >
                      <Printer />
                    </button>
                  )}
                  {mod.table === "warning_letter" && printLetter && (
                    <button
                      onClick={() => printLetter("warning", r)}
                      title="View, Download & Print Warning Letter"
                      style={{
                        color: "#b91c1c",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Printer size={13} color="#dc2626" />
                      <span>{isStaffOrTeacher ? "Download / Print" : "Print"}</span>
                    </button>
                  )}
                  {mod.table === "offer_letter" && printLetter && (
                    <button
                      onClick={() => printLetter("offer", r)}
                      title="View, Download & Print Offer Letter"
                      style={{
                        color: "#1e40af",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Printer size={13} color="#2563eb" />
                      <span>{isStaffOrTeacher ? "Download / Print" : "Print"}</span>
                    </button>
                  )}
                  {mod.table === "employee_document" && r.file_url && (
                    <a
                      href={formatImageUrl(String(r.file_url))}
                      target="_blank"
                      rel="noreferrer"
                      title="Download / View Verified Document"
                      style={{
                        color: "#0369a1",
                        background: "#e0f2fe",
                        border: "1px solid #bae6fd",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      <Download size={13} color="#0284c7" />
                      <span>Download</span>
                    </a>
                  )}
                  <button onClick={() => view(r)} title="View details">
                    <Eye />
                  </button>
                  {mod.fields.length > 0 &&
                    !(
                      isStaffOrTeacher &&
                      [
                        "leave_balance",
                        "warning_letter",
                        "offer_letter",
                        "employee_document",
                        "salary_slip",
                      ].includes(mod.table)
                    ) && (
                      <button onClick={() => edit(r)} title="Edit record">
                        <Edit3 />
                      </button>
                    )}
                  {mod.fields.length > 0 &&
                    !(
                      isStaffOrTeacher &&
                      [
                        "leave_balance",
                        "warning_letter",
                        "offer_letter",
                        "employee_document",
                        "salary_slip",
                      ].includes(mod.table)
                    ) && (
                      <button
                        className="danger"
                        onClick={() => remove(r)}
                        title="Delete record"
                      >
                        <Trash2 />
                      </button>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
