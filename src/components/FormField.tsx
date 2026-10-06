import React, { useState, useEffect, useMemo, ChangeEvent } from "react";
import {
  Upload,
  Eye,
  EyeOff,
  Paperclip,
  FileText,
  File,
  ExternalLink,
  X,
  UserRoundCheck,
  ShieldCheck,
} from "lucide-react";
import { fetchCollectionData, uploadToFirebaseStorage, normalizeUserModules } from "../lib/supabase";
import { ALL_SUBMENU_MODULES, Field, moduleName } from "../modules";
import { formatImageUrl } from "../lib/imageUtils";

export interface FormFieldProps {
  key?: React.Key;
  field: Field;
  tableName?: string;
  mode?: "create" | "edit" | "view";
  currentUser?: {
    user_name: string;
    user_full_name: string;
    role: string;
    allowed_modules: string[];
  } | null;
  currentEmployeeRecord?: Record<string, unknown> | null;
  isStaffOrTeacher?: boolean;
  value: unknown;
  disabled: boolean;
  change: (v: unknown) => void;
  onRelationSelected?: (record: Record<string, unknown>) => void;
}

export default function FormField({
  field,
  tableName,
  mode,
  currentUser,
  currentEmployeeRecord,
  isStaffOrTeacher,
  value,
  disabled,
  change,
  onRelationSelected,
}: FormFieldProps) {
  const [relationOptions, setRelationOptions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResigned, setShowResigned] = useState(false);

  useEffect(() => {
    if (field.type !== "relation" || !field.reference) return;
    const reference = field.reference;
    fetchCollectionData(reference.table).then((data) => {
      setRelationOptions((data || []) as unknown as Array<Record<string, unknown>>);
    });
  }, [field]);

  const filteredRelationOptions = useMemo(() => {
    if (field.type !== "relation" || field.reference?.table !== "employee_master" || showResigned) {
      return relationOptions;
    }
    return relationOptions.filter((opt) => {
      const isSel = String(opt[field.reference!.value]) === String(value);
      if (isSel) return true;
      const status = String(opt.employment_status || "");
      const isActive = opt.is_active !== false;
      return (
        isActive &&
        status !== "Inactive" &&
        status !== "Resigned" &&
        status !== "Terminated" &&
        status !== "Retired" &&
        status !== "Left"
      );
    });
  }, [relationOptions, field, showResigned, value]);

  const isUrlOrFileField =
    field.key.endsWith("_url") ||
    field.key.endsWith("_photo") ||
    field.key === "attachment_url";

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadToFirebaseStorage(
        file,
        "school-documents",
        "records"
      );
      change(publicUrl);
    } catch {
      // Fallback handled in helper
    } finally {
      setUploading(false);
    }
  };

  // Custom Multi-Select UI for Module Permission Option
  if (field.key === "allowed_modules" || field.key === "active_module") {
    const selectedModules = normalizeUserModules({ active_module: value, allowed_modules: value });

    const toggleModule = (modKey: string) => {
      if (selectedModules.includes(modKey)) {
        change(selectedModules.filter((m) => m !== modKey));
      } else {
        change([...selectedModules, modKey]);
      }
    };

    const selectAll = () => {
      change(ALL_SUBMENU_MODULES.map((m) => m.key));
    };

    const deselectAll = () => {
      change([]);
    };

    // Group modules by category
    const groupedModules = ALL_SUBMENU_MODULES.reduce((acc, item) => {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
      return acc;
    }, {} as Record<string, typeof ALL_SUBMENU_MODULES>);

    return (
      <div className="full" style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
            Module Access Permissions (Check modules this user can view) <b>*</b>
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", background: "#e0f2fe", color: "#0369a1", padding: "2px 10px", borderRadius: "12px", fontWeight: 700 }}>
              {selectedModules.length} / {ALL_SUBMENU_MODULES.length} Selected
            </span>
            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={selectAll}
                  style={{ fontSize: "11px", padding: "3px 10px", background: "#f0f4fa", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  style={{ fontSize: "11px", padding: "3px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", maxHeight: "320px", overflowY: "auto" }}>
          {Object.entries(groupedModules).map(([groupName, groupItems]) => (
            <div key={groupName} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
                {groupName}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {groupItems.map((item) => {
                  const checked = selectedModules.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "12px",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        background: checked ? "#f0f9ff" : "transparent",
                        cursor: disabled ? "not-allowed" : "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={() => toggleModule(item.key)}
                        style={{ cursor: "pointer", accentColor: "#0284c7" }}
                      />
                      <span style={{ fontWeight: checked ? 600 : 400, color: checked ? "#0369a1" : "#334155" }}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Multi-Attachment Spanned UI (for Assignments, Worksheets & Documents)
  if (
    field.key === "attachment_url" ||
    field.key === "attachments" ||
    (tableName === "assignments_master" && field.key === "attachment_url")
  ) {
    let attachments: Array<{ name: string; url: string; size?: string }> = [];
    if (Array.isArray(value)) {
      attachments = value.map((item, idx) =>
        typeof item === "string"
          ? {
              name: item.startsWith("data:")
                ? `Worksheet Document ${idx + 1}`
                : item.split("/").pop()?.split("?")[0] || `Attachment ${idx + 1}`,
              url: item,
            }
          : item
      );
    } else if (typeof value === "string" && value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          attachments = parsed.map((item, idx) =>
            typeof item === "string"
              ? {
                  name: item.startsWith("data:")
                    ? `Worksheet Document ${idx + 1}`
                    : item.split("/").pop()?.split("?")[0] || `Attachment ${idx + 1}`,
                  url: item,
                }
              : item
          );
        }
      } catch {}
    } else if (typeof value === "string" && value.trim().length > 0) {
      const parts = value.includes(",") ? value.split(",").map((s) => s.trim()) : [value.trim()];
      attachments = parts.filter(Boolean).map((url, idx) => ({
        name: url.startsWith("data:")
          ? `Worksheet Document ${idx + 1}`
          : url.split("/").pop()?.split("?")[0] || `Attachment ${idx + 1}`,
        url,
      }));
    }

    const handleMultipleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        const uploadedList = [...attachments];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const publicUrl = await uploadToFirebaseStorage(
            file,
            "school-assignments",
            "attachments"
          );
          const sizeKb = file.size ? `${Math.round(file.size / 1024)} KB` : undefined;
          uploadedList.push({
            name: file.name || `Worksheet ${uploadedList.length + 1}`,
            url: publicUrl,
            size: sizeKb,
          });
        }
        change(JSON.stringify(uploadedList.map((a) => a.url)));
      } catch {
        // Handled
      } finally {
        setUploading(false);
      }
    };

    const removeAttachment = (indexToRemove: number) => {
      const updated = attachments.filter((_, idx) => idx !== indexToRemove);
      change(updated.length > 0 ? JSON.stringify(updated.map((a) => a.url)) : "");
    };

    return (
      <div className="full" style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Paperclip size={16} color="var(--navy)" />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
              Assignment Attachments & Worksheets (Multi-File Upload)
            </span>
          </div>
          <span
            style={{
              fontSize: "12px",
              background: attachments.length > 0 ? "#dbeafe" : "#f1f5f9",
              color: attachments.length > 0 ? "#1e40af" : "#64748b",
              padding: "2px 10px",
              borderRadius: "12px",
              fontWeight: 700,
            }}
          >
            {attachments.length} {attachments.length === 1 ? "File" : "Files"} Attached
          </span>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1.5px dashed #cbd5e1",
            borderRadius: "10px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Upload Actions */}
          {!disabled && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "var(--blue)",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: uploading ? "wait" : "pointer",
                  boxShadow: "0 2px 4px rgba(15,54,97,0.15)",
                }}
              >
                <Upload size={14} />
                <span>{uploading ? "Uploading attachments..." : "+ Upload Multiple Files / Worksheets"}</span>
                <input
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleMultipleUpload}
                  disabled={uploading}
                />
              </label>

              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Supports multiple PDFs, images, question papers & homework sheets
              </span>
            </div>
          )}

          {/* Uploaded Attachments List */}
          {attachments.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              {attachments.map((att, idx) => {
                const isImg =
                  att.url.startsWith("data:image") ||
                  /\.(jpg|jpeg|png|gif|webp|svg)/i.test(att.url);
                const isPdf = att.url.toLowerCase().includes(".pdf");

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "8px 12px",
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          padding: "6px",
                          borderRadius: "6px",
                          background: isImg ? "#fef3c7" : isPdf ? "#fee2e2" : "#eff6ff",
                          color: isImg ? "#b45309" : isPdf ? "#b91c1c" : "#1d4ed8",
                          display: "flex",
                        }}
                      >
                        {isImg ? <Eye size={14} /> : isPdf ? <FileText size={14} /> : <File size={14} />}
                      </span>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#1e293b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "180px",
                          }}
                          title={att.name}
                        >
                          {att.name}
                        </div>
                        {att.size && (
                          <div style={{ fontSize: "10px", color: "#64748b" }}>
                            {att.size}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <a
                        href={formatImageUrl(att.url)}
                        target="_blank"
                        rel="noreferrer"
                        title="View / Download file"
                        style={{
                          padding: "4px 8px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "5px",
                          color: "#1d4ed8",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>View</span>
                      </a>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          title="Remove attachment"
                          style={{
                            padding: "4px 6px",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "5px",
                            color: "#b91c1c",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              No attachments uploaded yet. Click the upload button above to add multiple worksheet files.
            </div>
          )}
        </div>
      </div>
    );
  }

  const dynamicOptions = useMemo(() => {
    if (field.key === "income_type") {
      try {
        const cached = localStorage.getItem("sjes_table_income_head_master");
        if (cached) {
          const heads = JSON.parse(cached);
          if (Array.isArray(heads) && heads.length > 0) {
            const names = heads.map((h: any) => h.head_name).filter(Boolean);
            return Array.from(new Set([...(field.options || []), ...names]));
          }
        }
      } catch {}
    }
    if (field.key === "income_category") {
      try {
        const cached = localStorage.getItem("sjes_table_income_head_master");
        if (cached) {
          const heads = JSON.parse(cached);
          if (Array.isArray(heads) && heads.length > 0) {
            const cats = heads.map((h: any) => h.head_category).filter(Boolean);
            return Array.from(new Set([...(field.options || []), ...cats]));
          }
        }
      } catch {}
    }
    return field.options || [];
  }, [field.key, field.options]);

  // Fine Waived checkbox
  if (field.key === "fine_waived") {
    const isChecked = Boolean(value);
    return (
      <div
        style={{
          gridColumn: "1 / -1",
          background: isChecked ? "#f0fdf4" : "#f8fafc",
          border: `1.5px solid ${isChecked ? "#86efac" : "#e2e8f0"}`,
          borderRadius: "8px",
          padding: "12px 14px",
          margin: "4px 0",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: disabled ? "default" : "pointer",
            fontWeight: 800,
            fontSize: "13px",
            color: isChecked ? "#15803d" : "#334155",
          }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            disabled={disabled}
            onChange={(e) => change(e.target.checked)}
            style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#16a34a" }}
          />
          <span>Fine Waived (Requires Principal Approval)</span>
        </label>
        {isChecked && (
          <div style={{ marginTop: "6px", fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
            ⚠ Note: You must fill the 'Principal Approval' field to apply this fine waiver.
          </div>
        )}
      </div>
    );
  }

  // Leave Application & Leave Balance: Lock Applicant to Logged In Teacher/Staff
  if ((tableName === "leave_application" || tableName === "leave_balance" || tableName === "leave_ledger") && (field.key === "emp_id" || field.key === "user_id") && isStaffOrTeacher) {
    const empName =
      String(currentEmployeeRecord?.full_name || "") ||
      `${String(currentEmployeeRecord?.first_name || "")} ${String(currentEmployeeRecord?.last_name || "")}`.trim() ||
      currentUser?.user_full_name ||
      "Staff Member";
    const empCode = String(currentEmployeeRecord?.emp_code || currentEmployeeRecord?.emp_id || value || "");

    return (
      <label>
        <span>
          Employee / Staff Member <b>*</b>
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: "8px",
            minHeight: "38px",
            boxSizing: "border-box",
          }}
        >
          <UserRoundCheck size={16} color="#16a34a" />
          <div>
            <b style={{ color: "#15803d", fontSize: "13px" }}>
              {empCode ? `${empCode} — ` : ""}{empName}
            </b>
            <span style={{ fontSize: "11px", color: "#166534", marginLeft: "8px", fontWeight: 600 }}>
              (Your Official Staff Account)
            </span>
          </div>
        </div>
      </label>
    );
  }

  // Leave Application & Leave Balance: Lock Employee Name to Logged In Teacher/Staff
  if ((tableName === "leave_application" || tableName === "leave_balance" || tableName === "leave_ledger") && field.key === "employee_name" && isStaffOrTeacher) {
    const empName =
      String(value || "") ||
      String(currentEmployeeRecord?.full_name || "") ||
      `${String(currentEmployeeRecord?.first_name || "")} ${String(currentEmployeeRecord?.last_name || "")}`.trim() ||
      currentUser?.user_full_name ||
      "";

    return (
      <label>
        <span>
          {field.label} <b>*</b>
        </span>
        <input
          disabled={true}
          type="text"
          value={empName}
          style={{ background: "#f8fafc", color: "#334155", fontWeight: 700 }}
        />
      </label>
    );
  }

  // Leave Balance: Balance Remaining & Current PL Balance Auto-calculated display
  if (tableName === "leave_balance" && (field.key === "balance_remaining" || field.key === "current_pl_balance")) {
    const bal = Number(value ?? 0);
    return (
      <label>
        <span>
          {field.label} (Privilege Leave) <b>*</b>
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 14px",
            background: bal > 0 ? "#f0fdf4" : "#fef2f2",
            border: `1.5px solid ${bal > 0 ? "#86efac" : "#fca5a5"}`,
            borderRadius: "8px",
            minHeight: "38px",
            boxSizing: "border-box",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: "13px", color: bal > 0 ? "#15803d" : "#b91c1c" }}>
            {bal} PL Available
          </span>
          <span style={{ fontSize: "11px", color: bal > 0 ? "#166534" : "#991b1b", fontWeight: 600 }}>
            {bal > 0 ? "✓ Eligible for Leave" : "⚠️ Insufficient Balance"}
          </span>
        </div>
      </label>
    );
  }

  // Leave Application Status field
  if (tableName === "leave_application" && field.key === "status") {
    if (mode === "create" || isStaffOrTeacher || disabled) {
      const st = String(value || "pending").toLowerCase();
      const isApp = st === "approved";
      const isRej = st === "rejected";
      return (
        <label>
          <span>Application Status <b>*</b></span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 12px",
              background: isApp ? "#f0fdf4" : isRej ? "#fef2f2" : "#fef3c7",
              border: `1.5px solid ${isApp ? "#86efac" : isRej ? "#fca5a5" : "#fcd34d"}`,
              borderRadius: "8px",
              color: isApp ? "#15803d" : isRej ? "#b91c1c" : "#92400e",
              fontSize: "12px",
              fontWeight: 800,
              minHeight: "38px",
              boxSizing: "border-box",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isApp ? "#16a34a" : isRej ? "#dc2626" : "#f59e0b",
              }}
            />
            <span>
              {mode === "create"
                ? "Pending Principal Approval (Auto-submitted)"
                : st}
            </span>
          </div>
        </label>
      );
    }
  }

  // Leave Application Approved By field
  if (tableName === "leave_application" && field.key === "approved_by") {
    if (mode === "create" || isStaffOrTeacher || disabled || !value) {
      return (
        <label>
          <span>Approved By</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 12px",
              background: value ? "#f0fdf4" : "#f8fafc",
              border: `1.5px solid ${value ? "#86efac" : "#cbd5e1"}`,
              borderRadius: "8px",
              color: value ? "#15803d" : "#64748b",
              fontSize: "12px",
              fontWeight: 700,
              minHeight: "38px",
              boxSizing: "border-box",
            }}
          >
            <ShieldCheck size={16} color={value ? "#16a34a" : "#94a3b8"} />
            <span>
              {value
                ? `Approved by: ${String(value)}`
                : "Awaiting Principal Approval"}
            </span>
          </div>
        </label>
      );
    }
  }

  // Principal Approval text field
  if (field.key === "principal_approval") {
    return (
      <label className="full">
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {field.label}
          <b style={{ color: "#dc2626" }}>* (Required to waive fine)</b>
        </span>
        <input
          disabled={disabled}
          type="text"
          placeholder="Enter Principal approval details (e.g. Fr. Principal Approval #842)"
          value={String(value ?? "")}
          onChange={(e) => change(e.target.value)}
        />
        <span style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
          Required before 'Fine Waived' can be applied.
        </span>
      </label>
    );
  }

  // Assignments: Auto-fill & Display Logged-in Faculty Name for Assigned by
  if (tableName === "assignments_master" && field.key === "assigned_by") {
    const authorName =
      String(value || "") ||
      String(currentEmployeeRecord?.full_name || "") ||
      `${String(currentEmployeeRecord?.first_name || "")} ${String(currentEmployeeRecord?.last_name || "")}`.trim() ||
      currentUser?.user_full_name ||
      currentUser?.user_name ||
      "Faculty Member";

    return (
      <label>
        <span>
          Assigned by <b>*</b>
        </span>
        <div style={{ position: "relative" }}>
          <input
            disabled={disabled}
            type="text"
            value={String(value || authorName)}
            onChange={(e) => change(e.target.value)}
            placeholder="Faculty name"
            style={{
              paddingLeft: "34px",
              background: "#f0fdf4",
              border: "1.5px solid #86efac",
              color: "#15803d",
              fontWeight: 700,
            }}
          />
          <UserRoundCheck
            size={16}
            color="#16a34a"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
        </div>
      </label>
    );
  }

  // Notices: Auto-fill & Display Author Name for Created by
  if (tableName === "notice_automation" && field.key === "created_by") {
    const authorName =
      String(value || "") ||
      String(currentEmployeeRecord?.full_name || "") ||
      currentUser?.user_full_name ||
      currentUser?.user_name ||
      "Administration";

    return (
      <label>
        <span>
          Created by <b>*</b>
        </span>
        <div style={{ position: "relative" }}>
          <input
            disabled={disabled}
            type="text"
            value={String(value || authorName)}
            onChange={(e) => change(e.target.value)}
            placeholder="Author name"
            style={{
              paddingLeft: "34px",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontWeight: 600,
            }}
          />
          <UserRoundCheck
            size={16}
            color="#0284c7"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
        </div>
      </label>
    );
  }

  // Password Input Field with Eye Toggle
  if (field.key === "password") {
    return (
      <label>
        <span>
          {field.label}
          {field.required && <b>*</b>}
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            disabled={disabled}
            required={field.required}
            type={showPassword ? "text" : "password"}
            placeholder="Enter account password (e.g. admin123)"
            value={String(value ?? "")}
            onChange={(e) => change(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              padding: "0 10px",
              height: "38px",
              border: "1px solid #d4deec",
              borderRadius: "8px",
              background: "#f8fafc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
            }}
            title={showPassword ? "Hide Password" : "Show Password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
    );
  }

  return (
    <label className={field.type === "textarea" ? "full" : ""}>
      <span>
        {field.label}
        {field.required && <b>*</b>}
      </span>

      {field.type === "textarea" || field.type === "array" ? (
        <textarea
          disabled={disabled}
          required={field.required}
          value={
            field.type === "array" && Array.isArray(value)
              ? value.join(", ")
              : String(value ?? "")
          }
          placeholder={field.type === "array" ? "Comma-separated values (e.g. Maths, Science)" : ""}
          onChange={(e) =>
            change(
              field.type === "array"
                ? e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : e.target.value
            )
          }
        />
      ) : field.type === "boolean" ? (
        <select
          disabled={disabled}
          value={String(value ?? true)}
          onChange={(e) => change(e.target.value === "true")}
        >
          <option value="true">Yes / Active</option>
          <option value="false">No / Inactive</option>
        </select>
      ) : field.type === "relation" && field.reference ? (
        <div style={{ display: "grid", gap: "4px" }}>
          <select
            disabled={disabled}
            required={field.required}
            value={String(value ?? "")}
            onChange={(e) => {
              const val = e.target.value;
              change(val);
              const found = relationOptions.find(
                (opt) => String(opt[field.reference!.value]) === val
              );
              if (found && onRelationSelected) {
                onRelationSelected(found);
              }
            }}
          >
            <option value="">Select...</option>
            {filteredRelationOptions.map((option) => {
              const val = String(option[field.reference!.value]);
              const code = String(option.emp_code || option.emp_id || "");
              const name = String(
                option.employee_name ||
                  option.full_name ||
                  `${(option.first_name as string) || ""} ${(option.last_name as string) || ""}`.trim() ||
                  option[field.reference!.label] ||
                  val
              );
              const status = String(option.employment_status || (option.is_active === false ? "Inactive" : "Active"));
              const lastWorking = String(option.last_working_date || option.date_of_leaving || "");

              let displayLabel = code ? `${code} - ${name}` : name;
              if (field.reference?.table === "employee_master" && status && status !== "Active") {
                if ((status === "Resigned" || status === "Terminated") && lastWorking) {
                  displayLabel += ` (${status}: Last Working ${lastWorking})`;
                } else {
                  displayLabel += ` (${status})`;
                }
              }

              return (
                <option key={val} value={val}>
                  {displayLabel}
                </option>
              );
            })}
          </select>

          {field.reference?.table === "employee_master" && !disabled && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#64748b",
                marginTop: "2px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={showResigned}
                onChange={(e) => setShowResigned(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span>Include Resigned / Terminated / Inactive Staff (For Final Settlement or Pending Payment)</span>
            </label>
          )}
        </div>
      ) : field.type === "select" ? (
        <select
          disabled={disabled}
          required={field.required}
          value={String(value ?? "")}
          onChange={(e) => change(e.target.value)}
        >
          <option value="">Select option...</option>
          {dynamicOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      ) : isUrlOrFileField ? (
        <div style={{ display: "grid", gap: "6px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              disabled={disabled}
              required={field.required}
              type="text"
              placeholder="https://..."
              value={String(value ?? "")}
              onChange={(e) => change(e.target.value)}
              style={{ flex: 1 }}
            />
            {!disabled && (
              <label
                style={{
                  padding: "0 12px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f0f4fa",
                  border: "1px solid #d4deec",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--blue)",
                }}
              >
                <Upload size={14} />
                <span>{uploading ? "Uploading..." : "Upload"}</span>
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          {value && typeof value === "string" && value.startsWith("http") && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "11px", color: "var(--blue)", textDecoration: "underline" }}
            >
              Preview current file / image
            </a>
          )}
        </div>
      ) : (
        <input
          disabled={disabled}
          required={field.required}
          type={field.type || "text"}
          placeholder={
            field.key === "department_code"
              ? "Auto-generated (e.g. DEPT-ACAD)"
              : field.key === "vendor_code"
              ? "Auto-generated (e.g. VND-SUPP)"
              : field.key === "receipt_number"
              ? "Auto-generated on save"
              : undefined
          }
          value={String(value ?? "")}
          onChange={(e) =>
            change(
              field.type === "number" && e.target.value !== ""
                ? Number(e.target.value)
                : e.target.value
            )
          }
        />
      )}
    </label>
  );
}
