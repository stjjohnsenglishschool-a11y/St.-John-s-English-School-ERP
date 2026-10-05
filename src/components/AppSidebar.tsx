import React from "react";
import {
  X,
  LayoutDashboard,
  ChevronDown,
  CircleHelp,
} from "lucide-react";
import { moduleName } from "../modules";
import NavGroupIcon from "./NavGroupIcon";

export interface AppSidebarProps {
  mobile: boolean;
  setMobile: (v: boolean) => void;
  active: string;
  choose: (tab: string) => void;
  navOpen: string;
  setNavOpen: (label: string | ((prev: string) => string)) => void;
  visibleNavGroups: Array<{
    label: string;
    items: string[];
  }>;
}

export default function AppSidebar({
  mobile,
  setMobile,
  active,
  choose,
  navOpen,
  setNavOpen,
  visibleNavGroups,
}: AppSidebarProps) {
  return (
    <>
      {mobile && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}

      <nav
        className={mobile ? "sidebar show" : "sidebar"}
        aria-label="ERP navigation"
      >
        <div className="sidebar-heading">
          <span>MAIN NAVIGATION</span>
          <button
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <div className="sidebar-menu">
          <button
            className={`sidebar-link ${active === "Overview" ? "active" : ""}`}
            onClick={() => choose("Overview")}
          >
            <span className="sidebar-icon">
              <LayoutDashboard />
            </span>
            <span>Dashboard</span>
          </button>
          {visibleNavGroups.map((g) => {
            const open = navOpen === g.label;
            const groupActive = g.items.includes(active);
            return (
              <div
                className={`side-group ${open ? "open" : ""}`}
                data-group={g.label}
                key={g.label}
              >
                <button
                  className={`side-group-button ${groupActive ? "active" : ""}`}
                  onClick={() => setNavOpen(open ? "" : g.label)}
                  aria-expanded={open}
                >
                  <span className="sidebar-icon">
                    <NavGroupIcon name={g.label} />
                  </span>
                  <span>{g.label}</span>
                  <ChevronDown className="side-chevron" />
                </button>
                {open && (
                  <div className="side-submenu">
                    {g.items.map((item) => (
                      <button
                        className={active === item ? "active" : ""}
                        key={item}
                        onClick={() => choose(item)}
                      >
                        <i />
                        <span>{moduleName(item)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          className="sidebar-help"
          onClick={() => window.open("https://wa.me/919674368297", "_blank")}
        >
          <CircleHelp />
          <span>
            <b>Need help?</b>
            <small>Contact school technical team</small>
          </span>
        </button>
      </nav>
    </>
  );
}
