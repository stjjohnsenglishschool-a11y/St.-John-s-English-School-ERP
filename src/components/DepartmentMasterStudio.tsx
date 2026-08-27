import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building,
  Plus,
  Search,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  CheckSquare,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { supabase, logActivity } from "../lib/supabase";
import { modules } from "../modules";
import { downloadSampleCsv } from "../lib/csvUtils";
import CsvImportModal from "./CsvImportModal";

export interface Department {
  department_id?: string;
  department_code: string;
  department_name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_DEPARTMENTS: Department[] = [
  {
    department_id: "1",
    department_code: "DEPT-TCH",
    department_name: "Teaching Staff",
    description: "Academic faculty, subject teachers and educators",
    is_active: true,
  },
  {
    department_id: "2",
    department_code: "DEPT-STF",
    department_name: "Non-Teaching Staff",
    description: "Support staff and educational assistants",
    is_active: true,
  },
  {
    department_id: "3",
    department_code: "DEPT-OFF",
    department_name: "Administrative Office",
    description: "Front office, registrar, admissions and clerical team",
    is_active: true,
  },
  {
    department_id: "4",
    department_code: "DEPT-ACC",
    department_name: "Accounts & Finance",
    description: "Fee management, billing, payroll and accounting",
    is_active: true,
  },
  {
    department_id: "5",
    department_code: "DEPT-SPT",
    department_name: "Sports & Physical Education",
    description: "Athletics, sports trainers and physical education instructors",
    is_active: true,
  },
  {
    department_id: "6",
    department_code: "DEPT-IT",
    department_name: "Information Technology",
    description: "ERP administration, computer laboratories and IT support",
    is_active: true,
  },
  {
    department_id: "7",
    department_code: "DEPT-CLN",
    department_name: "Housekeeping & Facility",
    description: "Campus maintenance, cleaning and security operations",
    is_active: true,
  },
];

export default function DepartmentMasterStudio({
  setToast,
}: {
  setToast: (msg: string) => void;
}) {
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem("sjes_department_master");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // use default
      }
    }
    return DEFAULT_DEPARTMENTS;
  });

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formValues, setFormValues] = useState<{
    department_name: string;
    department_code: string;
    description: string;
    is_active: boolean;
  }>({
    department_name: "",
    department_code: "",
    description: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);

  // Fetch departments from Supabase
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("department_master")
          .select("*")
          .order("department_name", { ascending: true });

        if (error) {
          console.warn("Supabase fetch error, fallback to local storage:", error.message);
        } else if (data && data.length > 0) {
          const mapped: Department[] = data.map((d: any) => ({
            department_id: d.department_id,
            department_code: d.department_code || `DEPT-${(d.department_name || "").slice(0, 3).toUpperCase()}`,
            department_name: d.department_name || "Unnamed Department",
            description: d.description || "",
            is_active: d.is_active !== false,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          setDepartments(mapped);
          localStorage.setItem("sjes_department_master", JSON.stringify(mapped));
          return;
        }
      }
    } catch (err) {
      console.warn("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();

    if (!supabase) return;
    const channel = supabase
      .channel("rt-department-master")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "department_master" },
        () => {
          fetchDepartments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDepartments]);

  // Sync to local storage
  const persistLocal = (depts: Department[]) => {
    setDepartments(depts);
    localStorage.setItem("sjes_department_master", JSON.stringify(depts));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const nextNum = departments.length + 1;
    const autoCode = `DEPT-${String(nextNum).padStart(3, "0")}`;
    setFormValues({
      department_name: "",
      department_code: autoCode,
      description: "",
      is_active: true,
    });
    setEditingDept(null);
    setModalMode("create");
  };

  // Open Edit Modal
  const handleOpenEdit = (dept: Department) => {
    setFormValues({
      department_name: dept.department_name,
      department_code: dept.department_code,
      description: dept.description || "",
      is_active: dept.is_active,
    });
    setEditingDept(dept);
    setModalMode("edit");
  };

  // Auto-suggest code when department name changes
  const handleNameChange = (name: string) => {
    const raw = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const abbr = raw.slice(0, 4) || "GEN";
    let generated = `DEPT-${abbr}`;
    if (modalMode === "create") {
      setFormValues((prev) => ({
        ...prev,
        department_name: name,
        department_code: prev.department_code.startsWith("DEPT-") && prev.department_code.length <= 8 ? generated : prev.department_code,
      }));
    } else {
      setFormValues((prev) => ({ ...prev, department_name: name }));
    }
  };

  // Save Department (Create or Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.department_name.trim()) {
      setToast("Please provide a department name.");
      return;
    }

    const code = formValues.department_code.trim() || `DEPT-${Date.now().toString().slice(-4)}`;
    setSaving(true);

    try {
      if (modalMode === "create") {
        const newDept: Department = {
          department_id: crypto.randomUUID ? crypto.randomUUID() : `dept-${Date.now()}`,
          department_code: code,
          department_name: formValues.department_name.trim(),
          description: formValues.description.trim(),
          is_active: formValues.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Save to Supabase if connected
        if (supabase) {
          const { data, error } = await supabase
            .from("department_master")
            .insert({
              department_code: newDept.department_code,
              department_name: newDept.department_name,
              description: newDept.description,
              is_active: newDept.is_active,
            })
            .select();

          if (error) {
            console.warn("Supabase insert warning, saved locally:", error.message);
          } else if (data && data[0]) {
            newDept.department_id = data[0].department_id;
          }
        }

        const updated = [newDept, ...departments];
        persistLocal(updated);
        await logActivity({
          action: `Created department: ${newDept.department_name} (${newDept.department_code})`,
          module: "department_master",
        });
        setToast(`✓ Department "${newDept.department_name}" created successfully.`);
      } else if (modalMode === "edit" && editingDept) {
        const updatedDept: Department = {
          ...editingDept,
          department_code: code,
          department_name: formValues.department_name.trim(),
          description: formValues.description.trim(),
          is_active: formValues.is_active,
          updated_at: new Date().toISOString(),
        };

        if (supabase && editingDept.department_id) {
          const { error } = await supabase
            .from("department_master")
            .update({
              department_code: updatedDept.department_code,
              department_name: updatedDept.department_name,
              description: updatedDept.description,
              is_active: updatedDept.is_active,
              updated_at: new Date().toISOString(),
            })
            .eq("department_id", editingDept.department_id);

          if (error) {
            console.warn("Supabase update error:", error.message);
          }
        }

        const updated = departments.map((d) =>
          d.department_id === editingDept.department_id || d.department_code === editingDept.department_code
            ? updatedDept
            : d
        );
        persistLocal(updated);
        await logActivity({
          action: `Updated department: ${updatedDept.department_name}`,
          module: "department_master",
        });
        setToast(`✓ Department "${updatedDept.department_name}" updated successfully.`);
      }

      setModalMode(null);
      setEditingDept(null);
    } catch (err: any) {
      setToast(`Error saving department: ${err.message || "Operation failed"}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete Department
  const handleDelete = async (dept: Department) => {
    try {
      if (supabase && dept.department_id) {
        await supabase.from("department_master").delete().eq("department_id", dept.department_id);
      }
      const updated = departments.filter((d) => d.department_id !== dept.department_id && d.department_code !== dept.department_code);
      persistLocal(updated);
      await logActivity({
        action: `Deleted department: ${dept.department_name}`,
        module: "department_master",
      });
      setToast(`Department "${dept.department_name}" removed.`);
      setDeleteConfirm(null);
    } catch (err: any) {
      setToast(`Error deleting department: ${err.message || "Failed"}`);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (departments.length === 0) {
      setToast("No department records to export.");
      return;
    }
    const headers = ["Department Code", "Department Name", "Description", "Is Active"];
    const rows = departments.map((d) => [
      `"${d.department_code || ""}"`,
      `"${d.department_name || ""}"`,
      `"${(d.description || "").replace(/"/g, '""')}"`,
      d.is_active ? "TRUE" : "FALSE",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `departments_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast(`Exported ${departments.length} departments to CSV.`);
  };

  // Filtered list
  const filteredDepartments = useMemo(() => {
    let list = departments;
    if (filterStatus === "active") {
      list = list.filter((d) => d.is_active);
    } else if (filterStatus === "inactive") {
      list = list.filter((d) => !d.is_active);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          d.department_name.toLowerCase().includes(q) ||
          d.department_code.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [departments, query, filterStatus]);

  // Statistics
  const totalCount = departments.length;
  const activeCount = departments.filter((d) => d.is_active).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div style={{ padding: "0 0 32px 0" }}>
      {/* Header */}
      <section className="page-head" style={{ marginBottom: "20px" }}>
        <div>
          <h2>Department Master</h2>
          <p>
            Manage teaching, administrative and operational departments · {totalCount} departments registered
          </p>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            padding: "16px 20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Total Departments
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a" }}>{totalCount}</div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            padding: "16px 20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#f0fdf4",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Active Departments
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#16a34a" }}>{activeCount}</div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            padding: "16px 20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#f8fafc",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Inactive Departments
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#64748b" }}>{inactiveCount}</div>
          </div>
        </div>
      </div>

      {/* Main Data Section */}
      <section className="data-card" style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        {/* Toolbar */}
        <div className="table-actions" style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: "220px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#94a3b8" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${totalCount} departments by name or code...`}
              style={{ width: "100%", paddingLeft: "34px", paddingRight: "10px", height: "38px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setFilterStatus("all")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: filterStatus === "all" ? 600 : 400,
                background: filterStatus === "all" ? "#e2e8f0" : "transparent",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
              }}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterStatus("active")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: filterStatus === "active" ? 600 : 400,
                background: filterStatus === "active" ? "#dcfce7" : "transparent",
                color: filterStatus === "active" ? "#166534" : "inherit",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
              }}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus("inactive")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: filterStatus === "inactive" ? 600 : 400,
                background: filterStatus === "inactive" ? "#f1f5f9" : "transparent",
                color: filterStatus === "inactive" ? "#475569" : "inherit",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
              }}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          <button onClick={() => downloadSampleCsv(modules.department_master)} title="Download pre-filled sample CSV template for bulk department upload" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "6px", border: "1px solid #bae6fd", background: "#e0f2fe", color: "#0369a1", fontWeight: 600, cursor: "pointer" }}>
            <Download size={15} />
            Sample CSV
          </button>

          <button onClick={() => setCsvModalOpen(true)} title="Import departments from CSV" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
            <Upload size={15} />
            Import CSV
          </button>

          <button
            onClick={handleOpenCreate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "var(--blue, #2563eb)",
              color: "#fff",
              borderRadius: "6px",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Add Entry
          </button>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          {filteredDepartments.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
              <Building style={{ width: 44, height: 44, color: "#94a3b8", margin: "0 auto 12px" }} />
              <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: "#1e293b", fontWeight: 600 }}>
                No departments found
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                {query ? "No departments matched your search filter." : "There are currently no departments registered. Click \"Add Entry\" above to create one."}
              </p>
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                    Department Code
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                    Department Name
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                    Description
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                    Is Active
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept.department_id || dept.department_code} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b", fontFamily: "monospace", fontSize: "13px" }}>
                      <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                        {dept.department_code}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>
                      {dept.department_name}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "13px", maxWidth: "300px" }}>
                      {dept.description || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      {dept.is_active ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: "#dcfce7",
                            color: "#166534",
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: "#f1f5f9",
                            color: "#64748b",
                          }}
                        >
                          <XCircle size={12} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          title="Edit Department"
                          style={{
                            padding: "6px 10px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          <Edit2 size={14} color="#475569" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(dept)}
                          title="Delete Department"
                          style={{
                            padding: "6px 8px",
                            background: "#fff",
                            border: "1px solid #fee2e2",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "#ef4444",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Create / Edit Department Modal */}
      {modalMode && (
        <div className="modal-bg" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <form
            onSubmit={handleSave}
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {modalMode === "create" ? "NEW RECORD" : "EDIT RECORD"}
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                  {modalMode === "create" ? "Add Department" : "Edit Department"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Department Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formValues.department_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mathematics Department, Science, Office"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Department Code <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 400 }}>(e.g. DEPT-TCH)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formValues.department_code}
                  onChange={(e) => setFormValues({ ...formValues, department_code: e.target.value.toUpperCase() })}
                  placeholder="DEPT-001"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", fontFamily: "monospace" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                  placeholder="Enter department scope, roles and responsibilities..."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Status
                </label>
                <select
                  value={formValues.is_active ? "true" : "false"}
                  onChange={(e) => setFormValues({ ...formValues, is_active: e.target.value === "true" })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                >
                  <option value="true">Active (Operational)</option>
                  <option value="false">Inactive (Disabled)</option>
                </select>
              </div>
            </div>

            <div style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "8px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "var(--blue, #2563eb)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving to Database..." : modalMode === "create" ? "Create Department" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-bg" style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "420px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#ef4444", marginBottom: "16px" }}>
              <ShieldAlert size={28} />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                Delete Department?
              </h3>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
              Are you sure you want to remove <b>{deleteConfirm.department_name}</b> ({deleteConfirm.department_code})? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Wizard Modal */}
      {csvModalOpen && (
        <CsvImportModal
          mod={modules["department_master"]}
          onClose={() => setCsvModalOpen(false)}
          onSuccess={(count) => {
            setCsvModalOpen(false);
            fetchDepartments();
            setToast(`Successfully imported ${count} departments!`);
          }}
        />
      )}
    </div>
  );
}
