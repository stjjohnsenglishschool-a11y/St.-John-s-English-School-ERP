import React from "react";
import { X, Shield, Users, LogOut } from "lucide-react";
import { ALL_SUBMENU_MODULES, label } from "../modules";
import { Session } from "../lib/supabase";

export interface LoginModalProps {
  close: () => void;
  session: Session | null;
  currentUser: {
    user_name: string;
    user_full_name: string;
    role: string;
    allowed_modules: string[];
    department?: string;
  } | null;
  onSwitchUser?: (u: {
    user_name: string;
    user_full_name: string;
    role: string;
    allowed_modules: string[];
    department?: string;
  }) => void;
  setToast: (s: string) => void;
  onLogout: () => void;
}

const logo =
  "https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg";

export default function LoginModal({
  close,
  session,
  currentUser,
  onSwitchUser,
  setToast,
  onLogout,
}: LoginModalProps) {
  const userName =
    currentUser?.user_full_name ||
    currentUser?.user_name ||
    session?.user?.user_metadata?.full_name ||
    "Administrator";
  const userRole = currentUser?.role || "admin";
  const userRoleLabel = label(userRole);
  const userEmail = currentUser?.user_name
    ? `${currentUser.user_name}@stjohns.edu`
    : (session?.user?.email || "admin@stjohns.edu");
  const moduleCount =
    currentUser?.allowed_modules?.length ||
    (userRole === "admin" ? ALL_SUBMENU_MODULES.length : 0);

  const demoPresets = [
    {
      roleTitle: "Administrator",
      name: "System Administrator",
      username: "admin",
      role: "admin",
      department: "Management",
      modules: ALL_SUBMENU_MODULES.map((m) => m.key),
      color: "#0284c7",
    },
    {
      roleTitle: "Principal",
      name: "John Stevens",
      username: "principal",
      role: "principal",
      department: "Management",
      modules: [
        "school_master",
        "department_master",
        "class_master",
        "student_master",
        "employee_master",
        "student_attendance",
        "employee_attendance",
        "fees_structure",
        "fees_collection",
        "income_master",
        "notice_automation",
      ],
      color: "#7c3aed",
    },
    {
      roleTitle: "Teacher / Faculty",
      name: "Soma Chakraborty",
      username: "schakraborty",
      role: "teacher",
      department: "Teaching Staff",
      modules: [
        "student_master",
        "student_attendance",
        "assignments_master",
        "notice_automation",
        "student_idcard",
        "escort_card",
      ],
      color: "#16a34a",
    },
    {
      roleTitle: "Accounts Officer",
      name: "Ramesh Dutta",
      username: "rdutta",
      role: "accounts",
      department: "Accounts & Finance",
      modules: [
        "fees_structure",
        "fees_collection",
        "expense_master",
        "income_master",
        "income_head_master",
        "salary_slip",
        "vendor_master",
      ],
      color: "#d97706",
    },
    {
      roleTitle: "HR Manager",
      name: "Anita Roy",
      username: "hr",
      role: "hr",
      department: "Administrative Office",
      modules: [
        "employee_master",
        "employee_attendance",
        "leave_application",
        "leave_balance",
        "salary_slip",
        "warning_letter",
        "offer_letter",
        "employee_document",
        "teacher_idcard",
      ],
      color: "#db2777",
    },
    {
      roleTitle: "Front Office Staff",
      name: "Sunil Sen",
      username: "staff",
      role: "staff",
      department: "Administrative Office",
      modules: [
        "student_master",
        "student_attendance",
        "student_idcard",
        "escort_card",
        "notice_automation",
      ],
      color: "#4f46e5",
    },
  ];

  return (
    <div className="modal-bg">
      <div className="login" style={{ maxWidth: "480px" }}>
        <button
          type="button"
          className="login-close"
          onClick={close}
          aria-label="Close"
        >
          <X />
        </button>
        <img
          src={logo}
          alt="St. John's English School"
          style={{ height: "46px", objectFit: "contain" }}
        />
        <span>ST. JOHN'S ENGLISH SCHOOL ERP</span>

        <div
          style={{
            margin: "16px 0 16px",
            padding: "14px 16px",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "var(--blue)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <b style={{ fontSize: "15px", color: "#0f172a", display: "block" }}>
                {userName}
              </b>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                {userEmail}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                background: "#e0f2fe",
                color: "#0369a1",
                borderRadius: "6px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Shield size={13} />
              Role: {userRoleLabel}
            </div>
            <div
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                background: "#f0fdf4",
                color: "#166534",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              {userRole === "admin"
                ? "All Modules Authorized"
                : `${moduleCount} Permitted Modules`}
            </div>
          </div>
        </div>

        {/* Quick Role Switcher */}
        {onSwitchUser && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
              textAlign: "left",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Users size={14} />
              Quick Switch Role / Account
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "6px",
              }}
            >
              {demoPresets.map((p) => {
                const isActive =
                  (currentUser?.role || "admin").toLowerCase() ===
                    p.role.toLowerCase() &&
                  (currentUser?.user_name || "admin").toLowerCase() ===
                    p.username.toLowerCase();
                return (
                  <button
                    key={p.username}
                    type="button"
                    onClick={() => {
                      onSwitchUser({
                        user_name: p.username,
                        user_full_name: p.name,
                        role: p.role,
                        allowed_modules: p.modules,
                        department: p.department,
                      });
                    }}
                    style={{
                      background: isActive ? "#eff6ff" : "#f8fafc",
                      border: `1px solid ${isActive ? "#3b82f6" : "#cbd5e1"}`,
                      borderRadius: "6px",
                      padding: "6px 8px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: p.color,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <b style={{ color: isActive ? "#1d4ed8" : "#334155" }}>
                        {p.roleTitle}
                      </b>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            type="button"
            className="login-button"
            onClick={onLogout}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "13px",
            }}
          >
            <LogOut size={16} />
            Sign Out of ERP (Logout)
          </button>
          <button
            type="button"
            onClick={close}
            style={{
              background: "transparent",
              color: "#64748b",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
