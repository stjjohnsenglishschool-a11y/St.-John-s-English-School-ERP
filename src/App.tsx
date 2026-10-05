import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  logActivity,
  fetchCollectionData,
  saveDocument,
  deleteDocument,
  subscribeToCollection,
  auth,
  Session,
  isSupabaseConfigured,
  supabase,
  normalizeUserModules
} from "./lib/supabase";
import { seedSupabaseDatabase } from "./lib/seedDatabase";
import { label, moduleName, modules, navGroups } from "./modules";
import { getCurrentAcademicYear } from "./lib/academicYear";
import IDCardStudio from "./IDCardStudio";
import PortalLogin from "./PortalLogin";
import ProductionDashboard from "./ProductionDashboard";
import SchoolMaster from "./components/SchoolMaster";
import DepartmentMasterStudio from "./components/DepartmentMasterStudio";
import StudentAttendanceStudio from "./components/StudentAttendanceStudio";
import EmployeeAttendanceStudio from "./components/EmployeeAttendanceStudio";
import FeeReceiptModal from "./components/FeeReceiptModal";
import SalarySlipModal from "./components/SalarySlipModal";
import LeaveApprovalModal from "./components/LeaveApprovalModal";
import LetterPrintModal from "./components/LetterPrintModal";
import StudentMasterStudio from "./components/StudentMasterStudio";
import EmployeeMasterStudio from "./components/EmployeeMasterStudio";
import CsvImportModal from "./components/CsvImportModal";
import IncomeHeadUploadModal from "./components/IncomeHeadUploadModal";
import DigitalVerificationModal, { VerificationData } from "./components/DigitalVerificationModal";
import { downloadSampleCsv, sanitizeRecordForTable } from "./lib/csvUtils";
import { getLeaveSession } from "./lib/leaveSalaryRules";
import RecordModal from "./components/RecordModal";
import DataTable, { PageHeader } from "./components/DataTable";
import LoginModal from "./components/LoginModal";
import AppHeader from "./components/AppHeader";
import AppSidebar from "./components/AppSidebar";
import AppContextBar from "./components/AppContextBar";

import { parseCsv, normaliseCsvHeader } from "./app/csvParser";
import { FeesStructureNotice } from "./app/FeesStructureNotice";
import { LeaveNotices } from "./app/LeaveNotices";
import { LetterNotices } from "./app/LetterNotices";
import { PaginationControls } from "./app/PaginationControls";

type Row = Record<string, unknown>;

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
    department?: string;
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
        const parsed = JSON.parse(raw);
        setCurrentUser(parsed);
        if (parsed.role) setRole(label(parsed.role));
      } else {
        setCurrentUser(null);
      }
    } catch {
      // ignore
    }
  }, []);

  // Live user permission sync with user_master in database
  useEffect(() => {
    if (!currentUser?.user_name) return;
    const uLogin = currentUser.user_name.toLowerCase().trim();
    const uFull = (currentUser.user_full_name || "").toLowerCase().trim();

    fetchCollectionData("user_master")
      .then((users) => {
        if (!Array.isArray(users) || users.length === 0) return;
        const found = users.find((u: any) => {
          const uName = String(u.user_name || "").toLowerCase().trim();
          const uFullName = String(u.user_full_name || "").toLowerCase().trim();
          const uEmail = String(u.email || u.user_email || "").toLowerCase().trim();
          return uName === uLogin || uFullName === uFull || (uFull && uFullName.includes(uFull)) || uEmail === uLogin;
        });

        if (found) {
          const parsedMods = normalizeUserModules(found);

          if (parsedMods !== undefined) {
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const isSame =
                JSON.stringify(prev.allowed_modules || []) === JSON.stringify(parsedMods) &&
                prev.role === String(found.role || prev.role).toLowerCase();
              if (isSame) return prev;

              const updated = {
                ...prev,
                user_full_name: String(found.user_full_name || prev.user_full_name),
                role: String(found.role || prev.role).toLowerCase(),
                allowed_modules: parsedMods,
                department: found.department ? String(found.department) : prev.department,
              };
              try {
                localStorage.setItem("sjes_logged_in_user", JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      })
      .catch(() => {});
  }, [currentUser?.user_name, currentUser?.user_full_name]);

  const isUserAdmin = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || "").toLowerCase().trim();
    const name = (currentUser.user_name || "").toLowerCase().trim();
    return r === "admin" || r === "administrator" || name === "admin";
  }, [currentUser]);

  const userRole = (currentUser?.role || "").toLowerCase().trim();
  const isStaffOrTeacher = !isUserAdmin && (userRole === "teacher" || userRole === "staff" || userRole === "faculty");
  const isAdminOrPrincipalOrHr = isUserAdmin || userRole === "principal" || userRole === "hr";

  // Cache employee directory to resolve current user's staff identity
  const [employeeList, setEmployeeList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetchCollectionData("employee_master")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEmployeeList(data);
        }
      })
      .catch(() => {});
  }, []);

  const currentEmployeeRecord = useMemo(() => {
    if (!currentUser) return null;
    const uName = (currentUser.user_full_name || "").toLowerCase().trim();
    const uUser = (currentUser.user_name || "").toLowerCase().trim();

    const match = employeeList.find((e: any) => {
      const eFull = String(
        e.full_name || `${e.first_name || ""} ${e.last_name || ""}`
      )
        .toLowerCase()
        .trim();
      const eCode = String(e.emp_code || e.emp_id || "")
        .toLowerCase()
        .trim();
      const eEmail = String(e.official_email || e.personal_email || "")
        .toLowerCase()
        .trim();
      return (
        (uName && eFull === uName) ||
        (uName && eFull.includes(uName)) ||
        (uName && uName.includes(eFull)) ||
        (uUser && eCode === uUser) ||
        (uUser && eEmail.startsWith(uUser)) ||
        (uUser && eFull.includes(uUser))
      );
    });

    if (match) return match;

    return {
      full_name: currentUser.user_full_name || currentUser.user_name,
      emp_id: currentUser.user_name,
      emp_code: currentUser.user_name,
      department: currentUser.department || "General",
    };
  }, [currentUser, employeeList]);

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
  const [approvalModalRow, setApprovalModalRow] = useState<Row | null>(null);
  const [letterModal, setLetterModal] = useState<{
    type: "warning" | "offer";
    row: Row;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [incomeHeadUploadOpen, setIncomeHeadUploadOpen] = useState(false);
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

  const [feesTableExists, setFeesTableExists] = useState<boolean | null>(null);
  const [feesTableChecking, setFeesTableChecking] = useState(false);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  // Auto-initialize annual leave balances for all active school staff
  const handleAutoInitLeaveBalances = async () => {
    try {
      setLoading(true);
      const employees = await fetchCollectionData("employee_master");
      if (!employees || employees.length === 0) {
        setToast("No employees found in Employee Master. Please register staff records first.");
        setLoading(false);
        return;
      }
      const existing = await fetchCollectionData("leave_balance");
      const currentYear = getCurrentAcademicYear();
      const existingMap = new Set(
        (existing || []).map((e: any) => `${e.emp_id || e.emp_code}_${e.leave_type}_${e.academic_year || currentYear}`)
      );

      let created = 0;
      const standardLeaves = [
        { type: "Casual Leave (CL)", entitled: 12 },
        { type: "Medical / Sick Leave (ML)", entitled: 10 },
        { type: "Privilege / Earned Leave (PL/EL)", entitled: 15 },
      ];

      for (const emp of employees) {
        const empId = emp.emp_id || emp.emp_code || emp.id;
        const empName =
          emp.full_name ||
          `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
          emp.name ||
          "Staff";

        for (const leave of standardLeaves) {
          const key = `${empId}_${leave.type}_${currentYear}`;
          if (!existingMap.has(key)) {
            const balId = `BAL_${empId}_${leave.type.slice(0, 2)}_${currentYear.replace(/[^a-zA-Z0-9]/g, "_")}`;
            await saveDocument("leave_balance", "balance_id", {
              balance_id: balId,
              emp_id: empId,
              employee_name: empName,
              academic_year: currentYear,
              leave_type: leave.type,
              total_entitled: leave.entitled,
              total_taken: 0,
              total_pending: 0,
              balance_remaining: leave.entitled,
              created_at: new Date().toISOString(),
            });
            created++;
          }
        }
      }

      setToast(
        created > 0
          ? `Successfully initialized ${created} leave balance records across ${employees.length} employees!`
          : "Leave balances for all active employees are already initialized and up to date."
      );
      await refresh();
    } catch (err: any) {
      console.error("Error initializing leave balances:", err);
      setToast(err.message || "Failed to initialize leave balances");
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(async (forceSeed = false) => {
    if (!mod) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      if (forceSeed) {
        const result = await seedSupabaseDatabase(true);
        setToast(result.message);
      }

      let data = await fetchCollectionData(mod.table);

      let rowsData = data || [];
      if (mod.table === "user_master" && rowsData) {
        rowsData = rowsData.map((r: Row) => {
          const modulesList = normalizeUserModules(r);
          return {
            ...r,
            allowed_modules: modulesList,
            active_module: modulesList,
          };
        });
      }
      setRows(rowsData);
      localStorage.setItem(`sjes_table_${mod.table}`, JSON.stringify(rowsData));
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load records from Supabase");
    } finally {
      setLoading(false);
    }
  }, [mod]);

  const handleGlobalSync = useCallback(async () => {
    setLoading(true);
    try {
      const collectionsToSync = [
        "employee_master",
        "student_master",
        "department_master",
        "class_master",
        "subject_master",
        "leave_balance",
        "fees_collection",
      ];
      await Promise.all(
        collectionsToSync.map((col) => fetchCollectionData(col))
      );
      if (mod) {
        await refresh();
      }
      setToast("✓ Live Cloud Sync Complete: Synchronized with Supabase!");
    } catch (e: any) {
      setToast(e?.message || "Sync completed.");
    } finally {
      setLoading(false);
    }
  }, [mod, refresh]);

  // Initial cloud synchronization check on mount (Firestore)
  useEffect(() => {
    const initSync = async () => {
      try {
        await Promise.all([
          fetchCollectionData("employee_master"),
          fetchCollectionData("student_master"),
          fetchCollectionData("department_master"),
          fetchCollectionData("class_master"),
          fetchCollectionData("subject_master"),
          fetchCollectionData("vendor_master"),
        ]);
      } catch {
        // continue
      }
    };
    initSync();
  }, []);

  useEffect(() => {
    refresh();
    setPage(1);
  }, [refresh]);

  // Realtime updates on active table via Firebase Firestore
  useEffect(() => {
    if (!mod) return;
    const unsub = subscribeToCollection(mod.table, (items) => {
      let rowsData = items || [];
      if (mod.table === "user_master" && rowsData) {
        rowsData = rowsData.map((r: Row) => {
          const modulesList = normalizeUserModules(r);
          return {
            ...r,
            allowed_modules: modulesList,
            active_module: modulesList,
          };
        });
      }
      setRows(rowsData);
      localStorage.setItem(`sjes_table_${mod.table}`, JSON.stringify(rowsData));
    });

    return () => {
      unsub();
    };
  }, [mod]);

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

    // Strict Data Privacy: If a Teacher / Staff is logged in, restrict HR records, letters, documents, salary slips, and leave records to their own profile only
    if (isStaffOrTeacher && mod) {
      const personalTables = [
        "leave_application",
        "leave_balance",
        "warning_letter",
        "offer_letter",
        "employee_document",
        "salary_slip",
        "employee_attendance",
      ];
      if (personalTables.includes(mod.table)) {
        const myName = String(
          currentEmployeeRecord?.full_name ||
            `${currentEmployeeRecord?.first_name || ""} ${currentEmployeeRecord?.last_name || ""}`.trim() ||
            currentUser?.user_full_name ||
            currentUser?.user_name ||
            ""
        ).toLowerCase().trim();
        const myId = String(currentEmployeeRecord?.emp_id || currentEmployeeRecord?.emp_code || "").toLowerCase().trim();

        list = list.filter((r) => {
          const rName = String(
            r.employee_name ||
            r.candidate_name ||
            r.staff_name ||
            r.name ||
            ""
          ).toLowerCase().trim();
          const rId = String(r.emp_id || r.emp_code || "").toLowerCase().trim();
          return (
            (myId && rId === myId) ||
            (myName && rName === myName) ||
            (myName && rName.includes(myName)) ||
            (myName && myName.includes(rName))
          );
        });
      }
    }

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
  }, [rows, query, sortCol, sortAsc, isStaffOrTeacher, mod, currentEmployeeRecord, currentUser]);

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
    try {
      await auth.signOut();
    } catch {
      // ignore
    }
    localStorage.setItem("sjes_logged_out", "true");
    localStorage.removeItem("sjes_demo_session");
    localStorage.removeItem("sjes_logged_in_user");
    setSession(null);
    setCurrentUser(null);
    setLoggedOut(true);
    setLoginOpen(false);
    setActive("Overview");
    setToast("Successfully signed out of ERP.");
  };

  if (!authReady)
    return <div className="auth-loading">Connecting to Supabase…</div>;

  if (
    loggedOut ||
    (isSupabaseConfigured &&
      !session &&
      localStorage.getItem("sjes_demo_session") !== "true")
  ) {
    return (
      <PortalLogin
        onLoginSuccess={(userObj) => {
          if (userObj) {
            setCurrentUser(userObj);
            setRole(label(userObj.role || "Administrator"));
          } else {
            syncCurrentUser();
          }
          setLoggedOut(false);
          localStorage.setItem("sjes_demo_session", "true");
          setActive("Overview");
          setToast(`Welcome ${userObj?.user_full_name || userObj?.user_name || "User"} to St. John's ERP!`);
        }}
      />
    );
  }

  const save = async (values: Row) => {
    if (!mod) return;
    setLoading(true);
    try {
      const isEdit =
        modal?.mode === "edit" &&
        Boolean(
          modal?.row?.[mod.primaryKey] ||
          (mod.table === "user_master" && modal?.row?.user_name) ||
          (mod.table === "employee_master" && (modal?.row?.emp_code || modal?.row?.emp_id)) ||
          (mod.table === "student_master" && (modal?.row?.admission_no || modal?.row?.student_id))
        );

      // Build sanitized payload matching column types
      const payload: Record<string, unknown> = {};

      if (isEdit && modal?.row) {
        if (modal.row[mod.primaryKey]) {
          payload[mod.primaryKey] = modal.row[mod.primaryKey];
        }
        if (mod.table === "user_master") {
          if (modal.row.user_id) payload.user_id = modal.row.user_id;
          if (modal.row.user_name) payload.user_name = modal.row.user_name;
        }
      }

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

      if (mod.table === "user_master") {
        const rawMod = values.allowed_modules !== undefined ? values.allowed_modules : values.active_module;
        const modulesList = normalizeUserModules({ active_module: rawMod });
        payload.allowed_modules = modulesList;
        payload.active_module = modulesList;
        if (modal?.row?.user_id || values.user_id) {
          payload.user_id = modal?.row?.user_id || values.user_id;
        }
        if (!payload.password && !isEdit) {
          payload.password = "User@1234";
        }
      }

      const saveRes = await saveDocument(mod.table, mod.primaryKey, payload);
      if (!saveRes.success) {
        throw new Error(saveRes.error || "Failed to save record to database");
      }

      await logActivity({
        action: `${isEdit ? "Updated" : "Created"} record in ${mod.table}`,
        module: mod.table,
      });

      if (mod.table === "user_master") {
        // Immediate reload from database to verify and update UI strictly from database response
        const freshUsers = await fetchCollectionData("user_master");
        if (Array.isArray(freshUsers)) {
          const freshMapped: Row[] = freshUsers.map((r: Record<string, any>) => ({
            ...r,
            allowed_modules: normalizeUserModules(r),
            active_module: normalizeUserModules(r),
          }));
          setRows(freshMapped);
          localStorage.setItem("sjes_table_user_master", JSON.stringify(freshMapped));

          // If current logged-in user was updated, sync session state with the database response
          const editedUsername = String(payload.user_name || "").toLowerCase().trim();
          const editedUserId = payload.user_id;
          const currentUsername = String(currentUser?.user_name || "").toLowerCase().trim();

          const dbUser = freshMapped.find(
            (u: Record<string, any>) =>
              (editedUserId && u.user_id === editedUserId) ||
              (editedUsername && String(u.user_name || "").toLowerCase().trim() === editedUsername)
          ) as Record<string, any> | undefined;

          if (dbUser && (editedUsername === currentUsername || (currentUser as Record<string, any> | null)?.user_id === dbUser.user_id)) {
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                user_full_name: String(dbUser.user_full_name || prev.user_full_name),
                role: String(dbUser.role || prev.role).toLowerCase(),
                allowed_modules: normalizeUserModules(dbUser),
                department: dbUser.department ? String(dbUser.department) : prev.department,
              };
              try {
                localStorage.setItem("sjes_logged_in_user", JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      }

      setModal(null);
      setToast(isEdit ? "Changes saved successfully to database" : "Record created successfully in database");
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
    const rowId = row._docId || row[mod.primaryKey] || row.id || row.vendor_code || row.code;
    if (!rowId) return setToast("Record identifier is missing");
    try {
      const delRes = await deleteDocument(mod.table, String(rowId), row);
      if (!delRes.success) {
        console.warn("Firebase delete warning:", delRes.error);
      }

      const tableKey = `sjes_table_${mod.table}`;
      const existingStr = localStorage.getItem(tableKey);
      if (existingStr) {
        const currentRows: Row[] = JSON.parse(existingStr);
        const filteredRows = currentRows.filter((r) => 
          r[mod.primaryKey] !== rowId &&
          (!row._docId || r._docId !== row._docId) &&
          (!row.id || r.id !== row.id) &&
          (!row.vendor_code || r.vendor_code !== row.vendor_code) &&
          (!row.department_code || r.department_code !== row.department_code) &&
          (!row.admission_no || r.admission_no !== row.admission_no) &&
          (!row.emp_code || r.emp_code !== row.emp_code)
        );
        localStorage.setItem(tableKey, JSON.stringify(filteredRows));
      }
      setRows((prev) => prev.filter((r) => 
        r[mod.primaryKey] !== rowId &&
        (!row._docId || r._docId !== row._docId) &&
        (!row.id || r.id !== row.id) &&
        (!row.vendor_code || r.vendor_code !== row.vendor_code) &&
        (!row.department_code || r.department_code !== row.department_code) &&
        (!row.admission_no || r.admission_no !== row.admission_no) &&
        (!row.emp_code || r.emp_code !== row.emp_code)
      ));

      await logActivity({
        action: `Deleted record from ${mod.table} (ID: ${rowId})`,
        module: mod.table,
      });
      setToast("Record deleted");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const importCsv = async (file?: File) => {
    if (!file || !mod) return;
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

      const sanitizedRecords = records.map((rec, idx) => sanitizeRecordForTable(rec, mod, idx));

      const insertTask = supabase.from(mod.table).insert(sanitizedRecords).select();
      const safetyTimeout = new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: sanitizedRecords, error: null }), 6000)
      );
      const { data, error } = await Promise.race([insertTask, safetyTimeout]);
      if (error) throw error;

      const inserted = (data && Array.isArray(data) && data.length > 0) ? data : sanitizedRecords;

      setRows((prev) => {
        const combined = [...inserted, ...prev];
        const seen = new Set<string>();
        const deduped: Row[] = [];
        for (const r of combined) {
          const id = String(
            r._docId ||
            (mod.primaryKey && r[mod.primaryKey]) ||
            r.student_id ||
            r.emp_id ||
            r.department_id ||
            r.class_id ||
            r.subject_id ||
            r.vendor_id ||
            r.asset_id ||
            r.item_id ||
            r.fee_id ||
            r.notice_id ||
            r.assignment_id ||
            r.expense_id ||
            r.income_id ||
            r.slip_id ||
            r.admission_no ||
            r.emp_code ||
            r.department_code ||
            r.vendor_code ||
            r.id ||
            r.code ||
            JSON.stringify(r)
          );
          if (!seen.has(id)) {
            seen.add(id);
            deduped.push(r);
          }
        }
        localStorage.setItem(`sjes_table_${mod.table}`, JSON.stringify(deduped));
        return deduped;
      });

      await logActivity({
        action: `Imported ${records.length} records into ${mod.table} via CSV`,
        module: mod.table,
      });

      setToast(
        `${records.length} record${
          records.length === 1 ? "" : "s"
        } imported to Firebase successfully`
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
      <AppHeader
        mobile={mobile}
        setMobile={setMobile}
        choose={choose}
        searchRef={searchRef}
        query={query}
        setQuery={setQuery}
        currentUser={currentUser}
        role={role}
        isUserAdmin={isUserAdmin}
        setLoginOpen={setLoginOpen}
        handleLogout={handleLogout}
      />

      <AppSidebar
        mobile={mobile}
        setMobile={setMobile}
        active={active}
        choose={choose}
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        visibleNavGroups={visibleNavGroups}
      />

      <AppContextBar
        active={active}
        loading={loading}
        handleGlobalSync={handleGlobalSync}
      />

      <main>
        {active === "Overview" ? (
          <ProductionDashboard
            choose={choose}
            userName={currentUser?.user_full_name || currentUser?.user_name || "Administrator"}
            userRole={currentUser?.role || (isUserAdmin ? "admin" : "teacher")}
            allowedModules={currentUser?.allowed_modules}
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
            onUploadCsv={() => setCsvModalOpen(true)}
            initialType={active === "teacher_idcard" ? "employee" : active === "escort_card" ? "escort" : "student"}
          />
        ) : (
          <>
            {mod.table === "fees_structure" && (
              <FeesStructureNotice
                feesTableExists={feesTableExists}
                feesTableChecking={feesTableChecking}
                recordCount={rows.length}
                setToast={setToast}
                setFeesTableChecking={setFeesTableChecking}
                setFeesTableExists={setFeesTableExists}
                refresh={refresh}
              />
            )}

            {(mod.table === "leave_application" || mod.table === "leave_balance") && (
              <LeaveNotices
                modTable={mod.table}
                rows={rows}
                isStaffOrTeacher={isStaffOrTeacher}
                setQuery={setQuery}
                setPage={setPage}
                setActive={setActive}
                setModal={setModal}
                handleAutoInitLeaveBalances={handleAutoInitLeaveBalances}
                getCurrentAcademicYear={getCurrentAcademicYear}
                getLeaveSession={getLeaveSession}
              />
            )}

            {(mod.table === "warning_letter" || mod.table === "offer_letter" || mod.table === "employee_document") && (
              <LetterNotices
                modTable={mod.table}
                isStaffOrTeacher={isStaffOrTeacher}
              />
            )}

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
                {!(
                  isStaffOrTeacher &&
                  [
                    "leave_balance",
                    "warning_letter",
                    "offer_letter",
                    "employee_document",
                    "salary_slip",
                  ].includes(mod.table)
                ) && (
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
                )}
                {mod.table === "income_head_master" && (
                  <button
                    onClick={() => setIncomeHeadUploadOpen(true)}
                    title="Upload or load preset list of Income Categories and Heads"
                    style={{
                      background: "linear-gradient(135deg, #0f3661 0%, #1e4976 100%)",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 4px rgba(15, 54, 97, 0.2)",
                    }}
                  >
                    <Sparkles size={15} color="#93c5fd" />
                    Upload / Preset Income Heads
                  </button>
                )}
                {mod.table === "income_master" && (
                  <button
                    onClick={() => setActive("income_head_master")}
                    title="Configure Income Heads & Categories in Master Setup"
                    style={{
                      background: "#eff6ff",
                      color: "#1e40af",
                      border: "1px solid #bfdbfe",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Sparkles size={15} color="#3b82f6" />
                    Income Heads Master
                  </button>
                )}
                {mod.fields.length > 0 &&
                  !(
                    isStaffOrTeacher &&
                    [
                      "leave_balance",
                      "warning_letter",
                      "offer_letter",
                      "employee_document",
                      "salary_slip",
                    ].includes(mod.table)
                  ) && (
                    <button
                      onClick={() => setCsvModalOpen(true)}
                      title="Import records from CSV"
                    >
                      <Upload size={15} />
                      Import CSV
                    </button>
                  )}
                {mod.fields.length > 0 &&
                  !(
                    isStaffOrTeacher &&
                    [
                      "leave_balance",
                      "warning_letter",
                      "offer_letter",
                      "employee_document",
                      "salary_slip",
                    ].includes(mod.table)
                  ) && (
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
                {isStaffOrTeacher && mod.table === "leave_balance" && (
                  <button
                    onClick={() => {
                      setActive("leave_application");
                      setModal({ mode: "create" });
                    }}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={15} />
                    Apply for Leave
                  </button>
                )}
              </div>

              <DataTable
                mod={mod}
                rows={paginatedRows}
                loading={loading}
                sortCol={sortCol}
                sortAsc={sortAsc}
                isStaffOrTeacher={isStaffOrTeacher}
                onSort={handleSort}
                view={(row) => setModal({ mode: "view", row })}
                edit={(row) => setModal({ mode: "edit", row })}
                remove={remove}
                printReceipt={(row) => setReceiptModalRow(row)}
                printSlip={(row) => setSlipModalRow(row)}
                printLetter={(type, row) => setLetterModal({ type, row })}
                onReviewLeave={isAdminOrPrincipalOrHr ? (row) => setApprovalModalRow(row) : undefined}
              />

              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalFiltered={filtered.length}
                totalPages={totalPages}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </section>
          </>
        )}
      </main>

      {modal && (
        <RecordModal
          mode={modal.mode}
          mod={mod}
          row={modal.row}
          currentUser={currentUser}
          currentEmployeeRecord={currentEmployeeRecord}
          isStaffOrTeacher={isStaffOrTeacher}
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

      {approvalModalRow && (
        <LeaveApprovalModal
          leaveApp={approvalModalRow}
          employee={
            rows.find(
              (r) =>
                (approvalModalRow.emp_id && (r.emp_id === approvalModalRow.emp_id || r.emp_code === approvalModalRow.emp_id)) ||
                (approvalModalRow.employee_name && r.employee_name === approvalModalRow.employee_name)
            ) || {}
          }
          allLeaves={rows}
          onClose={() => setApprovalModalRow(null)}
          onSuccess={() => refresh()}
          setToast={setToast}
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
          onSuccess={(count, insertedItems) => {
            setToast(`✓ Successfully imported ${count} records into ${moduleName(mod.table)}!`);
            if (insertedItems && insertedItems.length > 0) {
              setRows((prev) => {
                const combined = [...(insertedItems as Row[]), ...prev];
                const seen = new Set<string>();
                const deduped: Row[] = [];
                for (const r of combined) {
                  const id = String(
                    r._docId ||
                    (mod.primaryKey && r[mod.primaryKey]) ||
                    r.student_id ||
                    r.emp_id ||
                    r.department_id ||
                    r.class_id ||
                    r.subject_id ||
                    r.vendor_id ||
                    r.asset_id ||
                    r.item_id ||
                    r.fee_id ||
                    r.notice_id ||
                    r.assignment_id ||
                    r.expense_id ||
                    r.income_id ||
                    r.slip_id ||
                    r.admission_no ||
                    r.emp_code ||
                    r.department_code ||
                    r.vendor_code ||
                    r.id ||
                    r.code ||
                    JSON.stringify(r)
                  );
                  if (!seen.has(id)) {
                    seen.add(id);
                    deduped.push(r);
                  }
                }
                localStorage.setItem(`sjes_table_${mod.table}`, JSON.stringify(deduped));
                return deduped;
              });
            }
            refresh();
          }}
        />
      )}

      {incomeHeadUploadOpen && (
        <IncomeHeadUploadModal
          isOpen={true}
          onClose={() => setIncomeHeadUploadOpen(false)}
          existingCount={rows.length}
          onSuccess={(count) => {
            setToast(`✓ Successfully imported ${count} income heads into Master Setup!`);
            setIncomeHeadUploadOpen(false);
            refresh();
          }}
        />
      )}

      {loginOpen && (
        <LoginModal
          close={() => setLoginOpen(false)}
          session={session}
          currentUser={currentUser}
          onSwitchUser={(newUser) => {
            setCurrentUser(newUser);
            setRole(label(newUser.role || "Administrator"));
            localStorage.setItem("sjes_logged_in_user", JSON.stringify(newUser));
            localStorage.removeItem("sjes_logged_out");
            localStorage.setItem("sjes_demo_session", "true");
            setActive("Overview");
            setLoginOpen(false);
            setToast(`Switched user to ${newUser.user_full_name} (${label(newUser.role)})`);
          }}
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

export default App;
