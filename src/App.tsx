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
  EyeOff,
  FileBarChart,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
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
import { seedSupabaseDatabase } from "./lib/seedDatabase";
import { ALL_SUBMENU_MODULES, Field, label, moduleName, modules, navGroups } from "./modules";
import { getCurrentAcademicYear, ACADEMIC_YEAR_OPTIONS } from "./lib/academicYear";
import IDCardStudio from "./IDCardStudio";
import PortalLogin from "./PortalLogin";
import ProductionDashboard from "./ProductionDashboard";
import SchoolMaster from "./components/SchoolMaster";
import DepartmentMasterStudio from "./components/DepartmentMasterStudio";
import StudentAttendanceStudio from "./components/StudentAttendanceStudio";
import EmployeeAttendanceStudio from "./components/EmployeeAttendanceStudio";
import FeeReceiptModal from "./components/FeeReceiptModal";
import SalarySlipModal from "./components/SalarySlipModal";
import LetterPrintModal from "./components/LetterPrintModal";
import StudentMasterStudio from "./components/StudentMasterStudio";
import EmployeeMasterStudio from "./components/EmployeeMasterStudio";
import CsvImportModal from "./components/CsvImportModal";
import DigitalVerificationModal, { VerificationData } from "./components/DigitalVerificationModal";
import { downloadSampleCsv } from "./lib/csvUtils";
import { formatImageUrl, handleImageError } from "./lib/imageUtils";

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
  const [loggedOut, setLoggedOut] = useState(
    () => localStorage.getItem("sjes_logged_out") === "true"
  );
  const [role, setRole] = useState("Administrator");

  // Currently logged in ERP user profile & allowed modules session
  const [currentUser, setCurrentUser] = useState<{
    user_name: string;
    user_full_name: string;
    role: string;
    allowed_modules: string[];
  } | null>(() => {
    try {
      const raw = localStorage.getItem("sjes_logged_in_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const syncCurrentUser = useCallback(() => {
    try {
      const raw = localStorage.getItem("sjes_logged_in_user");
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      } else {
        setCurrentUser(null);
      }
    } catch {
      // ignore
    }
  }, []);

  const isUserAdmin = useMemo(() => {
    if (!currentUser) return true;
    const r = (currentUser.role || "").toLowerCase();
    const name = (currentUser.user_name || "").toLowerCase();
    return r === "admin" || r === "administrator" || name === "admin";
  }, [currentUser]);

  const allowedModuleKeys = useMemo(() => {
    if (isUserAdmin) return null; // null means unrestricted full access
    const list = currentUser?.allowed_modules || [];
    return new Set(list.map((m) => m.toLowerCase().trim()));
  }, [currentUser, isUserAdmin]);

  const visibleNavGroups = useMemo(() => {
    if (!allowedModuleKeys) return navGroups.slice(1);
    return navGroups
      .slice(1)
      .map((g) => {
        const allowedItems = g.items.filter((item) =>
          allowedModuleKeys.has(item.toLowerCase())
        );
        return { ...g, items: allowedItems };
      })
      .filter((g) => g.items.length > 0);
  }, [allowedModuleKeys]);

  // Route protection guard: if current active module is not allowed, reset to Overview
  useEffect(() => {
    if (active === "Overview" || !allowedModuleKeys) return;
    if (!allowedModuleKeys.has(active.toLowerCase())) {
      setActive("Overview");
      setToast(`Module '${moduleName(active)}' is not permitted for your user account.`);
    }
  }, [active, allowedModuleKeys]);
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
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [urlVerificationData, setUrlVerificationData] = useState<VerificationData | null>(null);

  // Auto-detect ?verify= query param from scanned QR codes
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const verifyCode = params.get("verify");
      if (verifyCode) {
        setUrlVerificationData({
          code: verifyCode,
          name: params.get("name") || "Verified Member",
          type: params.get("type") || "student",
          role: params.get("role") || undefined,
          department: params.get("dept") || undefined,
          validUntil: params.get("valid") || "2027-03-31",
          school: params.get("school") || "St. John's English School",
          photoUrl: params.get("photo") || undefined,
        });
      }
    }
  }, []);

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

  const refresh = useCallback(async (forceSeed = false) => {
    if (!mod) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      if (supabase) {
        if (forceSeed) {
          const result = await seedSupabaseDatabase(true);
          setToast(result.message);
        } else {
          await seedSupabaseDatabase(false);
        }

        const req = supabase
          .from(mod.table)
          .select("*")
          .order(mod.primaryKey, { ascending: false })
          .limit(1000);
        let { data, error } = await req;

        // Auto-seed table in Supabase if table is empty and initialRows are available
        if (!error && (!data || data.length === 0) && mod.initialRows && mod.initialRows.length > 0) {
          const { error: seedErr } = await supabase.from(mod.table).insert(mod.initialRows);
          if (!seedErr) {
            const reFetch = await supabase.from(mod.table).select("*").order(mod.primaryKey, { ascending: false }).limit(1000);
            if (reFetch.data && reFetch.data.length > 0) {
              data = reFetch.data;
            }
          } else {
            console.warn("Auto-insert into Supabase table failed:", seedErr.message);
          }
        }

        if (error) {
          console.warn("Supabase load error, reading local cache:", error.message);
          const cached = localStorage.getItem(`sjes_table_${mod.table}`);
          if (cached) {
            setRows(JSON.parse(cached));
          } else {
            setRows(mod.initialRows || []);
          }
        } else {
          setRows(data || mod.initialRows || []);
          localStorage.setItem(`sjes_table_${mod.table}`, JSON.stringify(data || []));
        }
      } else {
        const cached = localStorage.getItem(`sjes_table_${mod.table}`);
        if (cached) {
          setRows(JSON.parse(cached));
        } else {
          setRows([]);
        }
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
      .channel(`table-rt-${mod.table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: mod.table },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setRows((prev) => {
              const pKey = mod.primaryKey;
              if (prev.some((r) => String(r[pKey]) === String(payload.new[pKey]))) return prev;
              return [payload.new as Row, ...prev];
            });
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setRows((prev) => {
              const pKey = mod.primaryKey;
              return prev.map((r) =>
                String(r[pKey]) === String(payload.new[pKey]) ? { ...r, ...(payload.new as Row) } : r
              );
            });
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRows((prev) => {
              const pKey = mod.primaryKey;
              return prev.filter((r) => String(r[pKey]) !== String(payload.old[pKey]));
            });
          } else {
            refresh();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Live Supabase sync active on table ${mod.table}`);
        }
      });

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

  const handleLogout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    localStorage.setItem("sjes_logged_out", "true");
    localStorage.removeItem("sjes_demo_session");
    setSession(null);
    setLoggedOut(true);
    setLoginOpen(false);
    setToast("Successfully signed out of ERP.");
  };

  if (isSupabaseConfigured && !authReady)
    return <div className="auth-loading">Connecting to Supabase…</div>;

  if (
    loggedOut ||
    (isSupabaseConfigured &&
      !session &&
      localStorage.getItem("sjes_demo_session") !== "true")
  ) {
    return (
      <PortalLogin
        onLoginSuccess={() => {
          setLoggedOut(false);
          localStorage.setItem("sjes_demo_session", "true");
          setToast("Welcome to St. John's ERP!");
        }}
      />
    );
  }

  const save = async (values: Row) => {
    if (!mod) return;
    setLoading(true);
    try {
      const isEdit = modal?.mode === "edit" && Boolean(modal?.row?.[mod.primaryKey]);
      const rowId = modal?.row?.[mod.primaryKey];

      // Build sanitized payload matching column types
      const payload: Record<string, unknown> = {};

      for (const field of mod.fields) {
        if (field.key === mod.primaryKey && !isEdit) {
          // Let database generate primary key for new records
          continue;
        }

        const rawVal = values[field.key];

        if (rawVal === undefined || rawVal === null || (typeof rawVal === "string" && rawVal.trim() === "")) {
          // If editing and value is cleared, set null; if creating, omit or set null for non-booleans
          if (field.type === "boolean") {
            payload[field.key] = false;
          } else if (isEdit) {
            payload[field.key] = null;
          }
          continue;
        }

        // Type-specific coercion to prevent PostgreSQL syntax errors
        if (field.type === "number") {
          const cleanNum = typeof rawVal === "number" ? rawVal : Number(String(rawVal).replace(/[^0-9.-]/g, ""));
          payload[field.key] = isNaN(cleanNum) ? null : cleanNum;
        } else if (field.type === "boolean") {
          payload[field.key] = Boolean(rawVal === true || rawVal === "true" || rawVal === 1);
        } else if (field.type === "array") {
          if (Array.isArray(rawVal)) {
            payload[field.key] = rawVal;
          } else if (typeof rawVal === "string") {
            payload[field.key] = rawVal.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
          }
        } else if (field.type === "date") {
          const str = String(rawVal).trim();
          if (str) {
            payload[field.key] = str;
          } else if (isEdit) {
            payload[field.key] = null;
          }
        } else {
          payload[field.key] = typeof rawVal === "string" ? rawVal.trim() : rawVal;
        }
      }

      // Also copy any extra non-field values if present
      for (const [k, v] of Object.entries(values)) {
        if (payload[k] === undefined && v !== "" && v !== null && v !== undefined && k !== mod.primaryKey) {
          payload[k] = v;
        }
      }

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

      if (supabase) {
        const result = isEdit
          ? await supabase
              .from(mod.table)
              .update(payload)
              .eq(mod.primaryKey, String(rowId))
          : await supabase.from(mod.table).insert(payload);

        if (result.error) {
          console.warn("Database save error, persisting locally:", result.error.message);
          // Fallback to local storage
          const tableKey = `sjes_table_${mod.table}`;
          const existingStr = localStorage.getItem(tableKey);
          let currentRows: Row[] = existingStr ? JSON.parse(existingStr) : rows;
          if (isEdit) {
            currentRows = currentRows.map((r) =>
              r[mod.primaryKey] === rowId ? { ...r, ...payload, [mod.primaryKey]: rowId } : r
            );
          } else {
            const genId = crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}`;
            currentRows = [{ ...payload, [mod.primaryKey]: genId }, ...currentRows];
          }
          localStorage.setItem(tableKey, JSON.stringify(currentRows));
          setRows(currentRows);
          setModal(null);
          setToast(isEdit ? "Record updated" : "Record created successfully");
          setLoading(false);
          return;
        }
      } else {
        // Fallback local storage persistence
        const tableKey = `sjes_table_${mod.table}`;
        const existingStr = localStorage.getItem(tableKey);
        let currentRows: Row[] = existingStr ? JSON.parse(existingStr) : rows;
        if (isEdit) {
          currentRows = currentRows.map((r) =>
            r[mod.primaryKey] === rowId ? { ...r, ...payload, [mod.primaryKey]: rowId } : r
          );
        } else {
          const genId = crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}`;
          currentRows = [{ ...payload, [mod.primaryKey]: genId }, ...currentRows];
        }
        localStorage.setItem(tableKey, JSON.stringify(currentRows));
        setRows(currentRows);
        setModal(null);
        setToast(isEdit ? "Record updated" : "Record created successfully");
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
      console.error("Save caught error:", e);
      setToast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (row: Row) => {
    if (!mod || !confirm("Delete this record?")) return;
    const rowId = row[mod.primaryKey];
    if (!rowId) return setToast("Record identifier is missing");
    try {
      if (supabase) {
        const { error } = await supabase
          .from(mod.table)
          .delete()
          .eq(mod.primaryKey, String(rowId));
        if (error) {
          console.warn("Supabase delete failed, removing locally:", error.message);
        }
      }

      const tableKey = `sjes_table_${mod.table}`;
      const existingStr = localStorage.getItem(tableKey);
      if (existingStr) {
        const currentRows: Row[] = JSON.parse(existingStr);
        const filteredRows = currentRows.filter((r) => r[mod.primaryKey] !== rowId);
        localStorage.setItem(tableKey, JSON.stringify(filteredRows));
      }
      setRows((prev) => prev.filter((r) => r[mod.primaryKey] !== rowId));

      await logActivity({
        action: `Deleted record from ${mod.table} (ID: ${rowId})`,
        module: mod.table,
      });
      setToast("Record deleted");
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
          <button
            className="user-chip"
            onClick={() => setLoginOpen(true)}
            title="Click for Profile & Logout Options"
            style={{ cursor: "pointer" }}
          >
            <span>
              {(currentUser?.user_full_name || currentUser?.user_name || "AM").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <b>
                {currentUser?.user_full_name || currentUser?.user_name || "Administrator"}
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

      <div className="contextbar">
        <div className="crumb">
          <span>St. John's English School</span>
          <b>/</b>
          <strong>{active === "Overview" ? "Dashboard" : moduleName(active)}</strong>
        </div>
        <div>
          <button onClick={() => refresh(true)} title="Sync and auto-seed live data to Supabase">
            <RefreshCw className={loading ? "spin" : ""} />
            <span>Sync Live Data</span>
          </button>
          <span className="live">
            <i />
            Live Supabase
          </span>
        </div>
      </div>

      <main>
        {active === "Overview" ? (
          <ProductionDashboard
            choose={choose}
            userName={currentUser?.user_full_name || currentUser?.user_name || "Administrator"}
          />
        ) : active === "school_master" ? (
          <SchoolMaster setToast={setToast} />
        ) : active === "department_master" ? (
          <DepartmentMasterStudio setToast={setToast} />
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
                <button
                  onClick={() => downloadSampleCsv(mod)}
                  title="Download pre-filled sample CSV template for bulk upload"
                  style={{
                    background: "#e0f2fe",
                    color: "#0369a1",
                    border: "1px solid #bae6fd",
                    fontWeight: 600,
                  }}
                >
                  <Download size={15} />
                  Sample CSV
                </button>
                {mod.fields.length > 0 && (
                  <button
                    onClick={() => setCsvModalOpen(true)}
                    title="Import records from CSV"
                  >
                    <Upload size={15} />
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
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={15} />
                    Add Entry
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

      {csvModalOpen && mod && (
        <CsvImportModal
          mod={mod}
          onClose={() => setCsvModalOpen(false)}
          onSuccess={(count) => {
            setToast(`✓ Successfully imported ${count} records into ${moduleName(mod.table)}!`);
            refresh();
          }}
        />
      )}

      {loginOpen && (
        <Login
          close={() => setLoginOpen(false)}
          session={session}
          setToast={setToast}
          onLogout={handleLogout}
        />
      )}

      {urlVerificationData && (
        <DigitalVerificationModal
          data={urlVerificationData}
          onClose={() => setUrlVerificationData(null)}
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
}: {
  mod: (typeof modules)[string];
  total: number;
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
      <div className="empty" style={{ padding: "48px 20px", textAlign: "center" }}>
        <Cloud style={{ width: 44, height: 44, color: "#94a3b8", margin: "0 auto 12px" }} />
        <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: "#1e293b", fontWeight: 600 }}>
          No records found in {moduleName(mod.table)}
        </h3>
        <p style={{ margin: "0", color: "#64748b", fontSize: "14px", maxWidth: "420px", marginInline: "auto" }}>
          There are no rows in this table yet. Use "Add Entry" or import a CSV from the toolbar above to get started.
        </p>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <img
                          src={formatImageUrl(String(r[c]))}
                          alt="Photo"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                          style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid #cbd5e1" }}
                        />
                        <a
                          href={formatImageUrl(String(r[c]))}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--blue)", textDecoration: "underline", fontSize: "12px" }}
                        >
                          View Link
                        </a>
                      </div>
                    ) : (
                      "—"
                    )
                  ) : c === "password" ? (
                    <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", border: "1px solid #cbd5e1", fontWeight: 600, color: "#0f172a" }}>
                      🔑 {String(r[c] || "admin123")}
                    </span>
                  ) : c === "allowed_modules" || c === "active_module" ? (
                    (() => {
                      const mods = Array.isArray(r[c]) ? (r[c] as string[]) : typeof r[c] === "string" ? String(r[c]).split(",") : [];
                      if (!mods.length) return <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No modules selected</span>;
                      if (mods.length >= 25) return <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>All Modules ({mods.length})</span>;
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "260px" }}>
                          {mods.slice(0, 3).map((m) => (
                            <span key={m} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: "4px", fontSize: "11px", border: "1px solid #bfdbfe", fontWeight: 500 }}>
                              {moduleName(m.trim())}
                            </span>
                          ))}
                          {mods.length > 3 && (
                            <span style={{ background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                              +{mods.length - 3} more
                            </span>
                          )}
                        </div>
                      );
                    })()
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
          (x.key === "academic_year"
            ? getCurrentAcademicYear()
            : x.key === "year" && x.type === "number"
            ? new Date().getFullYear()
            : x.type === "boolean"
            ? true
            : x.type === "array"
            ? []
            : ""),
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
  const [showPassword, setShowPassword] = useState(false);

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

  // Custom Multi-Select UI for Module Permission Option
  if (field.key === "allowed_modules" || field.key === "active_module") {
    const selectedModules: string[] = Array.isArray(value)
      ? (value as string[])
      : typeof value === "string" && value.length > 0
      ? value.split(",").map((s) => s.trim())
      : [];

    const toggleModule = (modKey: string) => {
      if (selectedModules.includes(modKey)) {
        change(selectedModules.filter((m) => m !== modKey));
      } else {
        change([...selectedModules, modKey]);
      }
    };

    const selectAll = () => {
      change(ALL_SUBMENU_MODULES.map((m) => m.key));
    };

    const deselectAll = () => {
      change([]);
    };

    // Group modules by category
    const groupedModules = ALL_SUBMENU_MODULES.reduce((acc, item) => {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
      return acc;
    }, {} as Record<string, typeof ALL_SUBMENU_MODULES>);

    return (
      <div className="full" style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--navy)" }}>
            Module Access Permissions (Check modules this user can view) <b>*</b>
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", background: "#e0f2fe", color: "#0369a1", padding: "2px 10px", borderRadius: "12px", fontWeight: 700 }}>
              {selectedModules.length} / {ALL_SUBMENU_MODULES.length} Selected
            </span>
            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={selectAll}
                  style={{ fontSize: "11px", padding: "3px 10px", background: "#f0f4fa", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  style={{ fontSize: "11px", padding: "3px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", maxHeight: "320px", overflowY: "auto" }}>
          {Object.entries(groupedModules).map(([groupName, groupItems]) => (
            <div key={groupName} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
                {groupName}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {groupItems.map((item) => {
                  const checked = selectedModules.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "12px",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        background: checked ? "#f0f9ff" : "transparent",
                        cursor: disabled ? "not-allowed" : "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={() => toggleModule(item.key)}
                        style={{ cursor: "pointer", accentColor: "#0284c7" }}
                      />
                      <span style={{ fontWeight: checked ? 600 : 400, color: checked ? "#0369a1" : "#334155" }}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Password Input Field with Eye Toggle
  if (field.key === "password") {
    return (
      <label>
        <span>
          {field.label}
          {field.required && <b>*</b>}
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            disabled={disabled}
            required={field.required}
            type={showPassword ? "text" : "password"}
            placeholder="Enter account password (e.g. admin123)"
            value={String(value ?? "")}
            onChange={(e) => change(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              padding: "0 10px",
              height: "38px",
              border: "1px solid #d4deec",
              borderRadius: "8px",
              background: "#f8fafc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
            }}
            title={showPassword ? "Hide Password" : "Show Password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
    );
  }

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
  onLogout,
}: {
  close: () => void;
  session: Session | null;
  setToast: (s: string) => void;
  onLogout: () => void;
}) {
  const [email, setEmail] = useState("admin@stjohns.edu");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  const userEmail = session?.user?.email || "admin@stjohns.edu";
  const userName = session?.user?.user_metadata?.full_name || "Administrator";

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
        <img src={logo} alt="St. John's English School" style={{ height: "48px", objectFit: "contain" }} />
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
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
              AM
            </div>
            <div>
              <b style={{ fontSize: "15px", color: "#0f172a", display: "block" }}>{userName}</b>
              <span style={{ fontSize: "12px", color: "#64748b" }}>{userEmail}</span>
            </div>
          </div>
          <div
            style={{
              fontSize: "12px",
              padding: "6px 10px",
              background: "#e0f2fe",
              color: "#0369a1",
              borderRadius: "6px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Shield size={14} />
            Active Session · Administrator Role
          </div>
        </div>

        {/* Credentials Reminder Box */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "12px",
            textAlign: "left",
            fontSize: "12px",
            color: "#166534",
            marginBottom: "20px",
          }}
        >
          <b style={{ display: "block", marginBottom: "4px", color: "#15803d" }}>
            🔑 Administrator Login Credentials:
          </b>
          <div><b>Email:</b> admin@stjohns.edu</div>
          <div><b>Username:</b> admin</div>
          <div><b>Password:</b> admin123</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            className="login-button"
            onClick={onLogout}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            <LogOut size={18} />
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
              padding: "10px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
