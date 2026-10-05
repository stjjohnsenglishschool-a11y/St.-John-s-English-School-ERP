import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: (size: number) => void;
};

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  pageSize,
  totalFiltered,
  totalPages,
  setPage,
  setPageSize,
}) => {
  if (totalFiltered <= 0) return null;

  return (
    <div
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid var(--line)",
        background: "#fbfcfe",
        fontSize: "12px",
        color: "var(--muted)",
      }}
    >
      <div>
        Showing{" "}
        <b>
          {(page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, totalFiltered)}
        </b>{" "}
        of <b>{totalFiltered}</b> records
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          Rows:
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #d8e1eb",
            }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid #d8e1eb",
              background: page <= 1 ? "#f5f7fa" : "#fff",
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ padding: "4px 8px", fontWeight: 700 }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid #d8e1eb",
              background: page >= totalPages ? "#f5f7fa" : "#fff",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
