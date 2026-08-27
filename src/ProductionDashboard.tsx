import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Activity,
  ArrowUpRight,
  BellRing,
  Building,
  CalendarCheck2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  RefreshCw,
  UsersRound,
  WalletCards,
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
}: {
  choose: (table: string) => void
  userName?: string
}) {
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

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
        teachers,
        staff,
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
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        client
          .from('employee_master')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('employee_category', 'Teaching Staff'),
        client
          .from('employee_master')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .neq('employee_category', 'Teaching Staff'),
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
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        client
          .from('notice_automation')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled'),
        client
          .from('userlog_master')
          .select('log_id,username,action,module,status,created_at')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      setStats({
        students: students.count ?? 0,
        employees: employees.count ?? 0,
        teachers: teachers.count ?? 0,
        staff: staff.count ?? 0,
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

    // Realtime live updates for key tables
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
        { event: '*', schema: 'public', table: 'fees_collection' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_attendance' },
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

  const cards = [
    {
      label: 'Total Students',
      value: stats.students.toLocaleString('en-IN'),
      note: `Active across ${stats.classes} classes`,
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

  return (
    <div className="dashboard-view">
      <section className="dashboard-heading">
        <div>
          <span className="overline">ADMINISTRATION OVERVIEW</span>
          <h1>{getGreeting()}, {userName}</h1>
          <p>{today} · Academic session {getCurrentAcademicYear()}</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={loadData} title="Refresh live statistics">
            <RefreshCw className={loading ? 'spin' : ''} />
            Refresh
          </button>
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
        </div>
      </section>

      <section className="live-kpis">
        {cards.map(({ label, value, note, Icon, target, tone }) => (
          <button
            className={`metric-card ${tone}`}
            key={target}
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

      <section className="executive-grid">
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

      <section className="operations-grid">
        <article className="dashboard-panel attention-panel">
          <header>
            <div>
              <span className="panel-icon amber">
                <BellRing />
              </span>
              <div>
                <h2>Needs attention</h2>
                <p>Pending school workflows</p>
              </div>
            </div>
          </header>
          <div className="attention-list">
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
          </div>
        </article>

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
          {logs.length > 0 ? (
            <div className="dashboard-activity">
              {logs.map((row, index) => (
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
      </section>
    </div>
  )
}
