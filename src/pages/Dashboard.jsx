import { useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { useAsync } from '../hooks.js'
import { EVENT_TYPES, fmtNum, titleCase } from '../format.js'
import MapView from '../components/MapView.jsx'
import { Empty, ErrorNote, Input, NIGERIA_STATES, PageHeader, Select, Spinner } from '../components/ui.jsx'

const pick = (o, keys, d) => { for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null) return o[k]; return d }
const arr = (v) => (Array.isArray(v) ? v : [])

/* ---- charts: plain SVG / CSS, no chart library ---- */
function MonthlyChart({ data }) {
  const rows = arr(data).map((r) => ({ label: String(pick(r, ['month', 'period', 'label'], '')), births: Number(pick(r, ['births', 'birth'], 0)), deaths: Number(pick(r, ['deaths', 'death'], 0)) }))
  if (!rows.length) return <Empty>No monthly data for these filters.</Empty>
  const max = Math.max(1, ...rows.flatMap((r) => [r.births, r.deaths]))
  const W = 560, H = 220, pad = { l: 36, r: 8, t: 10, b: 28 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, band = iw / rows.length, bw = Math.min(18, band / 3)
  const y = (v) => pad.t + ih - (v / max) * ih
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Monthly births and deaths. ${rows.map((r) => `${r.label}: ${r.births} births, ${r.deaths} deaths`).join('. ')}`}>
        {[0, 0.5, 1].map((t) => (<g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} className="grid" /><text x={pad.l - 6} y={y(max * t) + 4} textAnchor="end" className="axis">{Math.round(max * t)}</text></g>))}
        {rows.map((r, i) => {
          const cx = pad.l + band * i + band / 2
          return (
            <g key={r.label + i}>
              <rect x={cx - bw - 1} y={y(r.births)} width={bw} height={pad.t + ih - y(r.births)} className="bar-b" rx="2"><title>{r.label}: {r.births} births</title></rect>
              <rect x={cx + 1} y={y(r.deaths)} width={bw} height={pad.t + ih - y(r.deaths)} className="bar-d" rx="2"><title>{r.label}: {r.deaths} deaths</title></rect>
              <text x={cx} y={H - 8} textAnchor="middle" className="axis">{r.label.slice(-5)}</text>
            </g>
          )
        })}
      </svg>
      <div className="legend"><span><i className="d b" />Births</span><span><i className="d dd" />Deaths</span></div>
    </>
  )
}

function HBars({ rows, empty }) {
  if (!rows.length) return <Empty>{empty}</Empty>
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r.label}><span className="lbl">{r.label}</span><span className="track"><i style={{ width: `${(r.value / max) * 100}%` }} /></span><b>{fmtNum(r.value)}</b></li>
      ))}
    </ul>
  )
}

function AgeSex({ data }) {
  const rows = arr(data).map((r) => ({ label: String(pick(r, ['age_group', 'age', 'band', 'label'], '')), m: Number(pick(r, ['male', 'm'], 0)), f: Number(pick(r, ['female', 'f'], 0)) }))
  if (!rows.length) return <Empty>No age and sex data.</Empty>
  const max = Math.max(1, ...rows.flatMap((r) => [r.m, r.f]))
  return (
    <>
      <div className="pyramid" role="img" aria-label={`Age and sex distribution. ${rows.map((r) => `${r.label}: ${r.m} male, ${r.f} female`).join('. ')}`}>
        {rows.map((r) => (
          <div key={r.label} className="prow">
            <span className="side-l"><i className="m" style={{ width: `${(r.m / max) * 100}%` }} title={`Male ${r.m}`} /></span>
            <span className="age">{r.label}</span>
            <span className="side-r"><i className="f" style={{ width: `${(r.f / max) * 100}%` }} title={`Female ${r.f}`} /></span>
          </div>
        ))}
      </div>
      <div className="legend"><span><i className="d b" />Male</span><span><i className="d dd" />Female</span></div>
    </>
  )
}

function Ask() {
  const [q, setQ] = useState('')
  const [state, setState] = useState({ loading: false, error: null, res: null })
  const submit = async (e) => {
    e.preventDefault()
    setState({ loading: true, error: null, res: null })
    try { setState({ loading: false, error: null, res: await api.post('/ai/analytics/ask', { question: q.trim() }) }) }
    catch (err) { setState({ loading: false, error: err, res: null }) }
  }
  const { res } = state
  const dataRows = arr(res?.data)
  const cols = dataRows[0] ? Object.keys(dataRows[0]).filter((k) => typeof dataRows[0][k] !== 'object') : []
  return (
    <section className="card">
      <h3>Ask in plain English</h3>
      <p className="muted sm">For example: “How many births were registered in Kano this year?” Answers use anonymised statistics only.</p>
      <form className="filters" onSubmit={submit}>
        <label className="filter grow"><span className="sr">Question</span>
          <input className="field sm" value={q} onChange={(e) => setQ(e.target.value)} minLength={5} maxLength={500} placeholder="Ask a question about registrations or deaths" />
        </label>
        <button className="btn-primary" disabled={q.trim().length < 5 || state.loading}>{state.loading ? 'Thinking…' : 'Ask'}</button>
      </form>
      <ErrorNote error={state.error} />
      {res && (
        <div className="answer" aria-live="polite">
          <p>{res.answer}</p>
          {dataRows.length > 0 && (
            <div className="tbl-wrap"><table>
              <thead><tr>{cols.map((c) => <th key={c}>{titleCase(c)}</th>)}</tr></thead>
              <tbody>{dataRows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>)}</tbody>
            </table></div>
          )}
          {res.interpreted_query && <details><summary className="sm muted">How the question was interpreted</summary><pre className="pre">{JSON.stringify(res.interpreted_query, null, 2)}</pre></details>}
        </div>
      )}
    </section>
  )
}

const LEVELS = [['national', 'National'], ['state', 'State'], ['lga', 'LGA']]

export default function Dashboard() {
  const [f, setF] = useState({ level: 'national', event_type: '', state_code: '', lga_code: '', date_from: '', date_to: '' })
  const [precision, setPrecision] = useState(1)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const needsState = f.level !== 'national' && !f.state_code
  const needsLga = f.level === 'lga' && !f.lga_code
  const blocked = needsState || needsLga

  const dash = useAsync(() => (blocked ? Promise.resolve(null) : api.get('/analytics/dashboard', f)), [JSON.stringify(f)])
  const heat = useAsync(() => (blocked ? Promise.resolve([]) : api.get('/analytics/heatmap', { ...f, precision })), [JSON.stringify(f), precision])

  const d = dash.data || {}
  const totals = d.totals && typeof d.totals === 'object' ? d.totals : Object.fromEntries(Object.entries(d).filter(([, v]) => typeof v === 'number'))
  const regions = arr(d.regions).map((r) => ({ label: String(pick(r, ['name', 'state', 'region', 'lga', 'key'], '?')), value: Number(pick(r, ['count', 'total', 'value'], 0)) }))
  const causes = arr(d.top_causes).map((r) => ({ label: String(pick(r, ['cause', 'cause_of_death', 'name'], '?')), value: Number(pick(r, ['count', 'total', 'value'], 0)) }))
  const points = useMemo(() => arr(heat.data).map((p) => ({ lat: Number(pick(p, ['latitude', 'lat'])), lon: Number(pick(p, ['longitude', 'lon', 'lng'])), weight: Number(pick(p, ['count', 'weight', 'value'], 1)) })), [heat.data])

  return (
    <>
      <PageHeader title="Dashboards" sub="Anonymised registration statistics for the whole country, a state or an LGA." />
      <section className="card">
        <div className="filters">
          <label className="filter">View
            <div className="seg tight" role="radiogroup" aria-label="View level">
              {LEVELS.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={f.level === v} className={f.level === v ? 'on' : ''} onClick={() => setF((s) => ({ ...s, level: v, ...(v === 'national' ? { state_code: '', lga_code: '' } : v === 'state' ? { lga_code: '' } : {}) }))}>{l}</button>)}
            </div>
          </label>
          <Select label="Event type" value={f.event_type} onChange={set('event_type')} options={EVENT_TYPES} />
          {f.level !== 'national' && <Select label="State" value={f.state_code} onChange={set('state_code')} options={NIGERIA_STATES} any="Choose state" />}
          {f.level === 'lga' && <Input label="LGA code" value={f.lga_code} onChange={set('lga_code')} placeholder="e.g. LA-IKJ" />}
          <Input label="From" type="date" value={f.date_from} onChange={set('date_from')} />
          <Input label="To" type="date" value={f.date_to} onChange={set('date_to')} />
        </div>
        {blocked && <p className="info">Choose a {needsState ? 'state' : 'LGA code'} to see this view.</p>}
      </section>

      <ErrorNote error={dash.error} onRetry={dash.reload} />
      {dash.loading && !dash.data ? <Spinner /> : !blocked && (
        <>
          <div className="stats">
            {Object.entries(totals).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
              <div className="card stat" key={k}><small className="caps muted">{titleCase(k)}</small><div className="big">{fmtNum(v)}</div></div>
            ))}
          </div>
          <div className="two even">
            <section className="card"><h3>Births and deaths by month</h3><MonthlyChart data={d.monthly || d.monthly_trends} /></section>
            <section className="card"><h3>Age and sex</h3><AgeSex data={d.age_sex} /></section>
          </div>
          <div className="two even">
            <section className="card"><h3>Regional split</h3><HBars rows={regions} empty="No regional data." /></section>
            <section className="card"><h3>Top causes of death</h3><HBars rows={causes} empty="No cause-of-death data." /></section>
          </div>
        </>
      )}

      <section className="card">
        <div className="row between">
          <h3>Heat-map</h3>
          <label className="filter inline">Detail
            <select className="field sm" value={precision} onChange={(e) => setPrecision(Number(e.target.value))}>
              <option value={0}>Coarsest (0)</option><option value={1}>Regional (1)</option><option value={2}>Local (2)</option><option value={3}>Finest (3)</option>
            </select>
          </label>
        </div>
        <ErrorNote error={heat.error} onRetry={heat.reload} />
        <MapView points={points} height={380} label="Registration heat-map" />
        <small className="muted">Circle size shows the number of events at that point. Uses the filters above.</small>
      </section>

      <Ask />
    </>
  )
}
