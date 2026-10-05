import { FormEvent, useState } from 'react'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  User,
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
  user_id?: string
}

export interface PortalLoginProps {
  onLoginSuccess?: (user?: LoggedInUserSession) => void
}

export default function PortalLogin({ onLoginSuccess }: PortalLoginProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

    const loginInput = identifier.trim()
    if (!loginInput) {
      setError('Please enter your username, email, or employee code.')
      setBusy(false)
      return
    }

    const loginLower = loginInput.toLowerCase()

    try {
      let matchedUser: LoggedInUserSession | null = null

      // Fetch live user_master table from Supabase database
      const users = await fetchCollectionData('user_master')
      
      if (Array.isArray(users) && users.length > 0) {
        const found = users.find((u: any) => {
          const uName = String(u.user_name || '').toLowerCase()
          const uFull = String(u.user_full_name || '').toLowerCase()
          const uEmail = String(u.email || u.user_email || u.official_email || '').toLowerCase()
          const uCode = String(u.emp_code || u.emp_id || '').toLowerCase()

          return (
            uName === loginLower ||
            uFull === loginLower ||
            uEmail === loginLower ||
            uCode === loginLower
          )
        })

        if (found) {
          const dbPassword = String(found.password || '')
          // Validate password against user record in database
          const passMatch = dbPassword ? dbPassword === password : true

          if (passMatch) {
            const modules = normalizeUserModules(found)
            const userRoleStr = String(found.role || 'staff').toLowerCase()
            matchedUser = {
              user_id: found.user_id,
              user_name: String(found.user_name || loginInput),
              user_full_name: String(found.user_full_name || found.user_name || loginInput),
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
            setError('Incorrect password for this account. Please verify and try again.')
            setBusy(false)
            return
          }
        }
      }

      if (!matchedUser) {
        setError('Account not found in Database. Please check your username or contact your Administrator.')
        setBusy(false)
        return
      }

      await performLogin(matchedUser)
    } catch (err: any) {
      console.error('Authentication error:', err)
      setError(err?.message || 'Authentication error occurred. Please try again.')
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-orb one" />
      <div className="auth-orb two" />
      <section className="auth-shell">
        <aside className="auth-brand-panel">
          <img src={logo} alt="St. John's English School logo" className="auth-school-logo" />
          <span className="auth-school-title">ST. JOHN'S ENGLISH SCHOOL</span>
          <h1 className="auth-main-heading">
            One school.
            <br />
            One connected
            <br />
            system.
          </h1>
          <p className="auth-subtext">
            Role-based school ERP portal with fine-grained access control for
            Administrators, Principals, Teachers, Accounts, and HR staff.
          </p>
        </aside>

        <form onSubmit={submit}>
          <span className="overline">SECURE ERP PORTAL</span>
          <h2>Sign in to St. John's</h2>

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
                placeholder="Enter your username, email, or code..."
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
        </form>
      </section>
    </main>
  )
}
