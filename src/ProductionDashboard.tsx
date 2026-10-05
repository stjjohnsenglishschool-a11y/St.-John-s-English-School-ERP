import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Activity,
  ArrowUpRight,
  BellRing,
  BookOpen,
  Building,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  GraduationCap,
  IndianRupee,
  Plus,
  RefreshCw,
  Shield,
  UserCheck,
  Users,
  UsersRound,
  WalletCards,
  Clock,
  IdCard,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { moduleName, modules } from './modules'
import { getCurrentAcademicYear } from './lib/academicYear'

type Stats = {
  students: number
  employees: number
  teachers: number
  staff: number
  classes: number
  departments: number
  present: number
  feesPaid: number
  feesDue: number
  expenses: number
  income: number
  pendingLeaves: number
  assignments: number
  notices: number
}

type LogRow = {
  log_id?: string
  username?: string
  action?: string
  module?: string
  status?: string
  created_at?: string
}

const emptyStats: Stats = {
  students: 0,
  employees: 0,
  teachers: 0,
  staff: 0,
  classes: 0,
  departments: 0,
  present: 0,
  feesPaid: 0,
  feesDue: 0,
  expenses: 0,
  income: 0,
  pendingLeaves: 0,
  assignments: 0,
  notices: 0,
}

function getInitialStats(): Stats {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return emptyStats
    const rawStu = localStorage.getItem('sjes_table_student_master') || localStorage.getItem('sjes_table_students')
    const studentsList: any[] = rawStu ? JSON.parse(rawStu) : []
    const rawEmp = localStorage.getItem('sjes_table_employee_master') || localStorage.getItem('sjes_table_employees') || localStorage.getItem('sjes_table_staff')
    const employeesList: any[] = rawEmp ? JSON.parse(rawEmp) : []
    const rawCls = localStorage.getItem('sjes_table_class_master')
    const classesList: any[] = rawCls ? JSON.parse(rawCls) : []
    const rawDept = localStorage.getItem('sjes_table_department_master') || localStorage.getItem('sjes_department_master')
    const departmentsList: any[] = rawDept ? JSON.parse(rawDept) : []
    const rawFees = localStorage.getItem('sjes_table_fees_collection')
    const feesList: any[] = rawFees ? JSON.parse(rawFees) : []
    const rawExp = localStorage.getItem('sjes_table_expense_master')
    const expensesList: any[] = rawExp ? JSON.parse(rawExp) : []
    const rawInc = localStorage.getItem('sjes_table_income_master')
    const incomeList: any[] = rawInc ? JSON.parse(rawInc) : []
    const rawAtt = localStorage.getItem('sjes_table_student_attendance')
    const attList: any[] = rawAtt ? JSON.parse(rawAtt) : []
    const rawLeaves = localStorage.getItem('sjes_table_leave_application')
    const leavesList: any[] = rawLeaves ? JSON.parse(rawLeaves) : []
    const rawAsg = localStorage.getItem('sjes_table_assignments_master')
    const asgList: any[] = rawAsg ? JSON.parse(rawAsg) : []
    const rawNot = localStorage.getItem('sjes_table_notice_automation')
    const notList: any[] = rawNot ? JSON.parse(rawNot) : []
    const todayStr = new Date().toISOString().slice(0, 10)

    const activeStudents = studentsList.filter((s) => s.is_active !== false && String(s.student_status || '').toLowerCase() !== 'inactive' && String(s.student_status || '').toLowerCase() !== 'left')
    const activeEmployees = employeesList.filter((e) => e.is_active !== false && String(e.employment_status || '').toLowerCase() !== 'inactive' && String(e.employment_status || '').toLowerCase() !== 'resigned' && String(e.employment_status || '').toLowerCase() !== 'retired')
    const teachers = activeEmployees.filter((e) => {
      const cat = String(e.employee_category || '').toLowerCase()
      return cat.includes('teach') || cat.includes('faculty')
    })
    const staff = activeEmployees.filter((e) => !teachers.includes(e))

    return {
      students: activeStudents.length || studentsList.length,
      employees: activeEmployees.length || employeesList.length,
      teachers: teachers.length || (activeEmployees.length ? Math.ceil(activeEmployees.length * 0.75) : 0),
      staff: staff.length || (activeEmployees.length ? Math.floor(activeEmployees.length * 0.25) : 0),
      classes: classesList.length,
      departments: departmentsList.length,
      present: attList.filter((a) => a.attendance_date === todayStr && a.status === 'present').length,
      feesPaid: feesList.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0),
      feesDue: feesList.reduce((sum, r) => sum + Number(r.amount_due || 0), 0),
      expenses: expensesList.reduce((sum, r) => sum + Number(r.amount || 0), 0),
      income: incomeList.reduce((sum, r) => sum + Number(r.amount || 0), 0),
      pendingLeaves: leavesList.filter((l) => String(l.status || '').toLowerCase() === 'pending').length,
      assignments: asgList.filter((a) => a.status === 'active' || a.is_active !== false).length,
      notices: notList.length,
    }
  } catch {
    return emptyStats
  }
}

function getInitialLogs(): LogRow[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return []
    const raw = localStorage.getItem('sjes_userlogs') || localStorage.getItem('sjes_table_userlog_master')
    return raw ? JSON.parse(raw).slice(0, 6) : []
  } catch {
    return []
  }
}

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function ProductionDashboard({
  choose,
  userName = 'Administrator',
  userRole = 'admin',
  allowedModules,
}: {
  choose: (table: string) => void
  userName?: string
  userRole?: string
  allowedModules?: string[]
}) {
  const [stats, setStats] = useState<Stats>(getInitialStats)
  const [logs, setLogs] = useState<LogRow[]>(getInitialLogs)
  const [loading, setLoading] = useState(false)

  const normalizedRole = (userRole || 'admin').toLowerCase().trim()
  const isTeacher = normalizedRole === 'teacher' || normalizedRole === 'faculty'
  const isAccounts = normalizedRole === 'accounts' || normalizedRole === 'finance'
  const isHr = normalizedRole === 'hr'
  const isStaff = normalizedRole === 'staff'
  const isAdminOrPrincipal = normalizedRole === 'admin' || normalizedRole === 'administrator' || normalizedRole === 'principal'

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  )

  const loadData = useCallback(async () => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const date = new Date().toISOString().slice(0, 10)
      const [
        students,
        employees,
        classes,
        attendance,
        fees,
        expenses,
        income,
        departments,
        leaves,
        assignments,
        notices,
        activity,
      ] = await Promise.all([
        client
          .from('student_master')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        client
          .from('employee_master')
          .select('is_active,employment_status,employee_category'),
        client
          .from('class_master')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        client
          .from('student_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_date', date)
          .eq('status', 'present'),
        client.from('fees_collection').select('amount_due,amount_paid'),
        client.from('expense_master').select('amount'),
        client.from('income_master').select('amount'),
        client
          .from('department_master')
          .select('*', { count: 'exact', head: true }),
        client
          .from('leave_application')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        client
          .from('assignments_master')
          .select('*', { count: 'exact', head: true }),
        client
          .from('notice_automation')
          .select('*', { count: 'exact', head: true }),
        client
          .from('userlog_master')
          .select('log_id,username,action,module,status,created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      const activeEmpList = (employees.data || []).filter(
        (e) =>
          e.is_active !== false &&
          e.employment_status !== 'Inactive' &&
          e.employment_status !== 'Resigned' &&
          e.employment_status !== 'Retired' &&
          e.employment_status !== 'Left' &&
          e.employment_status !== 'Suspended'
      )
      const teacherCount = activeEmpList.filter((e) => String(e.employee_category || '').includes('Teach')).length
      const staffCount = activeEmpList.filter((e) => !String(e.employee_category || '').includes('Teach')).length

      setStats({
        students: students.count ?? 0,
        employees: activeEmpList.length,
        teachers: teacherCount,
        staff: staffCount,
        classes: classes.count ?? 0,
        departments: departments.count ?? 0,
        present: attendance.count ?? 0,
        feesPaid: (fees.data || []).reduce(
          (sum, row) => sum + Number(row.amount_paid || 0),
          0
        ),
        feesDue: (fees.data || []).reduce(
          (sum, row) => sum + Number(row.amount_due || 0),
          0
        ),
        expenses: (expenses.data || []).reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        ),
        income: (income.data || []).reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        ),
        pendingLeaves: leaves.count ?? 0,
        assignments: assignments.count ?? 0,
        notices: notices.count ?? 0,
      })

      if (activity.data) {
        setLogs(activity.data as LogRow[])
      }
    } catch (e) {
      console.warn('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    if (!supabase) return
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_master' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_attendance' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments_master' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notice_automation' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'userlog_master' },
        () => loadData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData])

  const attendanceRate = stats.students
    ? Math.min(100, Math.round((stats.present / stats.students) * 100))
    : 0
  const feeRate = stats.feesDue
    ? Math.min(100, Math.round((stats.feesPaid / stats.feesDue) * 100))
    : 0
  const outstanding = Math.max(0, stats.feesDue - stats.feesPaid)

  // Customized KPI Cards based on Role
  const roleCards = useMemo(() => {
    if (isTeacher) {
      return [
        {
          label: 'Active Students',
          value: stats.students.toLocaleString('en-IN'),
          note: `Active across ${stats.classes || 13} classes`,
          Icon: GraduationCap,
          target: 'student_master',
          tone: 'blue',
        },
        {
          label: 'Present Today',
          value: stats.present.toLocaleString('en-IN'),
          note: `${attendanceRate}% student attendance`,
          Icon: CalendarCheck2,
          target: 'student_attendance',
          tone: 'green',
        },
        {
          label: 'Active Assignments',
          value: stats.assignments.toLocaleString('en-IN'),
          note: 'Class homework & projects',
          Icon: ClipboardList,
          target: 'assignments_master',
          tone: 'violet',
        },
        {
          label: 'Class Notices',
          value: stats.notices.toLocaleString('en-IN'),
          note: 'Active school circulars',
          Icon: BellRing,
          target: 'notice_automation',
          tone: 'amber',
        },
      ]
    }

    if (isAccounts) {
      return [
        {
          label: 'Fees Collected',
          value: money(stats.feesPaid),
          note: `${feeRate}% of total demand`,
          Icon: IndianRupee,
          target: 'fees_collection',
          tone: 'green',
        },
        {
          label: 'Outstanding Fees',
          value: money(outstanding),
          note: 'Pending fee balance',
          Icon: WalletCards,
          target: 'fees_collection',
          tone: 'amber',
        },
        {
          label: 'Other Income',
          value: money(stats.income),
          note: 'Non-fee revenues',
          Icon: DollarSign,
          target: 'income_master',
          tone: 'blue',
        },
        {
          label: 'Total Expenses',
          value: money(stats.expenses),
          note: 'Recorded operating costs',
          Icon: FileText,
          target: 'expense_master',
          tone: 'violet',
        },
      ]
    }

    if (isHr) {
      return [
        {
          label: 'Total Employees',
          value: stats.employees.toLocaleString('en-IN'),
          note: `${stats.teachers} teachers · ${stats.staff} staff`,
          Icon: UsersRound,
          target: 'employee_master',
          tone: 'blue',
        },
        {
          label: 'Teaching Faculty',
          value: stats.teachers.toLocaleString('en-IN'),
          note: 'Subject teachers & mentors',
          Icon: GraduationCap,
          target: 'employee_master',
          tone: 'green',
        },
        {
          label: 'Administrative Staff',
          value: stats.staff.toLocaleString('en-IN'),
          note: 'Office, accounts & support',
          Icon: Building,
          target: 'employee_master',
          tone: 'violet',
        },
        {
          label: 'Pending Leaves',
          value: stats.pendingLeaves.toLocaleString('en-IN'),
          note: 'Staff leave applications',
          Icon: UserCheck,
          target: 'leave_application',
          tone: 'amber',
        },
      ]
    }

    // Default for Admin & Principal
    return [
      {
        label: 'Total Students',
        value: stats.students.toLocaleString('en-IN'),
        note: `Active across ${stats.classes || 13} classes`,
        Icon: GraduationCap,
        target: 'student_master',
        tone: 'blue',
      },
      {
        label: 'Total Employees',
        value: stats.employees.toLocaleString('en-IN'),
        note: `${stats.teachers} teachers · ${stats.staff} staff`,
        Icon: UsersRound,
        target: 'employee_master',
        tone: 'violet',
      },
      {
        label: 'Present Today',
        value: stats.present.toLocaleString('en-IN'),
        note: `${attendanceRate}% of active students`,
        Icon: CalendarCheck2,
        target: 'student_attendance',
        tone: 'green',
      },
      {
        label: 'Fees Collected',
        value: money(stats.feesPaid),
        note: `${feeRate}% of total demand`,
        Icon: IndianRupee,
        target: 'fees_collection',
        tone: 'amber',
      },
    ]
  }, [isTeacher, isAccounts, isHr, stats, attendanceRate, feeRate, outstanding])

  const showModule = (value?: string) =>
    value && modules[value] ? moduleName(value) : value || 'General'

  const formatLogTime = (iso?: string) => {
    if (!iso) return 'Just now'
    try {
      const date = new Date(iso)
      const diffMin = Math.round((Date.now() - date.getTime()) / 60000)
      if (diffMin < 1) return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHours = Math.round(diffMin / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })
    } catch {
      return 'Recent'
    }
  }

  // Filter logs relevant for teacher (exclude sensitive finance/salary logs)
  const visibleLogs = useMemo(() => {
    if (isTeacher) {
      return logs.filter(
        (l) =>
          !String(l.module || '').includes('fee') &&
          !String(l.module || '').includes('expense') &&
          !String(l.module || '').includes('income') &&
          !String(l.module || '').includes('salary')
      )
    }
    return logs
  }, [logs, isTeacher])

  return (
    <div className="dashboard-view">
      {/* Header Section */}
      <section className="dashboard-heading">
        <div>
          <span className="overline">
            {isTeacher
              ? 'TEACHER & ACADEMIC WORKSPACE'
              : isAccounts
              ? 'ACCOUNTS & FINANCIAL WORKSPACE'
              : isHr
              ? 'HR & STAFF WORKSPACE'
              : isStaff
              ? 'OPERATIONS & FRONT DESK WORKSPACE'
              : 'ADMINISTRATION & INSTITUTIONAL OVERVIEW'}
          </span>
          <h1>
            {getGreeting()}, {userName}
          </h1>
          <p>
            {today} · Academic session {getCurrentAcademicYear()}
          </p>
        </div>

        {/* Role-Specific Quick Action Buttons */}
        <div className="dashboard-actions">
          <button onClick={loadData} title="Refresh live statistics">
            <RefreshCw className={loading ? 'spin' : ''} />
            Refresh
          </button>

          {isTeacher ? (
            <>
              <button onClick={() => choose('student_attendance')} style={{ background: '#0284c7', color: '#fff' }}>
                <CalendarCheck2 />
                Mark Attendance
              </button>
              <button
                className="primary"
                onClick={() => choose('assignments_master')}
                style={{ background: '#16a34a', color: '#fff' }}
              >
                <ClipboardList />
                Add Assignment
              </button>
            </>
          ) : isAccounts ? (
            <>
              <button onClick={() => choose('fees_collection')} style={{ background: '#16a34a', color: '#fff' }}>
                <IndianRupee />
                Collect Fees
              </button>
              <button
                className="primary"
                onClick={() => choose('income_master')}
              >
                <Plus />
                Record Income
              </button>
            </>
          ) : isHr ? (
            <>
              <button onClick={() => choose('employee_attendance')}>
                <CalendarCheck2 />
                Staff Attendance
              </button>
              <button
                className="primary"
                onClick={() => choose('leave_application')}
              >
                <UserCheck />
                Review Leaves
              </button>
            </>
          ) : (
            // Admin & Principal
            <>
              <button onClick={() => choose('fees_collection')}>
                <IndianRupee />
                Collect fees
              </button>
              <button
                className="primary"
                onClick={() => choose('student_master')}
              >
                <GraduationCap />
                Add student
              </button>
            </>
          )}
        </div>
      </section>

      {/* KPI Stat Cards */}
      <section className="live-kpis">
        {roleCards.map(({ label, value, note, Icon, target, tone }) => (
          <button
            className={`metric-card ${tone}`}
            key={target + label}
            onClick={() => choose(target)}
          >
            <span className="metric-icon">
              <Icon />
            </span>
            <span className="metric-copy">
              <small>{label}</small>
              <b>{loading ? '—' : value}</b>
              <em>{note}</em>
            </span>
            <ArrowUpRight className="metric-arrow" />
          </button>
        ))}
      </section>

      {/* Main Grid: Financial Panel is HIDDEN for Teachers & Staff */}
      <section className="executive-grid">
        {!isTeacher && !isStaff && (
          <article className="dashboard-panel finance-panel">
            <header>
              <div>
                <span className="panel-icon blue">
                  <WalletCards />
                </span>
                <div>
                  <h2>Financial overview</h2>
                  <p>Collection and cash-flow summary</p>
                </div>
              </div>
              <button onClick={() => choose('fees_collection')}>
                View finance
                <ChevronRight />
              </button>
            </header>
            <div className="finance-values">
              <div>
                <small>Fees collected</small>
                <strong>{loading ? '—' : money(stats.feesPaid)}</strong>
                <span className="positive">Received</span>
              </div>
              <div>
                <small>Outstanding fees</small>
                <strong>{loading ? '—' : money(outstanding)}</strong>
                <span className="warning">Pending</span>
              </div>
              <div>
                <small>Other income</small>
                <strong>{loading ? '—' : money(stats.income)}</strong>
                <span>Income register</span>
              </div>
              <div>
                <small>Total expenses</small>
                <strong>{loading ? '—' : money(stats.expenses)}</strong>
                <span>Expense register</span>
              </div>
            </div>
            <div className="collection-progress">
              <div>
                <span>Fee collection progress</span>
                <b>{feeRate}%</b>
              </div>
              <div className="progress-track">
                <i style={{ width: `${feeRate}%` }} />
              </div>
              <small>
                {money(stats.feesPaid)} received against {money(stats.feesDue)} demand
              </small>
            </div>
          </article>
        )}

        {/* Teacher Academic Hub Panel (Shown in place of Finance Panel for Teachers) */}
        {isTeacher && (
          <article className="dashboard-panel" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="panel-icon blue" style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                  <BookOpen size={20} />
                </span>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                    Classroom & Academic Tools
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                    Quick access to student rosters, assignments & card generation
                  </p>
                </div>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => choose('student_master')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <GraduationCap size={18} color="#0284c7" />
                  <ChevronRight size={14} color="#94a3b8" />
                </div>
                <b style={{ fontSize: '13px', color: '#0f172a' }}>Student Directory</b>
                <span style={{ fontSize: '11px', color: '#64748b' }}>View all registered students</span>
              </button>

              <button
                type="button"
                onClick={() => choose('student_attendance')}
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <CalendarCheck2 size={18} color="#16a34a" />
                  <ChevronRight size={14} color="#86efac" />
                </div>
                <b style={{ fontSize: '13px', color: '#15803d' }}>Mark Class Attendance</b>
                <span style={{ fontSize: '11px', color: '#166534' }}>Daily class attendance register</span>
              </button>

              <button
                type="button"
                onClick={() => choose('assignments_master')}
                style={{
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ClipboardList size={18} color="#9333ea" />
                  <ChevronRight size={14} color="#d8b4fe" />
                </div>
                <b style={{ fontSize: '13px', color: '#7e22ce' }}>Assignments & Tasks</b>
                <span style={{ fontSize: '11px', color: '#6b21a8' }}>Upload class assignments</span>
              </button>

              <button
                type="button"
                onClick={() => choose('student_idcard')}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <IdCard size={18} color="#2563eb" />
                  <ChevronRight size={14} color="#93c5fd" />
                </div>
                <b style={{ fontSize: '13px', color: '#1d4ed8' }}>Student ID Cards</b>
                <span style={{ fontSize: '11px', color: '#1e40af' }}>Print student identity cards</span>
              </button>

              <button
                type="button"
                onClick={() => choose('escort_card')}
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Users size={18} color="#ea580c" />
                  <ChevronRight size={14} color="#fdba74" />
                </div>
                <b style={{ fontSize: '13px', color: '#c2410c' }}>Parent Escort Cards</b>
                <span style={{ fontSize: '11px', color: '#9a3412' }}>Gate dispersal security cards</span>
              </button>

              <button
                type="button"
                onClick={() => choose('notice_automation')}
                style={{
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <BellRing size={18} color="#ca8a04" />
                  <ChevronRight size={14} color="#fde047" />
                </div>
                <b style={{ fontSize: '13px', color: '#a16207' }}>Class Notices</b>
                <span style={{ fontSize: '11px', color: '#854d0e' }}>Send announcements</span>
              </button>
            </div>
          </article>
        )}

        {/* Student Attendance Panel */}
        <article className="dashboard-panel attendance-panel">
          <header>
            <div>
              <span className="panel-icon green">
                <CalendarCheck2 />
              </span>
              <div>
                <h2>Attendance today</h2>
                <p>Live student presence</p>
              </div>
            </div>
            <button onClick={() => choose('student_attendance')}>
              Open register
              <ChevronRight />
            </button>
          </header>
          <div className="attendance-body">
            <div
              className="attendance-ring"
              style={{
                background: `conic-gradient(#10a474 0 ${attendanceRate}%,#e7edf3 ${attendanceRate}% 100%)`,
              }}
            >
              <div>
                <strong>{attendanceRate}%</strong>
                <span>Present</span>
              </div>
            </div>
            <div className="attendance-details">
              <div>
                <span>Present students</span>
                <b>{stats.present}</b>
              </div>
              <div>
                <span>Active students</span>
                <b>{stats.students}</b>
              </div>
              <div>
                <span>Not marked present</span>
                <b>{Math.max(0, stats.students - stats.present)}</b>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* Bottom Grid: Workflows & Audit Log */}
      <section className={`operations-grid ${isTeacher || isStaff ? 'single-column' : ''}`}>
        <article className="dashboard-panel attention-panel">
          <header>
            <div>
              <span className="panel-icon amber">
                <BellRing />
              </span>
              <div>
                <h2>{isTeacher ? 'Academic & Classroom Deliverables' : 'Needs attention'}</h2>
                <p>{isTeacher ? 'Active tasks, registers & classroom deliverables' : 'Pending school workflows'}</p>
              </div>
            </div>
          </header>

          <div className="attention-list">
            {isTeacher ? (
              <>
                <button onClick={() => choose('student_attendance')}>
                  <span className="attention-icon green">
                    <CalendarCheck2 />
                  </span>
                  <span>
                    <b>Today's Class Attendance</b>
                    <small>{stats.present} students marked present</small>
                  </span>
                  <strong>{stats.present}/{stats.students}</strong>
                  <ChevronRight />
                </button>
                <button onClick={() => choose('assignments_master')}>
                  <span className="attention-icon blue">
                    <ClipboardList />
                  </span>
                  <span>
                    <b>Class Assignments</b>
                    <small>Active student homework</small>
                  </span>
                  <strong>{stats.assignments}</strong>
                  <ChevronRight />
                </button>
                <button onClick={() => choose('notice_automation')}>
                  <span className="attention-icon green">
                    <BellRing />
                  </span>
                  <span>
                    <b>School Notices & Circulars</b>
                    <small>Official circulars and announcements</small>
                  </span>
                  <strong>{stats.notices}</strong>
                  <ChevronRight />
                </button>
                <button onClick={() => choose('student_idcard')}>
                  <span className="attention-icon violet">
                    <IdCard />
                  </span>
                  <span>
                    <b>Student ID Card Studio</b>
                    <small>Generate print-ready identity cards</small>
                  </span>
                  <strong>{stats.students}</strong>
                  <ChevronRight />
                </button>
              </>
            ) : (
              <>
                {!isAccounts && (
                  <button onClick={() => choose('department_master')}>
                    <span className="attention-icon blue">
                      <Building />
                    </span>
                    <span>
                      <b>Department Master</b>
                      <small>Teaching, office & staff units</small>
                    </span>
                    <strong>{stats.departments}</strong>
                    <ChevronRight />
                  </button>
                )}
                {!isAccounts && (
                  <button onClick={() => choose('leave_application')}>
                    <span className="attention-icon violet">
                      <UsersRound />
                    </span>
                    <span>
                      <b>Leave applications</b>
                      <small>Awaiting administrative decision</small>
                    </span>
                    <strong>{stats.pendingLeaves}</strong>
                    <ChevronRight />
                  </button>
                )}
                <button onClick={() => choose('assignments_master')}>
                  <span className="attention-icon blue">
                    <ClipboardList />
                  </span>
                  <span>
                    <b>Active assignments</b>
                    <small>Currently assigned to classes</small>
                  </span>
                  <strong>{stats.assignments}</strong>
                  <ChevronRight />
                </button>
                <button onClick={() => choose('notice_automation')}>
                  <span className="attention-icon green">
                    <BellRing />
                  </span>
                  <span>
                    <b>Scheduled notices</b>
                    <small>Queued for communication</small>
                  </span>
                  <strong>{stats.notices}</strong>
                  <ChevronRight />
                </button>
              </>
            )}
          </div>
        </article>

        {/* Recent Activity Audit Trail: Only visible to Administrators and Principals */}
        {!isTeacher && !isStaff && (
          <article className="dashboard-panel activity-panel">
            <header>
              <div>
                <span className="panel-icon violet">
                  <Activity />
                </span>
                <div>
                  <h2>Recent activity</h2>
                  <p>Live audit trail from database</p>
                </div>
              </div>
              <button onClick={() => choose('userlog_master')}>
                View all
                <ChevronRight />
              </button>
            </header>
            {visibleLogs.length > 0 ? (
              <div className="dashboard-activity">
                {visibleLogs.map((row, index) => (
                  <div key={row.log_id || index}>
                    <span className="activity-dot" />
                    <span>
                      <b>{row.action || 'Activity recorded'}</b>
                      <small>
                        {row.username || 'System'} · {showModule(row.module)} ·{' '}
                        {formatLogTime(row.created_at)}
                      </small>
                    </span>
                    <em>{row.status || 'complete'}</em>
                  </div>
                ))}
              </div>
            ) : (
              <div className="activity-empty">
                <Activity />
                <span>No activity has been recorded in the database yet.</span>
              </div>
            )}
          </article>
        )}
      </section>
    </div>
  )
}
