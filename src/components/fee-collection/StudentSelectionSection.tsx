import React from "react";
import { User } from "lucide-react";

type StudentSelectionSectionProps = {
  className: string;
  allClasses: string[];
  allStudents: any[];
  handleClassChange: (cls: string) => void;
  studentId: string;
  handleStudentSelect: (id: string) => void;
  classStudents: any[];
  admissionNo: string;
  setAdmissionNo: (val: string) => void;
  academicYear: string;
  setAcademicYear: (val: string) => void;
  studentName: string;
  studentFeeStatus: { paidMonths: Set<string>; dueMonths: string[] };
  mode: "create" | "edit" | "view";
};

export const StudentSelectionSection: React.FC<StudentSelectionSectionProps> = ({
  className,
  allClasses,
  allStudents,
  handleClassChange,
  studentId,
  handleStudentSelect,
  classStudents,
  admissionNo,
  setAdmissionNo,
  academicYear,
  setAcademicYear,
  studentName,
  studentFeeStatus,
  mode,
}) => {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#0f3661",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <User size={14} /> Student Details
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Class Dropdown */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "4px",
            }}
          >
            Class <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={className}
            onChange={(e) => handleClassChange(e.target.value)}
            disabled={mode === "view"}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "13px",
              color: "#0f172a",
              fontWeight: 600,
              outline: "none",
            }}
          >
            <option value="">-- Choose Class --</option>
            {allClasses.map((cls) => {
              const count = allStudents.filter(
                (s) => String(s.class_name || "").trim().toUpperCase() === cls.toUpperCase()
              ).length;
              return (
                <option key={cls} value={cls}>
                  {cls} {count > 0 ? `(${count})` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Student Dropdown (Filtered by Class) */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "4px",
            }}
          >
            Student Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={studentId}
            onChange={(e) => handleStudentSelect(e.target.value)}
            disabled={mode === "view" || !className}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: className ? "#ffffff" : "#f1f5f9",
              fontSize: "13px",
              color: "#0f172a",
              fontWeight: 600,
              outline: "none",
            }}
          >
            <option value="">
              {!className
                ? "Select Class first"
                : classStudents.length === 0
                ? "No students found"
                : "-- Choose Student --"}
            </option>
            {classStudents.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.full_name || s.student_name} {s.admission_no ? `(${s.admission_no})` : ""}{" "}
                {s.roll_no ? `• Roll ${s.roll_no}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Admission Number */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "4px",
            }}
          >
            Admission No
          </label>
          <input
            type="text"
            value={admissionNo}
            onChange={(e) => setAdmissionNo(e.target.value)}
            readOnly={mode === "view"}
            placeholder="e.g. ADM-001"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "13px",
              color: "#0f172a",
              outline: "none",
            }}
          />
        </div>

        {/* Academic Year */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "4px",
            }}
          >
            Academic Session
          </label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            readOnly={mode === "view"}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "13px",
              color: "#0f172a",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Selected Student Confirmation Pill */}
      {studentName && (
        <div
          style={{
            marginTop: "10px",
            padding: "6px 10px",
            background: "#eff6ff",
            borderRadius: "6px",
            border: "1px solid #bfdbfe",
            fontSize: "12px",
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <div>
            <strong>{studentName}</strong> | Adm: {admissionNo || "—"} | Class: {className || "—"}
          </div>
          {studentFeeStatus.dueMonths.length > 0 && (
            <div style={{ color: "#b45309", fontWeight: 600 }}>
              ⚠️ {studentFeeStatus.dueMonths.length} Months Due
            </div>
          )}
        </div>
      )}
    </div>
  );
};
