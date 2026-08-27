import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  Save,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { logActivity, supabase } from "../lib/supabase";

interface EmployeeRecord {
  emp_id: string;
  emp_code: string;
  first_name: string;
  last_name: string;
  department?: string;
  designation?: string;
  employee_category?: string;
}

interface EmpAttendanceEntry {
  emp_id: string;
  emp_code: string;
  employee_name: string;
  department: string;
  designation: string;
  check_in_time: string;
  check_out_time: string;
  status: "present" | "absent" | "late" | "leave" | "half-day";
  remarks: string;
  attendance_id?: string;
}

export default function EmployeeAttendanceStudio({
  setToast,
}: {
  setToast: (msg: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedDept, setSelectedDept] = useState("All");
  const [departments, setDepartments] = useState<string[]>([]);
  const [entries, setEntries] = useState<EmpAttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"marker" | "history">("marker");
  const [historyRows, setHistoryRows] = useState<Record<string, unknown>[]>([]);
  const [historyFilter, setHistoryFilter] = useState("");

  // Load departments
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("department_master")
      .select("department_name")
      .order("department_name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDepartments(data.map((d) => String(d.department_name)));
        }
      });
  }, []);

  const loadBatchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Get employees
      let query = supabase
        .from("employee_master")
        .select("emp_id,emp_code,first_name,last_name,department,designation,employee_category")
        .eq("is_active", true)
        .order("emp_code", { ascending: true });

      if (selectedDept !== "All") {
        query = query.eq("department", selectedDept);
      }

      const { data: empList, error: empErr } = await query;
      if (empErr) throw empErr;

      const loadedEmployees: EmployeeRecord[] = empList || [];

      // 2. Fetch existing attendance for this date
      const { data: existingAttendance } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("attendance_date", selectedDate);

      const existingMap = new Map<string, Record<string, unknown>>();
      (existingAttendance || []).forEach((rec) => {
        if (rec.employee_name) existingMap.set(String(rec.employee_name), rec);
      });

      const mapped: EmpAttendanceEntry[] = loadedEmployees.map((emp) => {
        const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.emp_code;
        const existing = existingMap.get(fullName);
        return {
          emp_id: emp.emp_id,
          emp_code: emp.emp_code,
          employee_name: fullName,
          department: emp.department || "General",
          designation: emp.designation || "Staff",
          check_in_time: String(existing?.check_in_time || "08:30"),
          check_out_time: String(existing?.check_out_time || "15:30"),
          status: (existing?.status as EmpAttendanceEntry["status"]) || "present",
          remarks: String(existing?.remarks || ""),
          attendance_id: existing?.attendance_id ? String(existing.attendance_id) : undefined,
        };
      });

      setEntries(mapped);
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Failed to load employee roster"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedDept, setToast]);

  const loadHistory = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*")
        .order("attendance_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      setHistoryRows(data || []);
    } catch (err) {
      console.warn("Employee history note:", err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "marker") {
      loadBatchData();
    } else {
      loadHistory();
    }

    if (!supabase) return;
    const channel = supabase
      .channel("rt-employee-attendance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_attendance" },
        () => {
          if (activeTab === "marker") {
            loadBatchData();
          } else {
            loadHistory();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, loadBatchData, loadHistory]);

  const updateEntry = (index: number, patch: Partial<EmpAttendanceEntry>) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const markAll = (status: EmpAttendanceEntry["status"]) => {
    setEntries((prev) => prev.map((e) => ({ ...e, status })));
  };

  const handleSave = async () => {
    if (!supabase || entries.length === 0) return;
    setSaving(true);
    try {
      // 1. Delete records for these employees on this date
      const names = entries.map((e) => e.employee_name);
      await supabase
        .from("employee_attendance")
        .delete()
        .eq("attendance_date", selectedDate)
        .in("employee_name", names);

      // 2. Insert updated records
      const recordsToInsert = entries.map((e) => ({
        employee_name: e.employee_name,
        attendance_date: selectedDate,
        check_in_time: e.status === "absent" ? null : e.check_in_time,
        check_out_time: e.status === "absent" ? null : e.check_out_time,
        status: e.status,
        remarks: e.remarks || null,
      }));

      const { error: insErr } = await supabase
        .from("employee_attendance")
        .insert(recordsToInsert);

      if (insErr) throw insErr;

      await logActivity({
        action: `Marked staff attendance for ${selectedDate} (${recordsToInsert.length} employees)`,
        module: "employee_attendance",
      });

      setToast(
        `Employee attendance recorded for ${recordsToInsert.length} staff members`
      );
      await loadBatchData();
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Failed to save employee attendance"
      );
    } finally {
      setSaving(false);
    }
  };

  const total = entries.length;
  const presentCount = entries.filter((e) => e.status === "present").length;
  const absentCount = entries.filter((e) => e.status === "absent").length;
  const lateCount = entries.filter((e) => e.status === "late").length;
  const presentPercent = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section className="page-head">
        <div>
          <span className="overline">FACULTY & STAFF LOGBOOK</span>
          <h1>Employee Attendance</h1>
          <p>
            Daily check-in, check-out duty times, leave tracking and shift status.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("marker")}
            style={{
              background: activeTab === "marker" ? "var(--blue)" : "#fff",
              color: activeTab === "marker" ? "#fff" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            Duty Register
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              background: activeTab === "history" ? "var(--blue)" : "#fff",
              color: activeTab === "history" ? "#fff" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            Staff Log History
          </button>
        </div>
      </section>

      {activeTab === "marker" ? (
        <>
          {/* Controls */}
          <div
            style={{
              background: "#fff",
              padding: "16px 20px",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                <Calendar size={15} color="var(--blue)" />
                Duty Date:
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #d8e1eb",
                    fontSize: "13px",
                  }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                Department:
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #d8e1eb",
                    fontSize: "13px",
                  }}
                >
                  <option value="All">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={loadBatchData}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "#f4f7fb",
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <RefreshCw size={13} className={loading ? "spin" : ""} />
                Refresh List
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => markAll("present")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #bfe9d9",
                  background: "#effcf7",
                  color: "#0a8b54",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                ✓ Mark All Present
              </button>
              <button
                onClick={handleSave}
                disabled={saving || entries.length === 0}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: "var(--blue)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Users size={20} color="var(--blue)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Total Staff
                </div>
                <b style={{ fontSize: "18px" }}>{total}</b>
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #bfe9d9",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <CheckCircle size={20} color="#10b981" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Present On Duty
                </div>
                <b style={{ fontSize: "18px", color: "#059669" }}>
                  {presentCount} ({presentPercent}%)
                </b>
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #fecdd3",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <XCircle size={20} color="#f43f5e" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Absent
                </div>
                <b style={{ fontSize: "18px", color: "#e11d48" }}>{absentCount}</b>
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #fed7aa",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Clock size={20} color="#f59e0b" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Late / Leave
                </div>
                <b style={{ fontSize: "18px", color: "#d97706" }}>{lateCount}</b>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="data-card">
            {loading ? (
              <div className="empty">
                <RefreshCw className="spin" />
                <h3>Loading staff roster...</h3>
              </div>
            ) : entries.length === 0 ? (
              <div className="empty">
                <Users size={32} />
                <h3>No employees found</h3>
                <p>Add staff in Employee Master to track attendance.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "90px" }}>Emp Code</th>
                      <th>Employee Name</th>
                      <th>Department / Role</th>
                      <th style={{ width: "110px" }}>In Time</th>
                      <th style={{ width: "110px" }}>Out Time</th>
                      <th style={{ width: "290px" }}>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={entry.emp_id || idx}>
                        <td style={{ fontWeight: 700 }}>{entry.emp_code}</td>
                        <td>
                          <b>{entry.employee_name}</b>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px" }}>
                            {entry.department} • {entry.designation}
                          </span>
                        </td>
                        <td>
                          <input
                            type="time"
                            value={entry.check_in_time}
                            disabled={entry.status === "absent"}
                            onChange={(e) =>
                              updateEntry(idx, { check_in_time: e.target.value })
                            }
                            style={{
                              padding: "4px 6px",
                              borderRadius: "4px",
                              border: "1px solid #d8e1eb",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            value={entry.check_out_time}
                            disabled={entry.status === "absent"}
                            onChange={(e) =>
                              updateEntry(idx, { check_out_time: e.target.value })
                            }
                            style={{
                              padding: "4px 6px",
                              borderRadius: "4px",
                              border: "1px solid #d8e1eb",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {(
                              [
                                ["present", "Present", "#10b981", "#ecfdf5"],
                                ["absent", "Absent", "#ef4444", "#fef2f2"],
                                ["late", "Late", "#f59e0b", "#fffbeb"],
                                ["leave", "Leave", "#8b5cf6", "#f5f3ff"],
                              ] as const
                            ).map(([key, lbl, borderCol, bgCol]) => {
                              const active = entry.status === key;
                              return (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={() =>
                                    updateEntry(idx, {
                                      status: key,
                                      check_in_time:
                                        key === "absent" ? "" : entry.check_in_time || "08:30",
                                      check_out_time:
                                        key === "absent" ? "" : entry.check_out_time || "15:30",
                                    })
                                  }
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: `1px solid ${
                                      active ? borderCol : "#e2e8f0"
                                    }`,
                                    background: active ? bgCol : "#fff",
                                    color: active ? borderCol : "var(--muted)",
                                    fontSize: "11px",
                                    fontWeight: active ? 800 : 500,
                                    cursor: "pointer",
                                  }}
                                >
                                  {lbl}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={entry.remarks}
                            onChange={(e) =>
                              updateEntry(idx, { remarks: e.target.value })
                            }
                            style={{
                              width: "100%",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #e2e8f0",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Staff Attendance History */
        <div className="data-card">
          <div className="toolbar">
            <div className="table-search">
              <Search />
              <input
                placeholder="Search staff attendance logs..."
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              />
            </div>
            <button onClick={loadHistory}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Duty Date</th>
                  <th>Employee Name</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {historyRows
                  .filter((r) => {
                    if (!historyFilter.trim()) return true;
                    const q = historyFilter.toLowerCase();
                    return Object.values(r).some((v) =>
                      String(v ?? "")
                        .toLowerCase()
                        .includes(q)
                    );
                  })
                  .map((row, idx) => (
                    <tr key={String(row.attendance_id || idx)}>
                      <td style={{ fontWeight: 700 }}>
                        {String(row.attendance_date || "—")}
                      </td>
                      <td>{String(row.employee_name || "—")}</td>
                      <td>{String(row.check_in_time || "—")}</td>
                      <td>{String(row.check_out_time || "—")}</td>
                      <td>
                        <span
                          className="status"
                          style={{
                            background:
                              String(row.status) === "absent"
                                ? "#fee2e2"
                                : String(row.status) === "late"
                                ? "#fef3c7"
                                : "#ecfdf5",
                            color:
                              String(row.status) === "absent"
                                ? "#b91c1c"
                                : String(row.status) === "late"
                                ? "#b45309"
                                : "#047857",
                          }}
                        >
                          <i />
                          {String(row.status || "present")}
                        </span>
                      </td>
                      <td>{String(row.remarks || "—")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
