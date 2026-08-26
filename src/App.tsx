import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowUpDown,
  Bell,
  BookOpenCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Cloud,
  Download,
  Edit3,
  Eye,
  FileBarChart,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  logActivity,
  supabase,
  uploadToSupabaseStorage,
} from "./lib/supabase";
import { Field, label, moduleName, modules, navGroups } from "./modules";
import IDCardStudio from "./IDCardStudio";
import PortalLogin from "./PortalLogin";
import ProductionDashboard from "./ProductionDashboard";
import SchoolMaster from "./components/SchoolMaster";
import StudentAttendanceStudio from "./components/StudentAttendanceStudio";
import EmployeeAttendanceStudio from "./components/EmployeeAttendanceStudio";
import FeeReceiptModal from "./components/FeeReceiptModal";
import SalarySlipModal from "./components/SalarySlipModal";
import LetterPrintModal from "./components/LetterPrintModal";
import StudentMasterStudio from "./components/StudentMasterStudio";
import EmployeeMasterStudio from "./components/EmployeeMasterStudio";

type Row = Record<string, unknown>;

const logo =
  "https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg";

function NavGroupIcon({ name }: { name: string }) {
  switch (name) {
    case "Master Setup":
    case "Masters":
      return <FileBarChart />;
    case "People":
      return <Users />;
    case "Attendance":
      return <ClipboardCheck />;
    case "Finance":
      return <IndianRupee />;
    case "HR":
      return <UserRoundCheck />;
    case "Assets & Inventory":
      return <Cloud />;
    case "ID Cards":
      return <GraduationCap />;
    case "Academics":
      return <BookOpenCheck />;
    case "Communication":
      return <Bell />;
    case "Administration":
    case "System":
      return <Activity />;
    default:
      return <Activity />;
  }
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const normaliseCsvHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

function App() {
  const [active, setActive] = useState("Overview");
  const [navOpen, setNavOpen] = useState("");
  const [mobile, setMobile] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [role, setRole] = useState("Administrator");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{
    mode: "create" | "edit" | "view";
    row?: Row;
  } | null>(null);
  const [receiptModalRow, setReceiptModalRow] = useState<Row | null>(null);
  const [slipModalRow, setSlipModalRow] = useState<Row | null>(null);
  const [letterModal, setLetterModal] = useState<{
    type: "warning" | "offer";
    row: Row;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [authReady, setAuthReady] = useState(false);

  // Sorting & Pagination
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const searchRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);
  const mod = modules[active];

  useEffect(() => {
    supabase?.auth.getSession().then((x) => {
      setSession(x.data.session);
      setAuthReady(true);
    });
    const sub = supabase?.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    supabase
      .from("user_roles")
      .select("school_id,role")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRole(label(data.role));
        }
      });
  }, [session]);

  const refresh = useCallback(async () => {
    if (!mod || !supabase) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const req = supabase
        .from(mod.table)
        .select("*")
        .order(mod.primaryKey, { ascending: false })
        .limit(1000);
      const { data, error } = await req;
      if (error) {
        setToast(error.message);
        setRows([]);
      } else {
        setRows(data || []);
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [mod]);

  useEffect(() => {
    refresh();
    setPage(1);
  }, [refresh]);

  // Realtime updates on active table
  useEffect(() => {
    if (!supabase || !mod) return;
    const channel = supabase
      .channel(`table-${mod.table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: mod.table },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mod, refresh]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const choose = (name: string) => {
    setActive(name);
    setNavOpen(
      name === "Overview"
        ? ""
        : navGroups.find((group) => group.items.includes(name))?.label || ""
    );
    setMobile(false);
    setQuery("");
    setSortCol(null);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(q)
        )
      );
    }
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return sortAsc ? 1 : -1;
        if (valB === null || valB === undefined) return sortAsc ? -1 : 1;
        if (typeof valA === "number" && typeof valB === "number") {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return list;
  }, [rows, query, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  if (isSupabaseConfigured && !authReady)
    return <div className="auth-loading">Connecting to Supabase…</div>;
  if (isSupabaseConfigured && !session) return <PortalLogin />;

  const save = async (values: Row) => {
    if (!mod || !supabase) return;
    setLoading(true);
    try {
      const payload: Row = Object.fromEntries(
        Object.entries(values)
          .filter(([, value]) => modal?.mode === "edit" || value !== "")
          .map(([key, value]) => [
            key,
            modal?.mode === "edit" && value === "" ? null : value,
          ])
      );

      if (mod.table === "user_master" && modal?.mode !== "edit") {
        payload.password = "SUPABASE_AUTH";
      }

      // Auto-generate codes if blank
      if (mod.table === "department_master" && modal?.mode !== "edit") {
        if (!payload.department_code || String(payload.department_code).trim() === "") {
          const raw = String(payload.department_name || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
          const abbr = raw.slice(0, 4) || "GEN";
          payload.department_code = `DEPT-${abbr}`;
        }
      }
      if (mod.table === "vendor_master" && modal?.mode !== "edit") {
        if (!payload.vendor_code || String(payload.vendor_code).trim() === "") {
          const raw = String(payload.vendor_name || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
          payload.vendor_code = `VND-${raw.slice(0, 4) || "001"}`;
        }
      }
      if (mod.table === "asset_master" && modal?.mode !== "edit") {
        if (!payload.asset_code || String(payload.asset_code).trim() === "") {
          const raw = String(payload.asset_name || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
          payload.asset_code = `AST-${raw.slice(0, 4) || "001"}`;
        }
      }
      if (mod.table === "inventory_master" && modal?.mode !== "edit") {
        if (!payload.item_code || String(payload.item_code).trim() === "") {
          const raw = String(payload.item_name || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
          payload.item_code = `ITM-${raw.slice(0, 4) || "001"}`;
        }
      }
      if (mod.table === "fees_collection" && modal?.mode !== "edit") {
        if (!payload.receipt_number || String(payload.receipt_number).trim() === "") {
          const todayIso = new Date().toISOString().slice(2, 10).replace(/-/g, "");
          const rand = Math.floor(1000 + Math.random() * 9000);
          payload.receipt_number = `RCPT-${todayIso}-${rand}`;
        }
      }

      const rowId = modal?.row?.[mod.primaryKey];
      const isEdit = modal?.mode === "edit" && rowId;

      const result = isEdit
        ? await supabase
            .from(mod.table)
            .update(payload)
            .eq(mod.primaryKey, String(rowId))
        : await supabase.from(mod.table).insert(payload);

      if (result.error) {
        setToast(result.error.message);
        setLoading(false);
        return;
      }

      await logActivity({
        action: `${isEdit ? "Updated" : "Created"} record in ${mod.table}`,
        module: mod.table,
      });

      setModal(null);
      setToast(isEdit ? "Record updated in database" : "Record created in database");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (row: Row) => {
    if (!mod || !supabase || !confirm("Delete this record? This will delete from Supabase."))
      return;
    const rowId = row[mod.primaryKey];
    if (!rowId) return setToast("Record identifier is missing");
    try {
      const { error } = await supabase
        .from(mod.table)
        .delete()
        .eq(mod.primaryKey, String(rowId));
      if (error) {
        setToast(error.message);
        return;
      }
      await logActivity({
        action: `Deleted record from ${mod.table} (ID: ${rowId})`,
        module: mod.table,
      });
      setToast("Record deleted from database");
      refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const exportCsv = () => {
    if (!mod) return;
    const cols = mod.columns;
    const csv = [
      cols.map(label),
      ...filtered.map((r) =>
        cols.map((c) =>
          String(r[c] ?? "")
            .split('"')
            .join('""')
        )
      ),
    ]
      .map((x) => x.map((y) => `"${y}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${mod.table}.csv`;
    a.click();
    setToast("CSV downloaded");
  };

  const importCsv = async (file?: File) => {
    if (!file || !mod || !supabase) return;
    setLoading(true);
    try {
      const [headers, ...sourceRows] = parseCsv(await file.text());
      if (!headers || !sourceRows.length)
        throw new Error(
          "Use a CSV file with a header row and at least one record."
        );
      const validKeys = new Map<string, string>();
      [
        ...mod.fields.map((field) => [field.key, field.label] as const),
        ...mod.columns.map((column) => [column, label(column)] as const),
      ].forEach(([key, name]) => {
        validKeys.set(normaliseCsvHeader(key), key);
        validKeys.set(normaliseCsvHeader(name), key);
      });
      const mappedHeaders = headers.map(
        (header) => validKeys.get(normaliseCsvHeader(header)) || ""
      );
      if (!mappedHeaders.some(Boolean))
        throw new Error(
          "The CSV headers do not match this module. Export a CSV first to check column names."
        );
      const records = sourceRows
        .map((source) => {
          const record: Row = {};
          source.forEach((value, index) => {
            const key = mappedHeaders[index];
            if (!key || value === "") return;
            const field = mod.fields.find((item) => item.key === key);
            record[key] =
              field?.type === "boolean"
                ? ["true", "yes", "1"].includes(value.toLowerCase())
                : field?.type === "number"
                ? Number(value)
                : field?.type === "array"
                ? value
                    .split(";")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : value;
          });
          return record;
        })
        .filter((record) => Object.keys(record).length);

      if (!records.length)
        throw new Error("No usable records were found in this CSV.");

      const { error } = await supabase.from(mod.table).insert(records);
      if (error) throw error;

      await logActivity({
        action: `Imported ${records.length} records into ${mod.table} via CSV`,
        module: mod.table,
      });

      setToast(
        `${records.length} record${
          records.length === 1 ? "" : "s"
        } imported to Supabase successfully`
      );
      await refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "CSV import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <input
        className="csv-upload-input"
        ref={csvImportRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(event) => {
          void importCsv(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <header className="masthead">
        <button
          className="mobile-trigger"
          onClick={() => setMobile(!mobile)}
          aria-label="Open navigation"
        >
          <Menu />
        </button>
        <div className="identity" onClick={() => choose("Overview")} style={{ cursor: "pointer" }}>
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
          <button className="user-chip" onClick={() => setLoginOpen(true)}>
            <span>
              {session?.user?.email?.slice(0, 2).toUpperCase() || "AM"}
            </span>
            <div>
              <b>
                {session?.user?.user_metadata?.full_name ||
                  session?.user?.email ||
                  "Administrator"}
              </b>
              <small>{role}</small>
            </div>
            <ChevronDown />
          </button>
        </div>
      </header>

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
          <button onClick={() => setMobile(false)} aria-label="Close navigation">
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
          {navGroups.slice(1).map((g) => {
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

      <div className="contextbar">
        <div className="crumb">
          <span>St. John's English School</span>
          <b>/</b>
          <strong>{active === "Overview" ? "Dashboard" : moduleName(active)}</strong>
        </div>
        <div>
          <button onClick={refresh} title="Refresh from database">
            <RefreshCw className={loading ? "spin" : ""} />
            <span>Sync</span>
          </button>
          <span className="live">
            <i />
            Live Supabase
          </span>
        </div>
      </div>

      <main>
        {active === "Overview" ? (
          <ProductionDashboard choose={choose} />
        ) : active === "school_master" ? (
          <SchoolMaster setToast={setToast} />
        ) : active === "student_master" ? (
          <StudentMasterStudio
            setToast={setToast}
            onNavigateToIdCard={() => choose("student_idcard")}
            onNavigateToFees={() => choose("fees_collection")}
          />
        ) : active === "employee_master" ? (
          <EmployeeMasterStudio
            setToast={setToast}
            onGenerateIdCard={() => choose("teacher_idcard")}
            onGenerateSalarySlip={(emp) => setSlipModalRow(emp)}
          />
        ) : active === "student_attendance" ? (
          <StudentAttendanceStudio setToast={setToast} />
        ) : active === "employee_attendance" ? (
          <EmployeeAttendanceStudio setToast={setToast} />
        ) : active === "student_idcard" || active === "teacher_idcard" || active === "escort_card" ? (
          <IDCardStudio
            setToast={setToast}
            onUploadCsv={() => csvImportRef.current?.click()}
            initialType={active === "teacher_idcard" ? "employee" : "student"}
          />
        ) : (
          <>
            <PageHeader
              mod={mod}
              total={filtered.length}
              canAdd={mod.fields.length > 0}
              onAdd={() => setModal({ mode: "create" })}
            />

            <section className="data-card">
              <div className="toolbar">
                <div className="table-search">
                  <Search />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder={`Filter ${moduleName(mod.table)}... (${filtered.length} records)`}
                  />
                </div>
                <button onClick={exportCsv} title="Export current rows to CSV">
                  <Download />
                  Export CSV
                </button>
                {mod.fields.length > 0 && (
                  <button
                    onClick={() => csvImportRef.current?.click()}
                    title="Import records from CSV"
                  >
                    <Upload />
                    Import CSV
                  </button>
                )}
                {mod.fields.length > 0 && (
                  <button
                    onClick={() => setModal({ mode: "create" })}
                    style={{
                      background: "var(--blue)",
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    <Plus />
                    Add Record
                  </button>
                )}
              </div>

              <DataTable
                mod={mod}
                rows={paginatedRows}
                loading={loading}
                sortCol={sortCol}
                sortAsc={sortAsc}
                onSort={handleSort}
                view={(row) => setModal({ mode: "view", row })}
                edit={(row) => setModal({ mode: "edit", row })}
                remove={remove}
                printReceipt={(row) => setReceiptModalRow(row)}
                printSlip={(row) => setSlipModalRow(row)}
                printLetter={(type, row) => setLetterModal({ type, row })}
              />

              {/* Pagination Controls */}
              {filtered.length > 0 && (
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
                      {Math.min(page * pageSize, filtered.length)}
                    </b>{" "}
                    of <b>{filtered.length}</b> records
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
              )}
            </section>
          </>
        )}
      </main>

      {modal && (
        <RecordModal
          mode={modal.mode}
          mod={mod}
          row={modal.row}
          close={() => setModal(null)}
          save={save}
        />
      )}

      {receiptModalRow && (
        <FeeReceiptModal
          receipt={receiptModalRow}
          onClose={() => setReceiptModalRow(null)}
        />
      )}

      {slipModalRow && (
        <SalarySlipModal
          slip={slipModalRow}
          onClose={() => setSlipModalRow(null)}
        />
      )}

      {letterModal && (
        <LetterPrintModal
          data={letterModal.row}
          type={letterModal.type}
          onClose={() => setLetterModal(null)}
        />
      )}

      {loginOpen && (
        <Login
          close={() => setLoginOpen(false)}
          session={session}
          setToast={setToast}
        />
      )}

      {toast && (
        <div className="toast">
          <span>{toast}</span>
          <button onClick={() => setToast("")}>
            <X />
          </button>
        </div>
      )}
    </div>
  );
}

function PageHeader({
  mod,
  total,
  onAdd,
  canAdd,
}: {
  mod: (typeof modules)[string];
  total: number;
  onAdd: () => void;
  canAdd: boolean;
}) {
  return (
    <section className="page-head">
      <div>
        <span className="overline">{mod?.group?.toUpperCase()} WORKSPACE</span>
        <h1>{moduleName(mod.table)}</h1>
        <p>
          {mod?.description} · {total} records in database
        </p>
      </div>
      {canAdd && (
        <button onClick={onAdd}>
          <Plus />
          Add record
        </button>
      )}
    </section>
  );
}

function DataTable({
  mod,
  rows,
  loading,
  sortCol,
  sortAsc,
  onSort,
  view,
  edit,
  remove,
  printReceipt,
  printSlip,
  printLetter,
}: {
  mod: (typeof modules)[string];
  rows: Row[];
  loading: boolean;
  sortCol: string | null;
  sortAsc: boolean;
  onSort: (col: string) => void;
  view: (r: Row) => void;
  edit: (r: Row) => void;
  remove: (r: Row) => void;
  printReceipt?: (r: Row) => void;
  printSlip?: (r: Row) => void;
  printLetter?: (type: "warning" | "offer", r: Row) => void;
}) {
  if (loading)
    return (
      <div className="empty">
        <RefreshCw className="spin" />
        <h3>Loading from Supabase...</h3>
        <p>Querying real-time database records.</p>
      </div>
    );
  if (!rows.length)
    return (
      <div className="empty">
        <Cloud />
        <h3>No records found</h3>
        <p>There are no rows in this table yet. Click "Add record" or import a CSV to get started.</p>
      </div>
    );

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {mod.columns.map((c) => (
              <th
                key={c}
                onClick={() => onSort(c)}
                style={{ cursor: "pointer", userSelect: "none" }}
                title={`Sort by ${label(c)}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>{label(c)}</span>
                  <ArrowUpDown
                    size={12}
                    style={{
                      opacity: sortCol === c ? 1 : 0.3,
                      color: sortCol === c ? "var(--blue)" : "inherit",
                    }}
                  />
                </div>
              </th>
            ))}
            <th style={{ width: "110px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r[mod.primaryKey] || i)}>
              {mod.columns.map((c) => (
                <td key={c}>
                  {c.includes("status") || c === "is_active" ? (
                    <span
                      className="status"
                      style={{
                        background:
                          String(r[c]) === "false" ||
                          String(r[c]).toLowerCase() === "absent" ||
                          String(r[c]).toLowerCase() === "rejected" ||
                          String(r[c]).toLowerCase() === "cancelled"
                            ? "#fff0f0"
                            : String(r[c]).toLowerCase() === "pending" ||
                              String(r[c]).toLowerCase() === "partial" ||
                              String(r[c]).toLowerCase() === "draft"
                            ? "#fff7e6"
                            : "#e9f8f1",
                        color:
                          String(r[c]) === "false" ||
                          String(r[c]).toLowerCase() === "absent" ||
                          String(r[c]).toLowerCase() === "rejected" ||
                          String(r[c]).toLowerCase() === "cancelled"
                            ? "#c44558"
                            : String(r[c]).toLowerCase() === "pending" ||
                              String(r[c]).toLowerCase() === "partial" ||
                              String(r[c]).toLowerCase() === "draft"
                            ? "#b5731c"
                            : "#187454",
                      }}
                    >
                      <i
                        style={{
                          background:
                            String(r[c]) === "false" ||
                            String(r[c]).toLowerCase() === "absent"
                              ? "#c44558"
                              : String(r[c]).toLowerCase() === "pending"
                              ? "#b5731c"
                              : "#1fa472",
                        }}
                      />
                      {String(r[c] ?? (c === "is_active" ? "Active" : "—"))}
                    </span>
                  ) : c.includes("amount") ||
                    c.includes("salary") ||
                    c.includes("price") ||
                    c.includes("cost") ? (
                    typeof r[c] === "number" ? (
                      `₹${Number(r[c]).toLocaleString("en-IN")}`
                    ) : (
                      String(r[c] ?? "—")
                    )
                  ) : c.includes("photo_url") || c.includes("file_url") ? (
                    r[c] ? (
                      <a
                        href={String(r[c])}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--blue)", textDecoration: "underline" }}
                      >
                        View Attachment
                      </a>
                    ) : (
                      "—"
                    )
                  ) : (
                    String(r[c] ?? "—")
                  )}
                </td>
              ))}
              <td>
                <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                  {mod.table === "fees_collection" && printReceipt && (
                    <button
                      onClick={() => printReceipt(r)}
                      title="Print Fee Receipt"
                      style={{ color: "var(--blue)" }}
                    >
                      <Printer />
                    </button>
                  )}
                  {mod.table === "salary_slip" && printSlip && (
                    <button
                      onClick={() => printSlip(r)}
                      title="Print Salary Payslip"
                      style={{ color: "var(--blue)" }}
                    >
                      <Printer />
                    </button>
                  )}
                  {mod.table === "warning_letter" && printLetter && (
                    <button
                      onClick={() => printLetter("warning", r)}
                      title="Print Warning Letter"
                      style={{ color: "#d9534f" }}
                    >
                      <Printer />
                    </button>
                  )}
                  {mod.table === "offer_letter" && printLetter && (
                    <button
                      onClick={() => printLetter("offer", r)}
                      title="Print Offer Letter"
                      style={{ color: "var(--blue)" }}
                    >
                      <Printer />
                    </button>
                  )}
                  <button onClick={() => view(r)} title="View details">
                    <Eye />
                  </button>
                  {mod.fields.length > 0 && (
                    <button onClick={() => edit(r)} title="Edit record">
                      <Edit3 />
                    </button>
                  )}
                  {mod.fields.length > 0 && (
                    <button
                      className="danger"
                      onClick={() => remove(r)}
                      title="Delete record"
                    >
                      <Trash2 />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordModal({
  mode,
  mod,
  row,
  close,
  save,
}: {
  mode: "create" | "edit" | "view";
  mod: (typeof modules)[string];
  row?: Row;
  close: () => void;
  save: (v: Row) => void;
}) {
  const [values, setValues] = useState<Row>(() =>
    Object.fromEntries(
      mod.fields.map((x) => [
        x.key,
        row?.[x.key] ??
          (x.type === "boolean" ? true : x.type === "array" ? [] : ""),
      ])
    )
  );

  // Business logic auto calculations
  const updateField = (key: string, v: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [key]: v };

      // Department Code auto generator
      if (mod.table === "department_master" && key === "department_name" && mode === "create") {
        const raw = String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (raw.length > 0) {
          next.department_code = `DEPT-${raw.slice(0, 4)}`;
        }
      }

      // Vendor Code auto generator
      if (mod.table === "vendor_master" && key === "vendor_name" && mode === "create") {
        const raw = String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (raw.length > 0) {
          next.vendor_code = `VND-${raw.slice(0, 4)}`;
        }
      }

      // Salary slip auto calculation: Gross, Deductions, Net
      if (mod.table === "salary_slip") {
        const basic = Number(key === "basic_salary" ? v : next.basic_salary) || 0;
        const hra = Number(key === "hra" ? v : next.hra) || 0;
        const da = Number(key === "da" ? v : next.da) || 0;
        const otherA = Number(key === "other_allowances" ? v : next.other_allowances) || 0;
        const gross = basic + hra + da + otherA;
        next.gross_salary = gross;

        const pf = Number(key === "pf_deduction" ? v : next.pf_deduction) || 0;
        const esi = Number(key === "esi_deduction" ? v : next.esi_deduction) || 0;
        const tds = Number(key === "tds" ? v : next.tds) || 0;
        const otherD = Number(key === "other_deductions" ? v : next.other_deductions) || 0;
        const deductions = pf + esi + tds + otherD;
        next.total_deductions = deductions;
        next.net_salary = Math.max(0, gross - deductions);
      }

      // Fees collection status auto update
      if (mod.table === "fees_collection") {
        const due = Number(key === "amount_due" ? v : next.amount_due) || 0;
        const paid = Number(key === "amount_paid" ? v : next.amount_paid) || 0;
        if (due > 0 && paid >= due) {
          next.status = "paid";
        } else if (paid > 0 && paid < due) {
          next.status = "partial";
        }
      }

      // Leave calculation
      if (mod.table === "leave_application" && (key === "from_date" || key === "to_date")) {
        const from = String(key === "from_date" ? v : next.from_date);
        const to = String(key === "to_date" ? v : next.to_date);
        if (from && to) {
          const diff = Math.ceil(
            (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24)
          ) + 1;
          if (diff > 0) next.total_days = diff;
        }
      }

      return next;
    });
  };

  const onSelectRelationDetails = (record: Record<string, unknown>) => {
    // When student is selected in fees or attendance
    if (mod.table === "fees_collection" || mod.table === "student_attendance") {
      setValues((prev) => ({
        ...prev,
        student_name: record.full_name || record.student_name || prev.student_name,
        admission_no: record.admission_no || prev.admission_no,
        class_name: record.class_name || prev.class_name,
      }));
    }
    // When employee is selected in salary slip or leave
    if (mod.table === "salary_slip" || mod.table === "leave_application") {
      setValues((prev) => ({
        ...prev,
        employee_name:
          record.full_name ||
          `${record.first_name || ""} ${record.last_name || ""}`.trim() ||
          prev.employee_name,
        basic_salary: record.basic_salary || prev.basic_salary,
      }));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save(values);
  };

  return (
    <div className="modal-bg">
      <form className="record-modal" onSubmit={submit}>
        <header>
          <div>
            <span>{mode.toUpperCase()} RECORD</span>
            <h2>{moduleName(mod.table)}</h2>
            <p>
              {mode === "view"
                ? "Review saved database record."
                : "Complete the fields below. Changes persist directly to Supabase."}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close modal">
            <X />
          </button>
        </header>

        <div className="form-grid">
          {mod.fields.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={values[field.key]}
              disabled={mode === "view"}
              change={(v) => updateField(field.key, v)}
              onRelationSelected={onSelectRelationDetails}
            />
          ))}
        </div>

        <footer>
          <button type="button" onClick={close}>
            {mode === "view" ? "Close" : "Cancel"}
          </button>
          {mode !== "view" && (
            <button className="save" type="submit">
              {mode === "edit" ? "Save changes" : "Create record"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}

function FormField({
  field,
  value,
  disabled,
  change,
  onRelationSelected,
}: {
  key?: string;
  field: Field;
  value: unknown;
  disabled: boolean;
  change: (v: unknown) => void;
  onRelationSelected?: (record: Record<string, unknown>) => void;
}) {
  const [relationOptions, setRelationOptions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (field.type !== "relation" || !field.reference || !supabase) return;
    const reference = field.reference;
    supabase
      .from(reference.table)
      .select("*")
      .order(reference.label)
      .limit(500)
      .then(({ data }) => {
        setRelationOptions((data || []) as unknown as Array<Record<string, unknown>>);
      });
  }, [field]);

  const isUrlOrFileField =
    field.key.endsWith("_url") ||
    field.key.endsWith("_photo") ||
    field.key === "attachment_url";

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadToSupabaseStorage(
        file,
        "school-documents",
        "records"
      );
      change(publicUrl);
    } catch {
      // Fallback handled inside uploadToSupabaseStorage
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className={field.type === "textarea" ? "full" : ""}>
      <span>
        {field.label}
        {field.required && <b>*</b>}
      </span>

      {field.type === "textarea" || field.type === "array" ? (
        <textarea
          disabled={disabled}
          required={field.required}
          value={
            field.type === "array" && Array.isArray(value)
              ? value.join(", ")
              : String(value ?? "")
          }
          placeholder={field.type === "array" ? "Comma-separated values (e.g. Maths, Science)" : ""}
          onChange={(e) =>
            change(
              field.type === "array"
                ? e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : e.target.value
            )
          }
        />
      ) : field.type === "boolean" ? (
        <select
          disabled={disabled}
          value={String(value ?? true)}
          onChange={(e) => change(e.target.value === "true")}
        >
          <option value="true">Yes / Active</option>
          <option value="false">No / Inactive</option>
        </select>
      ) : field.type === "relation" && field.reference ? (
        <select
          disabled={disabled}
          required={field.required}
          value={String(value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            change(val);
            const found = relationOptions.find(
              (opt) => String(opt[field.reference!.value]) === val
            );
            if (found && onRelationSelected) {
              onRelationSelected(found);
            }
          }}
        >
          <option value="">Select...</option>
          {relationOptions.map((option) => (
            <option
              key={String(option[field.reference!.value])}
              value={String(option[field.reference!.value])}
            >
              {String(
                option[field.reference!.label] ||
                  option.full_name ||
                  option.first_name ||
                  option[field.reference!.value] ||
                  ""
              )}
            </option>
          ))}
        </select>
      ) : field.type === "select" ? (
        <select
          disabled={disabled}
          required={field.required}
          value={String(value ?? "")}
          onChange={(e) => change(e.target.value)}
        >
          <option value="">Select option...</option>
          {field.options?.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      ) : isUrlOrFileField ? (
        <div style={{ display: "grid", gap: "6px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              disabled={disabled}
              required={field.required}
              type="text"
              placeholder="https://..."
              value={String(value ?? "")}
              onChange={(e) => change(e.target.value)}
              style={{ flex: 1 }}
            />
            {!disabled && (
              <label
                style={{
                  padding: "0 12px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f0f4fa",
                  border: "1px solid #d4deec",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--blue)",
                }}
              >
                <Upload size={14} />
                <span>{uploading ? "Uploading..." : "Upload"}</span>
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          {value && typeof value === "string" && value.startsWith("http") && (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "11px", color: "var(--blue)", textDecoration: "underline" }}
            >
              Preview current file / image
            </a>
          )}
        </div>
      ) : (
        <input
          disabled={disabled}
          required={field.required}
          type={field.type || "text"}
          placeholder={
            field.key === "department_code"
              ? "Auto-generated (e.g. DEPT-ACAD)"
              : field.key === "vendor_code"
              ? "Auto-generated (e.g. VND-SUPP)"
              : field.key === "receipt_number"
              ? "Auto-generated on save"
              : undefined
          }
          value={String(value ?? "")}
          onChange={(e) =>
            change(
              field.type === "number" && e.target.value !== ""
                ? Number(e.target.value)
                : e.target.value
            )
          }
        />
      )}
    </label>
  );
}

function Login({
  close,
  session,
  setToast,
}: {
  close: () => void;
  session: Session | null;
  setToast: (s: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setToast(error.message);
      } else {
        await logActivity({
          action: "User signed in to portal",
          module: "auth",
        });
        setToast("Signed in successfully");
        close();
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Sign-in error");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await logActivity({
      action: "User signed out",
      module: "auth",
    });
    await supabase?.auth.signOut();
    setToast("Signed out successfully");
    close();
  };

  return (
    <div className="modal-bg">
      <form className="login" onSubmit={submit}>
        <button
          type="button"
          className="login-close"
          onClick={close}
          aria-label="Close"
        >
          <X />
        </button>
        <img src={logo} alt="St. John's English School" />
        <span>SECURE SCHOOL ERP</span>
        <h2>{session ? "Your session" : "Sign in to ERP"}</h2>
        <p>
          {session
            ? session.user.email
            : "Sign in with your administrator or teacher credentials."}
        </p>
        {session ? (
          <button type="button" className="login-button" onClick={logout}>
            Sign out of session
          </button>
        ) : (
          <>
            <label>
              Email address
              <input
                required
                type="email"
                placeholder="admin@stjohns.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="login-button" disabled={busy}>
              <LogIn />
              {busy ? "Authenticating..." : "Sign in securely"}
            </button>
            <small>Accounts are managed through Supabase Auth.</small>
          </>
        )}
      </form>
    </div>
  );
}

export default App;
