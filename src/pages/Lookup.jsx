import { useState } from 'react'
import { api } from '../api/client.js'
import { personName } from '../format.js'
import { ErrorNote, KeyValue, PageHeader, Spinner, useToast } from '../components/ui.jsx'

const fmtScore = (v) => (typeof v === 'number' ? (v <= 1 ? `${Math.round(v * 100)}%` : String(v)) : '-')
const readBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = reject
  r.readAsDataURL(file)
})

export default function Lookup() {
  const toast = useToast()
  const [value, setValue] = useState('')
  const [state, setState] = useState({ loading: false, error: null, data: null })
  const [nimc, setNimc] = useState(null)
  const [face, setFace] = useState({ file: null, live: false, busy: false, result: null, error: null })

  const valid = /^\d{11}$/.test(value)
  const search = async (e) => {
    e.preventDefault()
    if (!valid) return
    setState({ loading: true, error: null, data: null }); setNimc(null); setFace((f) => ({ ...f, result: null, error: null }))
    try { setState({ loading: false, error: null, data: await api.get('/citizens/lookup', { nin: value }) }) }
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

  return (
    <>
      <PageHeader title="Citizen lookup" sub="Find a person by their full 11-digit National Identity Number (NIN)." />
      <section className="card">
        <form className="filters" onSubmit={search}>
          <label className="filter grow">National Identity Number (11 digits)
            <input className="field sm" value={value} inputMode="numeric" maxLength={11} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="btn-primary" disabled={!valid || state.loading}>Look up</button>
        </form>
        {state.loading && <Spinner label="Searching" />}
        <ErrorNote error={state.error} />
      </section>

      {c && (
        <>
          <section className="card">
            <div className="row between"><h3>{personName(c)}</h3>
              {c.nin && <button className="btn-light" onClick={verifyNin}>Check NIN with NIMC</button>}</div>
            <KeyValue data={{ ...c, is_deceased: c.is_deceased ? 'Yes' : 'No' }} />
            {nimc && (nimc.ok
              ? <p className="success sm" role="status">NIMC record found: {personName(nimc.data)}, born {nimc.data.date_of_birth}, {nimc.data.gender === 'F' ? 'female' : 'male'}.</p>
              : <ErrorNote error={nimc.error} />)}
          </section>

          {c.nin && (
            <section className="card">
              <h3>Face match</h3>
              <p className="muted sm">Upload a photo to compare against the NIMC record. The server decides the match against its threshold.</p>
              <div className="filters">
                <label className="filter">Photo<input type="file" accept="image/*" onChange={(e) => setFace((f) => ({ ...f, file: e.target.files[0] || null, result: null }))} /></label>
                <label className="check"><input type="checkbox" checked={face.live} onChange={(e) => setFace((f) => ({ ...f, live: e.target.checked }))} /> Liveness check passed</label>
                <button className="btn-light" disabled={!face.file || face.busy} onClick={verifyFace}>{face.busy ? 'Comparing…' : 'Verify face'}</button>
              </div>
              {face.result && <p className={face.result.matched ? 'success' : 'error'} role="status">{face.result.matched ? 'Match' : 'No match'} · confidence {fmtScore(face.result.confidence)} (threshold {fmtScore(face.result.threshold)})</p>}
              <ErrorNote error={face.error} />
            </section>
          )}

        </>
      )}
    </>
  )
}
