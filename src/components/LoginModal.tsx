import React from "react";
import { X, Shield, LogOut } from "lucide-react";
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
  onLogout,
}: LoginModalProps) {
  const userName =
    currentUser?.user_full_name ||
    currentUser?.user_name ||
    session?.user?.user_metadata?.full_name ||
    "User";
  const userRole = currentUser?.role || "staff";
  const userRoleLabel = label(userRole);
  const userEmail = currentUser?.user_name
    ? `${currentUser.user_name}`
    : (session?.user?.email || "Authenticated User");
  const moduleCount =
    currentUser?.allowed_modules?.length ||
    (userRole === "admin" ? ALL_SUBMENU_MODULES.length : 0);

  return (
    <div className="modal-bg">
      <div className="login" style={{ maxWidth: "440px" }}>
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
            margin: "16px 0 20px",
            padding: "16px",
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
              marginBottom: "12px",
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
