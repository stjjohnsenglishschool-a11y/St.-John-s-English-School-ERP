import { FormEvent, useState } from 'react'
import { Eye, EyeOff, GraduationCap, LockKeyhole, ShieldCheck, User } from 'lucide-react'
import { supabase, logActivity } from './lib/supabase'

const logo = 'https://res.cloudinary.com/oilisvfi/image/upload/v1786000074/logo_final_frchld.jpg'

export default function PortalLogin() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    const login = identifier.trim()

    try {
      if (login.includes('@')) {
        const result = await supabase.auth.signInWithPassword({
          email: login,
          password,
        })
        if (result.error) {
          setError(result.error.message)
        } else {
          await logActivity({
            username: login,
            action: 'Administrator signed in via email',
            module: 'auth',
          })
        }
      } else {
        // Try username login via edge function or lookup user_master
        const userRes = await supabase
          .from('user_master')
          .select('user_id,user_name,user_full_name,role')
          .eq('user_name', login)
          .limit(1)
          .maybeSingle()

        if (userRes.data) {
          // If username exists, sign in with email convention or edge function
          const assumedEmail = `${login.toLowerCase()}@stjohns.edu`
          const result = await supabase.auth.signInWithPassword({
            email: assumedEmail,
            password,
          })
          if (result.error) {
            // Attempt edge function if deployed
            const fnResult = await supabase.functions.invoke('username-login', {
              body: { username: login, password },
            })
            if (fnResult.error || fnResult.data?.error) {
              setError(result.error.message || 'Invalid credentials')
            } else if (fnResult.data?.access_token) {
              await supabase.auth.setSession({
                access_token: fnResult.data.access_token,
                refresh_token: fnResult.data.refresh_token,
              })
            }
          }
        } else {
          // Try standard direct attempt
          const result = await supabase.auth.signInWithPassword({
            email: `${login}@stjohns.edu`,
            password,
          })
          if (result.error) {
            setError(result.error.message)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
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
              Connected directly to Supabase
            </b>
            <b>
              <ShieldCheck />
              Role-based security & audit trails
            </b>
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
                placeholder="e.g. admin@stjohns.edu or admin"
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
