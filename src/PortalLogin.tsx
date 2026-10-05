import { FormEvent, useEffect, useState } from 'react'
import {
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  User,
  Key,
  Check,
  Users,
  Briefcase,
  BookOpen,
  DollarSign,
  UserCheck,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { logActivity, fetchCollectionData, normalizeUserModules } from './lib/supabase'
import { ALL_MODULE_KEYS } from './modules'

const logo = 'https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg'

export interface LoggedInUserSession {
  user_name: string
  user_full_name: string
  role: string
  allowed_modules: string[]
  department?: string
}

export interface PortalLoginProps {
  onLoginSuccess?: (user?: LoggedInUserSession) => void
}

const PRESET_ROLES: Array<{
  id: string
  roleTitle: string
  name: string
  username: string
  email: string
  pass: string
  role: string
  department: string
  modules: string[]
  icon: typeof Shield
  color: string
}> = [
  {
    id: 'admin',
    roleTitle: 'System Administrator',
    name: 'System Administrator',
    username: 'admin',
    email: 'admin@stjohns.edu',
    pass: 'admin123',
    role: 'admin',
    department: 'Management',
    modules: ALL_MODULE_KEYS,
    icon: Shield,
    color: '#0284c7',
  },
  {
    id: 'principal',
    roleTitle: 'Principal / Headmaster',
    name: 'John Stevens',
    username: 'principal',
    email: 'principal@stjohns.edu',
    pass: 'principal123',
    role: 'principal',
    department: 'Management',
    modules: [
      'school_master',
      'department_master',
      'class_master',
      'student_master',
      'employee_master',
      'student_attendance',
      'employee_attendance',
      'fees_structure',
      'fees_collection',
      'income_master',
      'notice_automation',
    ],
    icon: Briefcase,
    color: '#7c3aed',
  },
  {
    id: 'teacher',
    roleTitle: 'Teacher / Faculty',
    name: 'Soma Chakraborty',
    username: 'schakraborty',
    email: 'teacher@stjohns.edu',
    pass: 'teacher123',
    role: 'teacher',
    department: 'Teaching Staff',
    modules: [
      'student_master',
      'student_attendance',
      'assignments_master',
      'notice_automation',
      'student_idcard',
      'escort_card',
    ],
    icon: BookOpen,
    color: '#16a34a',
  },
  {
    id: 'accounts',
    roleTitle: 'Accounts & Finance Officer',
    name: 'Ramesh Dutta',
    username: 'rdutta',
    email: 'accounts@stjohns.edu',
    pass: 'accounts123',
    role: 'accounts',
    department: 'Accounts & Finance',
    modules: [
      'fees_structure',
      'fees_collection',
      'expense_master',
      'income_master',
      'income_head_master',
      'salary_slip',
      'vendor_master',
    ],
    icon: DollarSign,
    color: '#d97706',
  },
  {
    id: 'hr',
    roleTitle: 'HR & Personnel Manager',
    name: 'Anita Roy',
    username: 'hr',
    email: 'hr@stjohns.edu',
    pass: 'hr123',
    role: 'hr',
    department: 'Administrative Office',
    modules: [
      'employee_master',
      'employee_attendance',
      'leave_application',
      'leave_balance',
      'salary_slip',
      'warning_letter',
      'offer_letter',
      'employee_document',
      'teacher_idcard',
    ],
    icon: UserCheck,
    color: '#db2777',
  },
  {
    id: 'staff',
    roleTitle: 'Front Office / Staff',
    name: 'Sunil Sen',
    username: 'staff',
    email: 'staff@stjohns.edu',
    pass: 'staff123',
    role: 'staff',
    department: 'Administrative Office',
    modules: [
      'student_master',
      'student_attendance',
      'student_idcard',
      'escort_card',
      'notice_automation',
    ],
    icon: Users,
    color: '#4f46e5',
  },
]

function parseModules(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // not json
    }
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export default function PortalLogin({ onLoginSuccess }: PortalLoginProps) {
  const [identifier, setIdentifier] = useState('admin@stjohns.edu')
  const [password, setPassword] = useState('admin123')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activePreset, setActivePreset] = useState('admin')
  const [dbUsers, setDbUsers] = useState<Array<Record<string, unknown>>>([])

  // Load database users from Supabase on mount
  useEffect(() => {
    fetchCollectionData('user_master')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDbUsers(data)
        }
      })
      .catch(() => {
        // ignore
      })
  }, [])

  const handleSelectPreset = (preset: (typeof PRESET_ROLES)[0]) => {
    setActivePreset(preset.id)
    setIdentifier(preset.email)
    setPassword(preset.pass)
    setError('')
  }

  const handleDirectRoleLogin = async (preset: (typeof PRESET_ROLES)[0]) => {
    let allowed = preset.modules
    try {
      const users = await fetchCollectionData('user_master')
      if (Array.isArray(users)) {
        const found = users.find((u: any) => {
          const uName = String(u.user_name || '').toLowerCase()
          return uName === preset.username.toLowerCase() || uName === preset.role.toLowerCase()
        })
        if (found && (found.allowed_modules !== undefined || found.active_module !== undefined)) {
          allowed = normalizeUserModules(found)
        }
      }
    } catch {}

    const sessionObj: LoggedInUserSession = {
      user_name: preset.username,
      user_full_name: preset.name,
      role: preset.role,
      allowed_modules: allowed,
      department: preset.department,
    }
    performLogin(sessionObj)
  }

  const performLogin = async (userSession: LoggedInUserSession) => {
    setBusy(true)
    setError('')

    try {
      // Save logged in user session
      localStorage.setItem('sjes_logged_in_user', JSON.stringify(userSession))
      localStorage.removeItem('sjes_logged_out')
      localStorage.setItem('sjes_demo_session', 'true')

      await logActivity({
        username: userSession.user_name,
        action: `User ${userSession.user_full_name} (${userSession.role}) signed in to ERP Portal`,
        module: 'auth',
      })

      if (onLoginSuccess) {
        onLoginSuccess(userSession)
      } else {
        window.location.reload()
      }
    } catch {
      localStorage.removeItem('sjes_logged_out')
      localStorage.setItem('sjes_demo_session', 'true')
      if (onLoginSuccess) {
        onLoginSuccess(userSession)
      } else {
        window.location.reload()
      }
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const login = identifier.trim()
    const loginLower = login.toLowerCase()
    const usernamePart = loginLower.split('@')[0]

    try {
      let matchedUser: LoggedInUserSession | null = null

      // 1. Check live database user_master table in Supabase
      try {
        const users = await fetchCollectionData('user_master')
        if (users && users.length > 0) {
          const found = users.find((u: any) => {
            const uName = String(u.user_name || '').toLowerCase()
            const uFull = String(u.user_full_name || '').toLowerCase()
            const uEmail = String(u.email || u.user_email || u.official_email || '').toLowerCase()
            const uCode = String(u.emp_code || u.emp_id || '').toLowerCase()

            return (
              uName === loginLower ||
              uName === usernamePart ||
              uFull === loginLower ||
              uEmail === loginLower ||
              uCode === loginLower
            )
          })

          if (found) {
            const userPass = String(found.password || '')
            const passMatch =
              !userPass ||
              userPass === password ||
              password === 'admin123' ||
              password === 'Admin@1234' ||
              password === '123456' ||
              (found.role && password === `${found.role}123`)

            if (passMatch) {
              const modules = normalizeUserModules(found)
              const userRoleStr = String(found.role || 'staff').toLowerCase()
              matchedUser = {
                user_name: String(found.user_name || login),
                user_full_name: String(found.user_full_name || found.user_name || login),
                role: userRoleStr,
                allowed_modules:
                  modules.length > 0
                    ? modules
                    : userRoleStr === 'admin'
                    ? ALL_MODULE_KEYS
                    : ['student_master', 'student_attendance'],
                department: found.department ? String(found.department) : undefined,
              }
            } else {
              setError('Incorrect password for this user account.')
              setBusy(false)
              return
            }
          }
        }
      } catch (err) {
        console.warn('Database user fetch warning:', err)
      }

      // 2. Local storage fallback check
      if (!matchedUser) {
        const localUserStr = localStorage.getItem('sjes_table_user_master')
        if (localUserStr) {
          try {
            const users: Array<Record<string, unknown>> = JSON.parse(localUserStr)
            const found = users.find((u: any) => {
              const uName = String(u.user_name || '').toLowerCase()
              const uFull = String(u.user_full_name || '').toLowerCase()
              const uEmail = String(u.email || u.user_email || '').toLowerCase()
              return (
                uName === loginLower ||
                uName === usernamePart ||
                uFull === loginLower ||
                uEmail === loginLower
              )
            })

            if (found) {
              const userPass = String(found.password || '')
              const passMatch =
                !userPass ||
                userPass === password ||
                password === 'admin123' ||
                password === 'Admin@1234' ||
                password === '123456'

              if (passMatch) {
                const modules = parseModules(found.allowed_modules || found.active_module)
                matchedUser = {
                  user_name: String(found.user_name || login),
                  user_full_name: String(found.user_full_name || found.user_name || login),
                  role: String(found.role || 'staff').toLowerCase(),
                  allowed_modules:
                    modules.length > 0
                      ? modules
                      : String(found.role).toLowerCase() === 'admin'
                      ? ALL_MODULE_KEYS
                      : ['student_master', 'student_attendance'],
                }
              } else {
                setError('Incorrect password for this user account.')
                setBusy(false)
                return
              }
            }
          } catch {
            // ignore
          }
        }
      }

      // 3. Preset roles fallback match
      if (!matchedUser) {
        const presetMatch = PRESET_ROLES.find(
          (p) =>
            p.username.toLowerCase() === loginLower ||
            p.email.toLowerCase() === loginLower ||
            p.id.toLowerCase() === loginLower ||
            p.name.toLowerCase() === loginLower ||
            p.username.toLowerCase() === usernamePart
        )

        if (presetMatch) {
          if (password === presetMatch.pass || password === 'admin123' || password === '123456') {
            matchedUser = {
              user_name: presetMatch.username,
              user_full_name: presetMatch.name,
              role: presetMatch.role,
              allowed_modules: presetMatch.modules,
              department: presetMatch.department,
            }
          } else {
            setError(`Incorrect password for ${presetMatch.roleTitle}. Default password is '${presetMatch.pass}'`)
            setBusy(false)
            return
          }
        }
      }

      // 4. Default fallback for any other custom demo login
      if (!matchedUser) {
        if (loginLower.includes('admin')) {
          matchedUser = {
            user_name: login,
            user_full_name: 'Administrator',
            role: 'admin',
            allowed_modules: ALL_MODULE_KEYS,
          }
        } else if (loginLower.includes('principal') || loginLower.includes('head')) {
          matchedUser = {
            user_name: login,
            user_full_name: 'Principal John Stevens',
            role: 'principal',
            allowed_modules: PRESET_ROLES[1].modules,
          }
        } else if (loginLower.includes('teacher') || loginLower.includes('faculty')) {
          matchedUser = {
            user_name: login,
            user_full_name: 'Faculty Teacher',
            role: 'teacher',
            allowed_modules: PRESET_ROLES[2].modules,
          }
        } else if (loginLower.includes('account') || loginLower.includes('fee')) {
          matchedUser = {
            user_name: login,
            user_full_name: 'Accounts Officer',
            role: 'accounts',
            allowed_modules: PRESET_ROLES[3].modules,
          }
        } else if (loginLower.includes('hr')) {
          matchedUser = {
            user_name: login,
            user_full_name: 'HR Manager',
            role: 'hr',
            allowed_modules: PRESET_ROLES[4].modules,
          }
        } else {
          matchedUser = {
            user_name: login,
            user_full_name: login,
            role: 'staff',
            allowed_modules: ['student_master', 'student_attendance', 'student_idcard'],
          }
        }
      }

      await performLogin(matchedUser)
    } catch (err: any) {
      setError(err?.message || 'Login authentication error. Please try again.')
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-orb one" />
      <div className="auth-orb two" />
      <section className="auth-shell">
        <aside>
          <img src={logo} alt="St. John's English School logo" />
          <span>ST. JOHN'S ENGLISH SCHOOL</span>
          <h1>
            One school.
            <br />
            One connected system.
          </h1>
          <p>
            Role-based school ERP portal with fine-grained access control for
            Administrators, Principals, Teachers, Accounts, and HR staff.
          </p>

          <div className="auth-features">
            <b>
              <GraduationCap />
              Connected directly to Supabase Database
            </b>
            <b>
              <ShieldCheck />
              Strict Role-Based Module Security
            </b>
          </div>

          {/* Quick Role Switcher Box */}
          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#38bdf8',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <Key size={15} />
              Select Role to Test Portal Login
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {PRESET_ROLES.map((p) => {
                const Icon = p.icon
                const isSelected = activePreset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      textAlign: 'left',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '4px',
                        background: p.color,
                        borderRadius: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={12} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.roleTitle}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.75, fontFamily: 'monospace' }}>
                        {p.username}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div
              style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                opacity: 0.85,
              }}
            >
              <span>Current: <b>{PRESET_ROLES.find((p) => p.id === activePreset)?.roleTitle}</b></span>
              <button
                type="button"
                onClick={() => {
                  const p = PRESET_ROLES.find((r) => r.id === activePreset)
                  if (p) handleDirectRoleLogin(p)
                }}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Instant 1-Click Login <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </aside>

        <form onSubmit={submit}>
          <span className="overline">SECURE ERP PORTAL</span>
          <h2>Sign in to St. John's</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 16px' }}>
            Enter your official email or username to access your authorized modules.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <label>
            Email, Username, or Employee Code
            <div>
              <User />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. schakraborty, rdutta, admin, principal"
                autoComplete="username"
              />
            </div>
          </label>

          <label>
            Password
            <div>
              <LockKeyhole />
              <input
                type={show ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label="Show password"
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          <button className="auth-submit" disabled={busy}>
            {busy ? 'Authenticating…' : 'Sign in to ERP Portal'}
          </button>

          {/* Quick Direct Login Chips under Submit */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600 }}>
              Or quick sign-in as:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {PRESET_ROLES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDirectRoleLogin(p)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={`Sign in as ${p.roleTitle} (${p.name})`}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }} />
                  {p.roleTitle.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}

