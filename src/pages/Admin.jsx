import { useState } from 'react'
import { api } from '../api/client.js'
import { ROLE_LABEL } from '../auth.jsx'
import { useAsync, usePaged } from '../hooks.js'
import { fmtDateTime } from '../format.js'
import { Empty, ErrorNote, Input, Modal, NIGERIA_STATES, PageHeader, Pager, Select, Spinner, useToast } from '../components/ui.jsx'

const STAFF_CREATE_ROLES = ['NPC_OFFICER', 'ADMIN', 'FIELD_REGISTRAR', 'MEDICAL_PRACTITIONER']

/* ---------------- staff accounts ---------------- */
function CreateUser({ onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState({ full_name: '', email: '', password: '', role: 'NPC_OFFICER' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null)
    try { await api.post('/admin/users', { ...f, email: f.email.trim(), full_name: f.full_name.trim() }); toast('Staff account created. They enrol in two-factor at first sign-in.'); onDone(); onClose() }
    catch (err) { setError(err); setBusy(false) }
  }
  return (
    <Modal title="Create staff account" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label htmlFor="n">Full name</label><input id="n" className="field" value={f.full_name} onChange={set('full_name')} required autoFocus />
        <label htmlFor="e">Work email</label><input id="e" className="field" type="email" value={f.email} onChange={set('email')} required />
        <label htmlFor="p">Temporary password (10+ characters)</label><input id="p" className="field" type="password" minLength={10} value={f.password} onChange={set('password')} autoComplete="new-password" required />
        <label htmlFor="r">Role</label>
        <select id="r" className="field" value={f.role} onChange={set('role')}>{STAFF_CREATE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        <ErrorNote error={error} />
        <div className="row end"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || f.password.length < 10}>{busy ? 'Creating…' : 'Create account'}</button></div>
      </form>
    </Modal>
  )
}

export function AdminUsers() {
  const paged = usePaged((p) => api.get('/admin/users', p), [], 50)
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageHeader title="Staff accounts" sub="Staff and citizens in the system." actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ New staff account</button>} />
      <section className="card">
        <ErrorNote error={paged.error} onRetry={paged.reload} />
        {paged.loading && !paged.rows.length ? <Spinner /> : !paged.rows.length ? <Empty>No users.</Empty> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Two-factor</th></tr></thead>
            <tbody>{paged.rows.map((u) => (
              <tr key={u.user_id}><td><b>{u.full_name || '-'}</b></td><td>{u.email}</td><td>{ROLE_LABEL[u.role] || u.role}</td>
                <td>{u.role === 'CITIZEN' ? <span className="muted">Not required</span> : <span className={'sbadge ' + (u.mfa_enabled ? 's-approved' : 's-pending_payment')}>{u.mfa_enabled ? 'Enrolled' : 'Not yet enrolled'}</span>}</td></tr>
            ))}</tbody>
          </table></div>
        )}
        <Pager paged={paged} />
      </section>
      {creating && <CreateUser onClose={() => setCreating(false)} onDone={paged.reload} />}
    </>
  )
}

/* ---------------- MDA API keys ---------------- */
const SCOPES = [['stats:read', 'Read anonymised statistics'], ['phc:notify', 'Push PHC birth notices']]

export function AdminMda() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState(['stats:read'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [issued, setIssued] = useState(null)
  const [copied, setCopied] = useState(false)
  const toggle = (s) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null)
    try { setIssued(await api.post('/admin/mda-clients', { name: name.trim(), scopes })); setName(''); toast('API key issued.') }
    catch (err) { setError(err) } finally { setBusy(false) }
  }
  const key = issued?.api_key
  const copy = async () => { try { await navigator.clipboard.writeText(key); setCopied(true) } catch { setCopied(false) } }

  return (
    <>
      <PageHeader title="MDA API keys" sub="Keys let ministries and agencies read anonymised statistics or push PHC birth notices. No personal data is ever exposed." />
      <section className="card">
        <h3>Issue a key</h3>
        <form className="stack-form" onSubmit={submit}>
          <label htmlFor="mn">Organisation name</label>
          <input id="mn" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. National Bureau of Statistics" required />
          <fieldset><legend>Scopes</legend>
            {SCOPES.map(([s, d]) => <label key={s} className="check"><input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} /> <code>{s}</code> {d}</label>)}
          </fieldset>
          <ErrorNote error={error} />
          <div><button className="btn-primary" disabled={busy || !name.trim() || !scopes.length}>{busy ? 'Issuing…' : 'Issue API key'}</button></div>
        </form>
      </section>
      {issued && (
        <Modal title="Copy this key now" onClose={() => { setIssued(null); setCopied(false) }}>
          <p className="muted">This is the only time the key for <b>{issued.name}</b> is shown. It cannot be retrieved later; if it is lost, issue a new key.</p>
          <code className="secret big-key">{key || 'The server did not return a key.'}</code>
          <div className="row end">
            <button className="btn-light" onClick={copy}>{copied ? 'Copied ✓' : 'Copy key'}</button>
            <button className="btn-primary" onClick={() => { setIssued(null); setCopied(false) }}>I have saved it</button>
          </div>
        </Modal>
      )}
    </>
  )
}

/* ---------------- registration centres ---------------- */
const CENTER_TYPES = ['PHC', 'LGA', 'NIMC', 'NPC']
const blankCenter = { center_id: '', name: '', center_type: 'NPC', state_code: '', lga_code: '', geo_latitude: '', geo_longitude: '' }

function CreateCenter({ onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState(blankCenter)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const lat = Number(f.geo_latitude), lon = Number(f.geo_longitude)
  const coordsOk = f.geo_latitude !== '' && f.geo_longitude !== '' && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null)
    try { await api.post('/centers', { ...f, center_id: f.center_id.trim(), name: f.name.trim(), lga_code: f.lga_code.trim(), geo_latitude: lat, geo_longitude: lon }); toast('Centre added.'); onDone(); onClose() }
    catch (err) { setError(err); setBusy(false) }
  }
  return (
    <Modal title="Add registration centre" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label htmlFor="cid">Centre ID</label><input id="cid" className="field" value={f.center_id} onChange={set('center_id')} required autoFocus />
        <label htmlFor="cn">Name</label><input id="cn" className="field" value={f.name} onChange={set('name')} required />
        <label htmlFor="ct">Type</label>
        <select id="ct" className="field" value={f.center_type} onChange={set('center_type')}>{CENTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <div className="grid2">
          <div><label htmlFor="cs">State</label>
            <select id="cs" className="field" value={f.state_code} onChange={set('state_code')} required><option value="">Choose…</option>{NIGERIA_STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
          <div><label htmlFor="cl">LGA code</label><input id="cl" className="field" value={f.lga_code} onChange={set('lga_code')} required /></div>
          <div><label htmlFor="la">Latitude</label><input id="la" className="field" type="number" step="any" min={-90} max={90} value={f.geo_latitude} onChange={set('geo_latitude')} required /></div>
          <div><label htmlFor="lo">Longitude</label><input id="lo" className="field" type="number" step="any" min={-180} max={180} value={f.geo_longitude} onChange={set('geo_longitude')} required /></div>
        </div>
        <ErrorNote error={error} />
        <div className="row end"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !coordsOk}>{busy ? 'Adding…' : 'Add centre'}</button></div>
      </form>
    </Modal>
  )
}

export function AdminCenters() {
  const [state, setState] = useState('')
  const [type, setType] = useState('')
  const [creating, setCreating] = useState(false)
  const list = useAsync(() => api.get('/centers', { state_code: state, center_type: type }), [state, type])
  const rows = Array.isArray(list.data) ? list.data : []
  return (
    <>
      <PageHeader title="Registration centres" sub="Centres appear in registrar dropdowns." actions={<button className="btn-primary" onClick={() => setCreating(true)}>+ Add centre</button>} />
      <section className="card">
        <div className="filters"><Select label="State" value={state} onChange={setState} options={NIGERIA_STATES} /><Select label="Type" value={type} onChange={setType} options={CENTER_TYPES.map((t) => [t, t])} /></div>
        <ErrorNote error={list.error} onRetry={list.reload} />
        {list.loading ? <Spinner /> : !rows.length ? <Empty>No centres found.</Empty> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>State / LGA</th><th>Coordinates</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.center_id}><td><code>{c.center_id}</code></td><td><b>{c.name}</b></td><td>{c.center_type}</td><td>{c.state_code} / {c.lga_code}</td>
                <td>{Number(c.geo_latitude).toFixed(4)}, {Number(c.geo_longitude).toFixed(4)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {creating && <CreateCenter onClose={() => setCreating(false)} onDone={list.reload} />}
    </>
  )
}

/* ---------------- audit log ---------------- */
export function AdminAudit() {
  const [f, setF] = useState({ action: '', resource_type: '', resource_id: '', user_id: '' })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const paged = usePaged((p) => api.get('/admin/audit-logs', { ...f, ...p }), [f], 50)
  const [check, setCheck] = useState({ loading: false, error: null, res: null })
  const verify = async () => {
    setCheck({ loading: true, error: null, res: null })
    try { setCheck({ loading: false, error: null, res: await api.get('/admin/audit-logs/verify') }) } catch (e) { setCheck({ loading: false, error: e, res: null }) }
  }
  const r = check.res
  return (
    <>
      <PageHeader title="Audit log" sub="A tamper-evident trail of every sensitive action." actions={<button className="btn-primary" onClick={verify} disabled={check.loading}>{check.loading ? 'Checking…' : '🛡 Verify integrity'}</button>} />
      {r && (r.intact
        ? <div className="success" role="status"><b>Log intact.</b> {r.entries_checked} entries checked; no tampering detected.</div>
        : <div className="error strong" role="alert"><b>Integrity check failed.</b> The chain breaks at entry <code>{String(r.first_broken_id)}</code> after {r.entries_checked} entries checked. Escalate to the security team.</div>)}
      <ErrorNote error={check.error} />
      <section className="card">
        <div className="filters">
          <Input label="Action" value={f.action} onChange={set('action')} placeholder="e.g. REGISTRATION_APPROVED" />
          <Input label="Resource type" value={f.resource_type} onChange={set('resource_type')} />
          <Input label="Resource ID" value={f.resource_id} onChange={set('resource_id')} />
          <Input label="User ID" value={f.user_id} onChange={set('user_id')} />
        </div>
        <ErrorNote error={paged.error} onRetry={paged.reload} />
        {paged.loading && !paged.rows.length ? <Spinner /> : !paged.rows.length ? <Empty>No audit entries match.</Empty> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>When</th><th>Action</th><th>Resource</th><th>User</th></tr></thead>
            <tbody>{paged.rows.map((a, i) => (
              <tr key={a.id ?? i}><td>{fmtDateTime(a.timestamp)}</td><td><code>{a.action}</code></td><td>{a.resource_type} <small className="muted">{a.resource_id}</small></td><td>{a.actor || a.user_id || '-'}</td></tr>
            ))}</tbody>
          </table></div>
        )}
        <Pager paged={paged} />
      </section>
    </>
  )
}
