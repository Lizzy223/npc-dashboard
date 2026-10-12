import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { eventId, fmtDate } from '../format.js'
import { ErrorNote, KeyValue, PageHeader, Spinner, StatusBadge, TypeTag, useToast } from '../components/ui.jsx'

const readBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = reject
  r.readAsDataURL(file)
})

export default function Lookup() {
  const toast = useToast()
  const [kind, setKind] = useState('nin')
  const [value, setValue] = useState('')
  const [state, setState] = useState({ loading: false, error: null, data: null })
  const [nimc, setNimc] = useState(null)
  const [face, setFace] = useState({ file: null, live: false, busy: false, result: null, error: null })

  const valid = kind === 'nin' ? /^\d{11}$/.test(value) : value.trim().length > 3
  const search = async (e) => {
    e.preventDefault()
    if (!valid) return
    setState({ loading: true, error: null, data: null }); setNimc(null); setFace((f) => ({ ...f, result: null, error: null }))
    try { setState({ loading: false, error: null, data: await api.get('/citizens/lookup', { [kind]: value.trim() }) }) }
    catch (err) { setState({ loading: false, error: err, data: null }) }
  }

  const c = state.data
  const verifyNin = async () => {
    try { setNimc({ ok: true, data: await api.post('/identity/verify-nin', { nin: c.nin }) }) } catch (err) { setNimc({ ok: false, error: err }) }
  }
  const verifyFace = async () => {
    setFace((f) => ({ ...f, busy: true, result: null, error: null }))
    try {
      const image_base64 = await readBase64(face.file)
      const result = await api.post('/identity/verify-face', { nin: c.nin, face: { image_base64, liveness_passed: face.live } })
      setFace((f) => ({ ...f, busy: false, result }))
      toast('Face check complete.')
    } catch (err) { setFace((f) => ({ ...f, busy: false, error: err })) }
  }

  const { events, ...person } = c || {}
  return (
    <>
      <PageHeader title="Citizen lookup" sub="Find a person by NIN or civil registration number (CRN)." />
      <section className="card">
        <form className="filters" onSubmit={search}>
          <div className="seg" role="radiogroup" aria-label="Search by">
            <button type="button" role="radio" aria-checked={kind === 'nin'} className={kind === 'nin' ? 'on' : ''} onClick={() => { setKind('nin'); setValue('') }}>NIN</button>
            <button type="button" role="radio" aria-checked={kind === 'crn'} className={kind === 'crn' ? 'on' : ''} onClick={() => { setKind('crn'); setValue('') }}>CRN</button>
          </div>
          <label className="filter grow">{kind === 'nin' ? 'National Identity Number (11 digits)' : 'Civil registration number'}
            <input className="field sm" value={value} inputMode={kind === 'nin' ? 'numeric' : 'text'} maxLength={kind === 'nin' ? 11 : 40}
              onChange={(e) => setValue(kind === 'nin' ? e.target.value.replace(/\D/g, '') : e.target.value)} />
          </label>
          <button className="btn-primary" disabled={!valid || state.loading}>Look up</button>
        </form>
        {state.loading && <Spinner label="Searching" />}
        <ErrorNote error={state.error} />
      </section>

      {c && (
        <>
          <section className="card">
            <div className="row between"><h3>{c.full_name || 'Citizen'}</h3>
              {c.nin && <button className="btn-light" onClick={verifyNin}>Check NIN with NIMC</button>}</div>
            <KeyValue data={person} />
            {nimc && (nimc.ok
              ? <p className="success sm" role="status">NIMC responded: {nimc.data?.valid === false ? 'NIN not valid.' : 'NIN is valid.'}{nimc.data?.full_name ? ` Name on file: ${nimc.data.full_name}.` : ''}</p>
              : <ErrorNote error={nimc.error} />)}
          </section>

          {c.nin && (
            <section className="card">
              <h3>Face match</h3>
              <p className="muted sm">Upload a photo to compare against the NIMC record. The match threshold is 85%.</p>
              <div className="filters">
                <label className="filter">Photo<input type="file" accept="image/*" onChange={(e) => setFace((f) => ({ ...f, file: e.target.files[0] || null, result: null }))} /></label>
                <label className="check"><input type="checkbox" checked={face.live} onChange={(e) => setFace((f) => ({ ...f, live: e.target.checked }))} /> Liveness check passed</label>
                <button className="btn-light" disabled={!face.file || face.busy} onClick={verifyFace}>{face.busy ? 'Comparing…' : 'Verify face'}</button>
              </div>
              {face.result && <p className={face.result.match === false ? 'error' : 'success'} role="status">{face.result.match === false ? 'No match' : 'Match'}{typeof face.result.score === 'number' ? ` (${Math.round(face.result.score * 100)}%)` : ''}</p>}
              <ErrorNote error={face.error} />
            </section>
          )}

          <section className="card">
            <h3>Registrations</h3>
            {!events?.length ? <p className="muted">No registrations are linked to this person.</p> : (
              <div className="tbl-wrap"><table>
                <thead><tr><th>Type</th><th>Created</th><th>Status</th><th><span className="sr">Open</span></th></tr></thead>
                <tbody>{events.map((e) => (
                  <tr key={eventId(e)}><td><TypeTag type={e.event_type} /></td><td>{fmtDate(e.created_at)}</td><td><StatusBadge status={e.status} /></td>
                    <td><Link className="btn-light sm-btn" to={`/registrations/${eventId(e)}`}>Open</Link></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
        </>
      )}
    </>
  )
}
