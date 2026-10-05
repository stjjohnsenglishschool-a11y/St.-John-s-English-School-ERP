import React from "react";
import { RefreshCw } from "lucide-react";
import { moduleName } from "../modules";

export interface AppContextBarProps {
  active: string;
  loading: boolean;
  handleGlobalSync: () => void;
}

export default function AppContextBar({
  active,
  loading,
  handleGlobalSync,
}: AppContextBarProps) {
  return (
    <div className="contextbar">
      <div className="crumb">
        <span>St. John's English School</span>
        <b>/</b>
        <strong>
          {active === "Overview" ? "Dashboard" : moduleName(active)}
        </strong>
      </div>
      <div>
        <button
          onClick={() => handleGlobalSync()}
          title="Sync live data from Supabase"
        >
          <RefreshCw className={loading ? "spin" : ""} />
          <span>Sync Live Data</span>
        </button>
        <span className="live">
          <i />
          Live Supabase
        </span>
      </div>
    </div>
  );
}
