import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronDown,
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
  Mail,
  Menu,
  MessageCircle,
  MoreHorizontal,
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
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { Field, label, moduleName, modules, navGroups } from "./modules";
import IDCardStudio from "./IDCardStudio";
import PortalLogin from "./PortalLogin";
import ProductionDashboard from "./ProductionDashboard";
type Row = Record<string, unknown>;
const logo =
  "https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg";
const demo: Record<string, Row[]> = {
  student_master: [
    {
      student_id: "1",
      admission_no: "SJES-0412",
      roll_no: "12",
      full_name: "Aarav Sharma",
      academic_year: "2026-27",
      mobile_primary: "9674368297",
      is_active: true,
    },
  ],
  employee_master: [
    {
      emp_id: "1",
      emp_code: "EMP-001",
      first_name: "Ananya",
      last_name: "Sen",
      designation: "Principal",
      employment_status: "Active",
      is_active: true,
    },
  ],
  fees_collection: [
    {
      fee_id: "1",
      receipt_number: "RCPT-260812",
      student_name: "Aarav Sharma",
      amount_due: 2450,
      amount_paid: 2450,
      payment_mode: "UPI",
      status: "paid",
    },
  ],
  student_attendance: [
    {
      attendance_id: "1",
      student_name: "Aarav Sharma",
      attendance_date: "2026-08-19",
      status: "present",
    },
  ],
};
function loadDemo(table: string) {
  try {
    return (
      JSON.parse(localStorage.getItem(`sjes:${table}`) || "null") ||
      demo[table] ||
      []
    );
  } catch {
    return demo[table] || [];
  }
}
function NavGroupIcon({ name }: { name: string }) {
  switch (name) {
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
    default:
      return <Activity />;
  }
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}
const normaliseCsvHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
function App() {
  const [active, setActive] = useState("Overview"),
    [navOpen, setNavOpen] = useState(""),
    [mobile, setMobile] = useState(false),
    [session, setSession] = useState<Session | null>(null),
    [loginOpen, setLoginOpen] = useState(false),
    [role, setRole] = useState("Administrator"),
    [query, setQuery] = useState(""),
    [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(false),
    [modal, setModal] = useState<{
      mode: "create" | "edit" | "view";
      row?: Row;
    } | null>(null),
    [toast, setToast] = useState("");
  const [authReady, setAuthReady] = useState(false);
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
    if (!mod) return;
    setLoading(true);
    if (session && supabase) {
      const req = supabase.from(mod.table).select("*").limit(200);
      const { data, error } = await req;
      if (error) setToast(error.message);
      setRows(data || []);
    } else setRows(loadDemo(mod.table));
    setLoading(false);
  }, [mod, session]);
  useEffect(() => {
    refresh();
  }, [refresh]);
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
        : navGroups.find((group) => group.items.includes(name))?.label || "",
    );
    setMobile(false);
    setQuery("");
  };
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
      ),
    [rows, query],
  );
  if (isSupabaseConfigured && !authReady)
    return <div className="auth-loading">Loading secure portal…</div>;
  if (isSupabaseConfigured && !session) return <PortalLogin />;
  const save = async (values: Row) => {
    if (!mod) return;
    setLoading(true);
    if (session && supabase) {
      const payload: Row = Object.fromEntries(
        Object.entries(values)
          .filter(([, value]) => modal?.mode === "edit" || value !== "")
          .map(([key, value]) => [
            key,
            modal?.mode === "edit" && value === "" ? null : value,
          ]),
      );
      if (mod.table === "user_master" && modal?.mode !== "edit")
        payload.password = "SUPABASE_AUTH";
      const rowId = modal?.row?.[mod.primaryKey];
      const result =
        modal?.mode === "edit" && rowId
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
    } else {
      const list = loadDemo(mod.table);
      const rowId = modal?.row?.[mod.primaryKey];
      const next =
        modal?.mode === "edit" && rowId
          ? list.map((r: Row) =>
              r[mod.primaryKey] === rowId ? { ...r, ...values } : r,
            )
          : [
              { [mod.primaryKey]: crypto.randomUUID(), ...values },
              ...list,
            ];
      localStorage.setItem(`sjes:${mod.table}`, JSON.stringify(next));
    }
    setModal(null);
    setToast(modal?.mode === "edit" ? "Record updated" : "Record created");
    await refresh();
  };
  const remove = async (row: Row) => {
    if (!mod || !confirm("Delete this record? This cannot be undone.")) return;
    const rowId = row[mod.primaryKey];
    if (!rowId) return setToast("Record identifier is missing");
    if (session && supabase) {
      const { error } = await supabase
        .from(mod.table)
        .delete()
        .eq(mod.primaryKey, String(rowId));
      if (error) {
        setToast(error.message);
        return;
      }
    } else {
      localStorage.setItem(
        `sjes:${mod.table}`,
        JSON.stringify(
          loadDemo(mod.table).filter(
            (r: Row) => r[mod.primaryKey] !== rowId,
          ),
        ),
      );
    }
    setToast("Record deleted");
    refresh();
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
            .join('""'),
        ),
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
    if (!file || !mod) return;
    setLoading(true);
    try {
      const [headers, ...sourceRows] = parseCsv(await file.text());
      if (!headers || !sourceRows.length) throw new Error("Use a CSV file with a header row and at least one record.");
      const validKeys = new Map<string, string>();
      [...mod.fields.map((field) => [field.key, field.label] as const), ...mod.columns.map((column) => [column, label(column)] as const)].forEach(([key, name]) => {
        validKeys.set(normaliseCsvHeader(key), key); validKeys.set(normaliseCsvHeader(name), key);
      });
      const mappedHeaders = headers.map((header) => validKeys.get(normaliseCsvHeader(header)) || "");
      if (!mappedHeaders.some(Boolean)) throw new Error("The CSV headers do not match this module. Export a CSV first to use its column names.");
      const records = sourceRows.map((source) => {
        const record: Row = {};
        source.forEach((value, index) => {
          const key = mappedHeaders[index]; if (!key || value === "") return;
          const field = mod.fields.find((item) => item.key === key);
          record[key] = field?.type === "boolean" ? ["true", "yes", "1"].includes(value.toLowerCase()) : field?.type === "number" ? Number(value) : field?.type === "array" ? value.split(";").map((item) => item.trim()).filter(Boolean) : value;
        }); return record;
      }).filter((record) => Object.keys(record).length);
      if (!records.length) throw new Error("No usable records were found in this CSV.");
      if (session && supabase) { const { error } = await supabase.from(mod.table).insert(records); if (error) throw error; }
      else localStorage.setItem(`sjes:${mod.table}`, JSON.stringify([...records, ...loadDemo(mod.table)]));
      setToast(`${records.length} record${records.length === 1 ? "" : "s"} uploaded successfully`);
      await refresh();
    } catch (error) { setToast(error instanceof Error ? error.message : "CSV upload failed"); }
    finally { setLoading(false); }
  };
  return (
    <div className="app">
      <input className="csv-upload-input" ref={csvImportRef} type="file" accept=".csv,text/csv" onChange={(event) => { void importCsv(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <header className="masthead">
        <button className="mobile-trigger" onClick={() => setMobile(!mobile)} aria-label="Open navigation">
          <Menu />
        </button>
        <div className="identity">
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
            placeholder="Search the current workspace..."
          />
          <kbd>Ctrl K</kbd>
        </div>
        <div className="head-actions">
          <a href="https://wa.me/919674368297" aria-label="Contact school on WhatsApp" title="WhatsApp">
            <MessageCircle />
          </a>
          <button aria-label="Notifications" title="Notifications">
            <Bell />
            <i />
          </button>
          <button className="user-chip" onClick={() => setLoginOpen(true)}>
            <span>
              {session ? session.user.email?.slice(0, 2).toUpperCase() : "AM"}
            </span>
            <div>
              <b>{session?.user.user_metadata.full_name || "School Administrator"}</b>
              <small>{role}</small>
            </div>
            <ChevronDown />
          </button>
        </div>
      </header>
      {mobile && <button className="sidebar-backdrop" onClick={() => setMobile(false)} aria-label="Close navigation" />}
      <nav className={mobile ? "sidebar show" : "sidebar"} aria-label="ERP navigation">
        <div className="sidebar-heading">
          <span>MAIN MENU</span>
          <button onClick={() => setMobile(false)} aria-label="Close navigation"><X /></button>
        </div>
        <div className="sidebar-menu">
          <button
            className={`sidebar-link ${active === "Overview" ? "active" : ""}`}
            onClick={() => choose("Overview")}
          >
            <span className="sidebar-icon"><LayoutDashboard /></span>
            <span>Overview</span>
          </button>
          {navGroups.slice(1).map((g) => {
            const open = navOpen === g.label;
            const groupActive = g.items.includes(active);
            return <div className={`side-group ${open ? "open" : ""}`} data-group={g.label} key={g.label}>
              <button
                className={`side-group-button ${groupActive ? "active" : ""}`}
                onClick={() => setNavOpen(open ? "" : g.label)}
                aria-expanded={open}
              >
                <span className="sidebar-icon"><NavGroupIcon name={g.label} /></span>
                <span>{g.label}</span>
                <ChevronDown className="side-chevron" />
              </button>
              {open && <div className="side-submenu">
                {g.items.map((item) => (
                  <button className={active === item ? "active" : ""} key={item} onClick={() => choose(item)}>
                    <i />
                    <span>{moduleName(item)}</span>
                  </button>
                ))}
              </div>}
            </div>;
          })}
        </div>
        <button className="sidebar-help" onClick={() => window.open("https://wa.me/919674368297", "_blank")}>
          <CircleHelp />
          <span><b>Need help?</b><small>Contact school support</small></span>
        </button>
      </nav>
      <div className="contextbar">
        <div className="crumb">
          <span>St. John's ERP</span>
          <b>/</b>
          <strong>{active === "Overview" ? active : moduleName(active)}</strong>
        </div>
        <div>
          <span className={isSupabaseConfigured ? "live" : "preview"}>
            <i />
            {isSupabaseConfigured ? "Supabase connected" : "Preview mode"}
          </span>
          <button>
            <CalendarDays />
            2026–27
            <ChevronDown />
          </button>
        </div>
      </div>
      <main>
        {active === "Overview" ? (
          <ProductionDashboard choose={choose} />
        ) : active === "student_idcard" ? (
          <>
            <PageHeader
              mod={mod}
              total={rows.length}
              onAdd={() => {}}
              canAdd={false}
            />
            <IDCardStudio setToast={setToast} onUploadCsv={() => csvImportRef.current?.click()} />
          </>
        ) : (
          <>
            <PageHeader
              mod={mod}
              total={rows.length}
              onAdd={() => setModal({ mode: "create" })}
              canAdd={Boolean(mod?.fields.length)}
            />
            <div className="stats-strip">
              <Stat
                label="Total records"
                value={String(rows.length)}
                change="Live"
                tone="amber"
                icon={<FileBarChart />}
              />
              <Stat
                label="Visible results"
                value={String(filtered.length)}
                change="Filtered"
                tone="green"
                icon={<Search />}
              />
              <Stat
                label="Data source"
                value={session ? "Supabase" : "Preview"}
                change={session ? "Synced" : "Local"}
                tone="blue"
                icon={<Cloud />}
              />
              <Stat label="Last refresh" value="Just now" change="Current" tone="violet" icon={<RefreshCw />} />
            </div>
            <section className="data-card">
              <div className="toolbar">
                <div className="table-search">
                  <Search />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${moduleName(mod.table).toLowerCase()}...`}
                  />
                </div>
                <button onClick={refresh}>
                  <RefreshCw />
                  Refresh
                </button>
                <button onClick={exportCsv}>
                  <Download />
                  Export
                </button>
                <button onClick={() => csvImportRef.current?.click()}>
                  <Upload />
                  Upload CSV
                </button>
                <button onClick={() => window.print()}>
                  <Printer />
                  Print
                </button>
              </div>
              <DataTable
                mod={mod}
                rows={filtered}
                loading={loading}
                view={(r) => setModal({ mode: "view", row: r })}
                edit={(r) => setModal({ mode: "edit", row: r })}
                remove={remove}
              />
            </section>
          </>
        )}
        <footer>
          <span>
            © 2026 St. John's English School · Dankuni, Hooghly 712311
          </span>
          <span>Privacy · Security · Support</span>
        </footer>
      </main>
      {modal && mod && (
        <RecordModal
          mode={modal.mode}
          mod={mod}
          row={modal.row}
          close={() => setModal(null)}
          save={save}
        />
      )}{" "}
      {loginOpen && (
        <Login
          close={() => setLoginOpen(false)}
          session={session}
          setToast={setToast}
        />
      )}{" "}
      {toast && (
        <div className="toast">
          <Check />
          {toast}
          <button onClick={() => setToast("")}>
            <X />
          </button>
        </div>
      )}
    </div>
  );
}
function Dashboard({ choose }: { choose: (x: string) => void }) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="overline">WEDNESDAY · 19 AUGUST 2026</span>
          <h1>Good morning, Ananya.</h1>
          <p>
            Your school is running smoothly. Here’s what needs your attention
            today.
          </p>
        </div>
        <button onClick={() => choose("New Admission")}>
          <Plus />
          Quick create
          <ChevronDown />
        </button>
      </section>
      <section className="kpi-grid">
        <Kpi
          icon={<GraduationCap />}
          title="Total students"
          value="1,248"
          delta="4.2%"
          positive
        />
        <Kpi
          icon={<ClipboardCheck />}
          title="Attendance today"
          value="93.8%"
          delta="1.6%"
          positive
        />
        <Kpi
          icon={<IndianRupee />}
          title="Fees collected"
          value="₹8.42L"
          delta="₹3.26L due"
        />
        <Kpi
          icon={<Users />}
          title="Staff present"
          value="59/64"
          delta="5 on leave"
        />
      </section>
      <section className="dash-grid">
        <div className="visual-card wide">
          <CardHead title="Attendance overview" note="Last 30 school days" />
          <div className="chart-area">
            <div className="chart-number">
              <b>93.8%</b>
              <span>
                <ArrowUpRight />
                1.6% vs last month
              </span>
            </div>
            <svg viewBox="0 0 700 170" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2463eb" stopOpacity=".24" />
                  <stop offset="1" stopColor="#2463eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="area"
                d="M0 105 C45 90 60 115 105 91 S175 73 215 86 S280 112 325 79 S390 63 435 72 S510 96 550 59 S625 44 700 35 L700 170 L0 170Z"
              />
              <path
                className="line"
                d="M0 105 C45 90 60 115 105 91 S175 73 215 86 S280 112 325 79 S390 63 435 72 S510 96 550 59 S625 44 700 35"
              />
            </svg>
            <div className="chart-days">
              <span>1 Aug</span>
              <span>5 Aug</span>
              <span>9 Aug</span>
              <span>13 Aug</span>
              <span>17 Aug</span>
              <span>Today</span>
            </div>
          </div>
        </div>
        <div className="visual-card">
          <CardHead title="Fee collection" note="August 2026" />
          <div className="donut-wrap">
            <div className="donut">
              <span>
                <b>72%</b>
                <small>Collected</small>
              </span>
            </div>
            <div className="legend">
              <p>
                <i className="blue" />
                Collected <b>₹8.42L</b>
              </p>
              <p>
                <i className="gold" />
                Outstanding <b>₹3.26L</b>
              </p>
              <p>
                <i className="pale" />
                Concession <b>₹0.48L</b>
              </p>
            </div>
          </div>
        </div>
        <div className="visual-card">
          <CardHead title="Quick actions" note="Common workflows" />
          <div className="action-grid">
            {[
              ["New Admission", UserRoundCheck],
              ["student_attendance", ClipboardCheck],
              ["fees_collection", IndianRupee],
              ["Marks Entry", BookOpenCheck],
              ["Email & Gmail", Mail],
              ["Reports", FileBarChart],
            ].map(([x, I]) => (
              <button key={x as string} onClick={() => choose(x as string)}>
                <I />
                <span>{x as string}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="visual-card wide">
          <CardHead title="Recent activity" note="Across your school" />
          <div className="activity-list">
            {[
              ["Admission", "New application from Riya Ghosh", "2 min ago"],
              ["Payment", "₹2,450 received from Aarav Sharma", "18 min ago"],
              ["Attendance", "Class VIII-A attendance completed", "34 min ago"],
              [
                "Results",
                "Unit Test marks published for Class VII",
                "1 hr ago",
              ],
            ].map((x, i) => (
              <div key={x[1]}>
                <span className={`act a${i}`}>
                  <Activity />
                </span>
                <p>
                  <b>{x[0]}</b>
                  {x[1]}
                </p>
                <small>{x[2]}</small>
                <MoreHorizontal />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
void Dashboard;
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
          {mod?.description} · {total} records
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
function Stat({
  label: txt,
  value,
  change,
  tone,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  tone: "amber" | "green" | "blue" | "violet";
  icon: ReactNode;
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-copy">
        <span>{txt}</span>
        <b>{value}</b>
        <small>{change}</small>
      </span>
      <svg className="stat-spark" viewBox="0 0 54 28" aria-hidden="true">
        <path d="M2 24c8 0 10-18 18-13s8 10 15 5 9-12 17-14" />
      </svg>
    </div>
  );
}
function Kpi({
  icon,
  title,
  value,
  delta,
  positive,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  delta: string;
  positive?: boolean;
}) {
  return (
    <div className="kpi">
      <span className="kpi-icon">{icon}</span>
      <div>
        <small>{title}</small>
        <b>{value}</b>
        <em className={positive ? "up" : ""}>
          {positive ? <ArrowUpRight /> : <ArrowDownRight />}
          {delta}
        </em>
      </div>
      <MoreHorizontal />
    </div>
  );
}
function CardHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="card-head">
      <div>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      <button>
        <MoreHorizontal />
      </button>
    </div>
  );
}
function DataTable({
  mod,
  rows,
  loading,
  view,
  edit,
  remove,
}: {
  mod: (typeof modules)[string];
  rows: Row[];
  loading: boolean;
  view: (r: Row) => void;
  edit: (r: Row) => void;
  remove: (r: Row) => void;
}) {
  if (loading)
    return (
      <div className="empty">
        <RefreshCw className="spin" />
        Loading records...
      </div>
    );
  if (!rows.length)
    return (
      <div className="empty">
        <Cloud />
        <h3>No records yet</h3>
        <p>Create the first record or adjust your search.</p>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {mod.columns.map((c) => (
              <th key={c}>{label(c)}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r[mod.primaryKey] || i)}>
              {mod.columns.map((c) => (
                <td key={c}>
                  {c.includes("status") || c === "is_active" ? (
                    <span className="status">
                      <i />
                      {String(r[c] ?? "Active")}
                    </span>
                  ) : (
                    String(r[c] ?? "—")
                  )}
                </td>
              ))}
              <td>
                <div className="row-actions">
                  <button onClick={() => view(r)} title="View">
                    <Eye />
                  </button>
                  {mod.fields.length > 0 && (
                    <button onClick={() => edit(r)} title="Edit">
                      <Edit3 />
                    </button>
                  )}
                  {mod.fields.length > 0 && (
                    <button
                      className="danger"
                      onClick={() => remove(r)}
                      title="Delete"
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
      ]),
    ),
  );
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
                ? "Review all saved information."
                : "Complete the fields below. Required fields are marked."}
            </p>
          </div>
          <button type="button" onClick={close}>
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
              change={(v) => setValues({ ...values, [field.key]: v })}
            />
          ))}
        </div>
        <footer>
          <button type="button" onClick={close}>
            Cancel
          </button>
          {mode !== "view" && (
            <button className="save">
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
}: {
  key?: string;
  field: Field;
  value: unknown;
  disabled: boolean;
  change: (v: unknown) => void;
}) {
  const [relationOptions, setRelationOptions] = useState<
    Array<Record<string, unknown>>
  >([]);
  useEffect(() => {
    if (field.type !== "relation" || !field.reference || !supabase) return;
    const reference = field.reference;
    supabase
      .from(reference.table)
      .select(`${reference.value},${reference.label}`)
      .order(reference.label)
      .limit(500)
      .then(({ data }) =>
        setRelationOptions(
          (data || []) as unknown as Array<Record<string, unknown>>,
        ),
      );
  }, [field]);
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
          placeholder={field.type === "array" ? "Separate values with commas" : ""}
          onChange={(e) =>
            change(
              field.type === "array"
                ? e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : e.target.value,
            )
          }
        />
      ) : field.type === "boolean" ? (
        <select
          disabled={disabled}
          value={String(value ?? true)}
          onChange={(e) => change(e.target.value === "true")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : field.type === "relation" && field.reference ? (
        <select
          disabled={disabled}
          required={field.required}
          value={String(value ?? "")}
          onChange={(e) => change(e.target.value)}
        >
          <option value="">Select...</option>
          {relationOptions.map((option) => (
            <option
              key={String(option[field.reference!.value])}
              value={String(option[field.reference!.value])}
            >
              {String(option[field.reference!.label] ?? "")}
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
          <option value="">Select...</option>
          {field.options?.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      ) : (
        <input
          disabled={disabled}
          required={field.required}
          type={field.type || "text"}
          value={String(value ?? "")}
          onChange={(e) =>
            change(
              field.type === "number" && e.target.value !== ""
                ? Number(e.target.value)
                : e.target.value,
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
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setToast(error.message);
      return;
    }
    close();
  };
  const logout = async () => {
    await supabase?.auth.signOut();
    setToast("Signed out");
    close();
  };
  return (
    <div className="modal-bg">
      <form className="login" onSubmit={submit}>
        <button type="button" className="login-close" onClick={close}>
          <X />
        </button>
        <img src={logo} />
        <span>SECURE SCHOOL ERP</span>
        <h2>{session ? "Your account" : "Welcome back"}</h2>
        <p>
          {session
            ? session.user.email
            : "Sign in to your role-based workspace."}
        </p>
        {session ? (
          <button type="button" className="login-button" onClick={logout}>
            Sign out
          </button>
        ) : (
          <>
            <label>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="login-button">
              <LogIn />
              {busy ? "Signing in..." : "Sign in securely"}
            </button>
            <small>Accounts are created by the school administrator.</small>
          </>
        )}
      </form>
    </div>
  );
}
export default App;
