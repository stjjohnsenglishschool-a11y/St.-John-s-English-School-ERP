import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Save,
  Search,
  Users,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { logActivity, supabase } from "../lib/supabase";

interface StudentRecord {
  student_id: string;
  admission_no: string;
  full_name: string;
  class_name: string;
  section?: string;
  roll_no?: string;
}

interface AttendanceEntry {
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  roll_no: string;
  status: "present" | "absent" | "late" | "leave" | "half-day";
  remarks: string;
  attendance_id?: string;
}

const CLASSES = [
  "PG",
  "NURSERY",
  "LKG",
  "UKG",
  "CLASS I",
  "CLASS II",
  "CLASS III",
  "CLASS IV",
  "CLASS V",
  "CLASS VI",
  "CLASS VII",
  "CLASS VIII",
];

export default function StudentAttendanceStudio({
  setToast,
}: {
  setToast: (msg: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedClass, setSelectedClass] = useState("CLASS I");
  const [selectedSection, setSelectedSection] = useState("A");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [availableClasses, setAvailableClasses] = useState<string[]>(CLASSES);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"marker" | "history">("marker");
  const [historyRows, setHistoryRows] = useState<Record<string, unknown>[]>([]);
  const [historyFilter, setHistoryFilter] = useState("");

  // Load distinct classes from class_master if available
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("class_master")
      .select("class_name")
      .order("class_name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const names = Array.from(
            new Set(data.map((d) => String(d.class_name)))
          );
          setAvailableClasses(names);
        }
      });
  }, []);

  // Fetch students and any existing attendance for selected date + class
  const loadBatchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Get active students for class
      const { data: studentList, error: studErr } = await supabase
        .from("student_master")
        .select("student_id,admission_no,full_name,class_name,section,roll_no")
        .eq("class_name", selectedClass)
        .order("roll_no", { ascending: true });

      if (studErr) throw studErr;

      const loadedStudents: StudentRecord[] = studentList || [];
      setStudents(loadedStudents);

      // 2. Check if attendance already marked for this date and class
      const { data: existingAttendance } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("attendance_date", selectedDate)
        .eq("class_name", selectedClass);

      const existingMap = new Map<string, Record<string, unknown>>();
      (existingAttendance || []).forEach((rec) => {
        if (rec.student_id) existingMap.set(String(rec.student_id), rec);
        else if (rec.student_name) existingMap.set(String(rec.student_name), rec);
      });

      // Prepare editable entries
      const mappedEntries: AttendanceEntry[] = loadedStudents.map((st) => {
        const existing = existingMap.get(st.student_id) || existingMap.get(st.full_name);
        return {
          student_id: st.student_id,
          student_name: st.full_name,
          admission_no: st.admission_no || "",
          class_name: st.class_name,
          roll_no: st.roll_no || "—",
          status: (existing?.status as AttendanceEntry["status"]) || "present",
          remarks: String(existing?.remarks || ""),
          attendance_id: existing?.attendance_id ? String(existing.attendance_id) : undefined,
        };
      });

      setEntries(mappedEntries);
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Failed to load class roster"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedDate, setToast]);

  // Load history records
  const loadHistory = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("student_attendance")
        .select("*")
        .order("attendance_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      setHistoryRows(data || []);
    } catch (err) {
      console.warn("History fetch note:", err);
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
      .channel("rt-student-attendance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_attendance" },
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

  const updateStatus = (index: number, status: AttendanceEntry["status"]) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status };
      return copy;
    });
  };

  const updateRemarks = (index: number, remarks: string) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], remarks };
      return copy;
    });
  };

  const markAll = (status: AttendanceEntry["status"]) => {
    setEntries((prev) => prev.map((e) => ({ ...e, status })));
  };

  const handleSaveAttendance = async () => {
    if (!supabase || entries.length === 0) return;
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const markedBy =
        session?.user?.user_metadata?.full_name ||
        session?.user?.email ||
        "Teacher / Staff";

      // 1. Delete existing for (date, class) to prevent duplicate records
      await supabase
        .from("student_attendance")
        .delete()
        .eq("attendance_date", selectedDate)
        .eq("class_name", selectedClass);

      // 2. Insert new batch
      const recordsToInsert = entries.map((e) => ({
        student_id: e.student_id || null,
        student_name: e.student_name,
        class_name: e.class_name,
        attendance_date: selectedDate,
        status: e.status,
        remarks: e.remarks || null,
        marked_by: markedBy,
      }));

      const { error: insErr } = await supabase
        .from("student_attendance")
        .insert(recordsToInsert);

      if (insErr) throw insErr;

      await logActivity({
        action: `Marked student attendance for ${selectedClass} on ${selectedDate} (${recordsToInsert.length} students)`,
        module: "student_attendance",
      });

      setToast(
        `Attendance recorded for ${recordsToInsert.length} students in ${selectedClass}`
      );
      await loadBatchData();
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Failed to save attendance"
      );
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const total = entries.length;
  const presentCount = entries.filter((e) => e.status === "present").length;
  const absentCount = entries.filter((e) => e.status === "absent").length;
  const lateCount = entries.filter((e) => e.status === "late").length;
  const presentPercent = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section className="page-head">
        <div>
          <span className="overline">DAILY ATTENDANCE WORKSPACE</span>
          <h1>Student Attendance</h1>
          <p>
            Batch attendance register by class, section, and date with live
            database synchronization.
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
            Daily Register
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{
              background: activeTab === "history" ? "var(--blue)" : "#fff",
              color: activeTab === "history" ? "#fff" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            Attendance History
          </button>
        </div>
      </section>

      {activeTab === "marker" ? (
        <>
          {/* Controls Bar */}
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
                Date:
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
                Class:
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #d8e1eb",
                    fontSize: "13px",
                  }}
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                Section:
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #d8e1eb",
                    fontSize: "13px",
                  }}
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
                Year:
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={{
                    width: "110px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #d8e1eb",
                    fontSize: "13px",
                  }}
                />
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
                Load Roster
              </button>
            </div>

            {/* Quick Bulk actions */}
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
                onClick={() => markAll("absent")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #fecdd3",
                  background: "#fff1f2",
                  color: "#e11d48",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                ✕ Mark All Absent
              </button>
              <button
                onClick={handleSaveAttendance}
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
                {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
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
                  Total Students
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
                  Present Today
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

          {/* Attendance Table */}
          <div className="data-card">
            {loading ? (
              <div className="empty">
                <RefreshCw className="spin" />
                <h3>Loading class roster...</h3>
              </div>
            ) : entries.length === 0 ? (
              <div className="empty">
                <Users size={32} />
                <h3>No active students in {selectedClass}</h3>
                <p>
                  Add students to this class in Student Master to take attendance.
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "70px" }}>Roll No</th>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th style={{ width: "320px" }}>Attendance Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={entry.student_id || idx}>
                        <td style={{ fontWeight: 700 }}>{entry.roll_no}</td>
                        <td>{entry.admission_no || "—"}</td>
                        <td style={{ fontWeight: 700 }}>{entry.student_name}</td>
                        <td>{entry.class_name}</td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {(
                              [
                                ["present", "Present", "#10b981", "#ecfdf5"],
                                ["absent", "Absent", "#ef4444", "#fef2f2"],
                                ["late", "Late", "#f59e0b", "#fffbeb"],
                                ["leave", "Leave", "#8b5cf6", "#f5f3ff"],
                                ["half-day", "Half-Day", "#06b6d4", "#ecfeff"],
                              ] as const
                            ).map(([key, lbl, borderCol, bgCol]) => {
                              const active = entry.status === key;
                              return (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={() => updateStatus(idx, key)}
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
                            placeholder="Optional remark..."
                            value={entry.remarks}
                            onChange={(e) => updateRemarks(idx, e.target.value)}
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
        /* Attendance History */
        <div className="data-card">
          <div className="toolbar">
            <div className="table-search">
              <Search />
              <input
                placeholder="Search history by student name, date, class..."
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
                  <th>Date</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Marked By</th>
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
                      <td>{String(row.student_name || "—")}</td>
                      <td>{String(row.class_name || "—")}</td>
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
                      <td style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {String(row.marked_by || "—")}
                      </td>
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
