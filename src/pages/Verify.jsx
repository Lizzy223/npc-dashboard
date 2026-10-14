import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../auth.jsx'
import { fmtDate, titleCase } from '../format.js'
import { ErrorNote, Spinner } from '../components/ui.jsx'

/** Public certificate check. No login. Rate-limited by the server; the name comes back masked. */
export default function Verify() {
  const { number } = useParams()
  const [params] = useSearchParams()
  const hash = params.get('h') || ''
  const navigate = useNavigate()
  const { user } = useAuth()
  const [input, setInput] = useState(number ? decodeURIComponent(number) : '')
  const [state, setState] = useState({ loading: false, error: null, res: null })

  useEffect(() => {
    if (!number) { setState({ loading: false, error: null, res: null }); return }
    let live = true
    setState({ loading: true, error: null, res: null })
    api.get(`/verify/${encodeURIComponent(number)}`, hash ? { h: hash } : undefined, { auth: false }).then(
      (res) => live && setState({ loading: false, error: null, res }),
      (error) => live && setState({ loading: false, error, res: null }),
    )
    return () => { live = false }
  }, [number, hash])

  const submit = (e) => { e.preventDefault(); if (input.trim()) navigate(`/verify/${encodeURIComponent(input.trim())}`) }
  const { res } = state
  const status = res?.status
  const valid = status === 'VALID'
  const tampered = status === 'TAMPERED'

  return (
    <div className="login">
      <header className="login-top">
        <div className="brand"><span className="shield" aria-hidden="true">🛡</span><div><small className="green caps">National Population Commission</small><h1>Verify a certificate</h1></div></div>
        <Link className="btn-light" to={user ? '/queue' : '/login'}>{user ? 'Back to the desk' : 'Staff sign in'}</Link>
      </header>
      <div className="verify-wrap">
        <form className="panel form-panel" onSubmit={submit}>
          <label htmlFor="cn">Certificate number</label>
          <input id="cn" className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. NPC-B-2026-1006" autoFocus />
          <p className="muted sm">You can also scan the QR code on the certificate. Checks are rate-limited and personal details are partly hidden.</p>
          <button className="btn-primary" disabled={!input.trim() || state.loading}>Verify</button>
        </form>

        {state.loading && <Spinner label="Checking" />}
        {state.error && (state.error.status === 429
          ? <div className="error" role="alert"><b>Too many checks.</b> Wait a minute and try again.</div>
          : <ErrorNote error={state.error} />)}
        {res && (
          <div className={'panel verdict ' + (valid && !tampered ? 'ok' : 'bad')} role="status">
            <h2>{valid ? 'Valid certificate' : tampered ? 'Do not trust this certificate' : status === 'REVOKED' ? 'Certificate revoked' : 'Not found'}</h2>
            {tampered && <p>The QR code does not match the issued certificate. It may have been altered or copied.</p>}
            {status === 'REVOKED' && <p>This certificate was revoked by the National Population Commission and is no longer valid.</p>}
            {status === 'NOT_FOUND' && <p>No certificate with that number exists. Check the number and try again.</p>}
            {(valid || status === 'REVOKED') && (
              <dl className="kv">
                <div><dt>Number</dt><dd>{res.certificate_number}</dd></div>
                {res.certificate_type && <div><dt>Type</dt><dd>{titleCase(res.certificate_type)}</dd></div>}
                {res.holder_name_masked && <div><dt>Name</dt><dd>{res.holder_name_masked}</dd></div>}
                {res.event_date && <div><dt>Event date</dt><dd>{fmtDate(res.event_date)}</dd></div>}
                {res.issued_at && <div><dt>Issued</dt><dd>{fmtDate(res.issued_at)}</dd></div>}
                {res.issuing_authority && <div><dt>Issued by</dt><dd>{res.issuing_authority}</dd></div>}
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
