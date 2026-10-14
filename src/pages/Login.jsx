import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { api } from '../api/client.js'
import { STAFF_ROLES, useAuth } from '../auth.jsx'
import { ErrorNote } from '../components/ui.jsx'

export default function Login() {
  const { user, signIn, signOut, notice } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('login') // login | enroll
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [show, setShow] = useState(false)
  const [enrol, setEnrol] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState('')

  if (user && STAFF_ROLES.includes(user.role)) return <Navigate to={location.state?.from || '/queue'} replace />

  const finish = async (tokenRes) => {
    const me = await signIn(tokenRes)
    if (!STAFF_ROLES.includes(me.role)) {
      signOut('This site is for NPC officers and administrators. Use the portal for your role instead.')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null); setInfo('')
    const creds = { email: email.trim(), password, otp_code: otp.trim() }
    try {
      if (mode === 'enroll') await finish(await api.post('/auth/mfa/activate', creds, { auth: false }))
      else await finish(await api.post('/auth/login', creds, { auth: false }))
    } catch (err) {
      if (err.code === 'MFA_ENROLLMENT_REQUIRED') {
        try {
          setEnrol(await api.post('/auth/mfa/enroll', { email: creds.email, password }, { auth: false }))
          setMode('enroll'); setOtp('')
          setInfo('Two-factor sign-in is required for staff. Add the account to your authenticator app, then enter the 6-digit code.')
        } catch (e2) { setError(e2) }
      } else if (err.code === 'MFA_REQUIRED') {
        setInfo('Enter the 6-digit code from your authenticator app.')
      } else if (err.code === 'INVALID_OTP') {
        setOtp(''); setError(err)
      } else setError(err)
    } finally { setBusy(false) }
  }

  const otpOk = /^\d{6}$/.test(otp.trim())
  const enrolling = mode === 'enroll'
  return (
    <div className="login">
      <header className="login-top">
        <div className="brand">
          <span className="shield" aria-hidden="true">🛡</span>
          <div><small className="green caps">Federal Republic of Nigeria</small><h1>National Population Commission</h1></div>
        </div>
        <Link className="btn-light" to="/verify">Verify a certificate</Link>
      </header>

      <div className="login-grid">
        <section className="panel hero-panel">
          <small className="green caps">Civil registration &amp; vital statistics</small>
          <h2 className="hero-title">Verification Desk</h2>
          <p className="muted">Review pending birth, death and late-birth applications, approve to issue signed certificates, and monitor registration across the country.</p>
          <div className="feature"><span className="badge" aria-hidden="true">1</span><div><b>Review</b><p>Work the verification queue, oldest first, with documents and location on one screen.</p></div></div>
          <div className="feature"><span className="badge" aria-hidden="true">2</span><div><b>Decide</b><p>Approve to issue a certificate with a QR code, or reject with a recorded reason.</p></div></div>
          <div className="feature"><span className="badge" aria-hidden="true">3</span><div><b>Audited</b><p>Every action is written to a tamper-evident audit log. You cannot approve your own submission.</p></div></div>
        </section>

        <form className="panel form-panel" onSubmit={submit}>
          <small className="green caps">Staff sign in</small>
          <h2 className="form-title">{enrolling ? 'Set up two-factor' : 'Sign in'}</h2>
          {notice && <p className="info" role="status">{notice}</p>}
          {info && <p className="info" role="status">{info}</p>}

          {enrolling && enrol && (
            <div className="enrol">
              <div className="qr"><QRCodeSVG value={enrol.otpauth_uri} size={168} /></div>
              <div>
                <p className="muted sm">Scan with Google Authenticator, Microsoft Authenticator or similar. If you cannot scan, enter this key manually:</p>
                <code className="secret">{enrol.secret}</code>
              </div>
            </div>
          )}

          <label htmlFor="email">Work email</label>
          <input id="email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required disabled={enrolling} />

          <label htmlFor="pw">Password</label>
          <div className="field-wrap">
            <input id="pw" className="field" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required disabled={enrolling} />
            <button type="button" className="eye" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? '🙈' : '👁'}</button>
          </div>

          <label htmlFor="otp">{enrolling ? 'Code from your app' : 'Authenticator code'}</label>
          <input id="otp" className="field otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />

          <ErrorNote error={error} />
          <button className="btn-primary" type="submit" disabled={busy || !email || !password || (enrolling && !otpOk)}>
            {busy ? 'Please wait…' : enrolling ? 'Activate and sign in' : 'Sign in'}
          </button>
          {enrolling && <button type="button" className="link-btn" onClick={() => { setMode('login'); setEnrol(null); setInfo(''); setOtp('') }}>← Back to sign in</button>}
        </form>
      </div>

      <footer className="warn">
        <p><b>Official use only.</b> This system is reserved for authorised officials. Unauthorised access or data extraction is an offence under the Cybercrimes Act (2015). All actions are logged.</p>
      </footer>
    </div>
  )
}
