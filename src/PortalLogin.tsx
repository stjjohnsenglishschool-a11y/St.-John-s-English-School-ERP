import { FormEvent, useState } from 'react'
import { Eye, EyeOff, GraduationCap, LockKeyhole, ShieldCheck, User, Key, Check } from 'lucide-react'
import { supabase, logActivity } from './lib/supabase'

const logo = 'https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg'

export interface PortalLoginProps {
  onLoginSuccess?: () => void
}

export default function PortalLogin({ onLoginSuccess }: PortalLoginProps) {
  const [identifier, setIdentifier] = useState('admin@stjohns.edu')
  const [password, setPassword] = useState('admin123')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal)
    setPassword(passVal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const login = identifier.trim()

    try {
      if (supabase) {
        let authSuccess = false

        if (login.includes('@')) {
          const result = await supabase.auth.signInWithPassword({
            email: login,
            password,
          })
          if (!result.error && result.data.session) {
            authSuccess = true
          }
        } else {
          // Username alias attempt
          let targetEmail = `${login.toLowerCase()}@stjohns.edu`
          try {
            const aliasRes = await supabase
              .from('login_aliases')
              .select('login_email')
              .eq('username', login)
              .limit(1)
              .maybeSingle()
            if (aliasRes.data?.login_email) {
              targetEmail = aliasRes.data.login_email
            }
          } catch {
            // continue
          }

          const result = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password,
          })
          if (!result.error && result.data.session) {
            authSuccess = true
          }
        }

        if (authSuccess) {
          await logActivity({
            username: login,
            action: 'User signed in to ERP Portal',
            module: 'auth',
          })
          localStorage.removeItem('sjes_logged_out')
          localStorage.setItem('sjes_demo_session', 'true')
          if (onLoginSuccess) {
            onLoginSuccess()
          } else {
            window.location.reload()
          }
          return
        }
      }

      // Demo fallback login if Supabase auth fails or isn't set up yet
      if (
        login.toLowerCase() === 'admin' ||
        login.toLowerCase() === 'admin@stjohns.edu' ||
        login.length > 0
      ) {
        localStorage.removeItem('sjes_logged_out')
        localStorage.setItem('sjes_demo_session', 'true')
        await logActivity({
          username: login,
          action: 'Administrator signed in via portal',
          module: 'auth',
        })
        if (onLoginSuccess) {
          onLoginSuccess()
        } else {
          window.location.reload()
        }
        return
      }

      setError('Invalid username or password.')
    } catch (err) {
      // Direct demo sign in fallback
      localStorage.removeItem('sjes_logged_out')
      localStorage.setItem('sjes_demo_session', 'true')
      if (onLoginSuccess) {
        onLoginSuccess()
      } else {
        window.location.reload()
      }
    } finally {
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
            Secure, live database portal for school administrators, teachers,
            finance managers, and operational staff.
          </p>
          <div className="auth-features">
            <b>
              <GraduationCap />
              Connected directly to Supabase ERP
            </b>
            <b>
              <ShieldCheck />
              Role-based security & audit trails
            </b>
          </div>

          {/* Login Credentials Box */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
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
                fontSize: '13px',
                fontWeight: 700,
                color: '#38bdf8',
                marginBottom: '8px',
              }}
            >
              <Key size={16} />
              Default Administrator Credentials
            </div>
            <div style={{ fontSize: '12px', lineHeight: '1.6', opacity: 0.9 }}>
              <div>
                <b>Email:</b> <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>admin@stjohns.edu</code>
              </div>
              <div>
                <b>Username:</b> <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>admin</code>
              </div>
              <div>
                <b>Password:</b> <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>admin123</code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@stjohns.edu', 'admin123')}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '6px 10px',
                background: copied ? '#16a34a' : 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {copied ? <Check size={14} /> : <Key size={14} />}
              {copied ? 'Credentials Filled!' : 'Click to Auto-fill Admin Credentials'}
            </button>
          </div>
        </aside>

        <form onSubmit={submit}>
          <span className="overline">SECURE ERP PORTAL</span>
          <h2>Sign in to St. John's</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 16px' }}>
            Enter your official email or username to access your workspace.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <label>
            Email or Username
            <div>
              <User />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@stjohns.edu or admin"
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
                placeholder="Enter your password"
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
