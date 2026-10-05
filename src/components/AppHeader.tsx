import React, { RefObject } from "react";
import {
  Menu,
  Search,
  MessageCircle,
  Bell,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { label } from "../modules";

export interface AppHeaderProps {
  mobile: boolean;
  setMobile: (v: boolean | ((prev: boolean) => boolean)) => void;
  choose: (tab: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  currentUser: {
    user_name: string;
    user_full_name: string;
    role: string;
    allowed_modules: string[];
  } | null;
  role: string;
  isUserAdmin: boolean;
  setLoginOpen: (v: boolean) => void;
  handleLogout: () => void;
}

const logo =
  "https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg";

export default function AppHeader({
  mobile,
  setMobile,
  choose,
  searchRef,
  query,
  setQuery,
  currentUser,
  role,
  isUserAdmin,
  setLoginOpen,
  handleLogout,
}: AppHeaderProps) {
  return (
    <header className="masthead">
      <button
        className="mobile-trigger"
        onClick={() => setMobile(!mobile)}
        aria-label="Open navigation"
      >
        <Menu />
      </button>
      <div
        className="identity"
        onClick={() => choose("Overview")}
        style={{ cursor: "pointer" }}
      >
        <img src={logo} alt="St. John's English School" />
        <div>
          <b>ST. JOHN'S</b>
          <span>ENGLISH SCHOOL</span>
        </div>
      </div>
      <div className="command-search">
        <Search />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search active records across all fields... (Ctrl+K)"
        />
        <kbd>Ctrl K</kbd>
      </div>
      <div className="head-actions">
        <a
          href="https://wa.me/919674368297"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact school on WhatsApp"
          title="WhatsApp Support"
        >
          <MessageCircle />
        </a>
        <button
          aria-label="Audit Activity Log"
          title="Activity Log"
          onClick={() => choose("userlog_master")}
        >
          <Bell />
          <i />
        </button>
        <button
          className="user-chip"
          onClick={() => setLoginOpen(true)}
          title="Click for Profile & Logout Options"
          style={{ cursor: "pointer" }}
        >
          <span>
            {(currentUser?.user_full_name || currentUser?.user_name || "AM")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div>
            <b>
              {currentUser?.user_full_name ||
                currentUser?.user_name ||
                "Administrator"}
            </b>
            <small>
              {currentUser?.role ? label(currentUser.role) : role}
              {!isUserAdmin && currentUser?.allowed_modules && (
                <span style={{ marginLeft: "4px", color: "#0284c7" }}>
                  ({currentUser.allowed_modules.length} modules)
                </span>
              )}
            </small>
          </div>
          <ChevronDown />
        </button>
        <button
          className="logout-action-btn"
          onClick={handleLogout}
          title="Sign Out of ERP Portal"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
