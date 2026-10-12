import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAsync, usePaged } from '../hooks.js'
import { EVENT_TYPES, STATUSES, eventId, eventLga, eventState, fmtDate, subjectName } from '../format.js'
import { Empty, ErrorNote, Input, NIGERIA_STATES, PageHeader, Pager, Select, Spinner, StatusBadge, TypeTag } from '../components/ui.jsx'

function RecordsTable({ rows }) {
  if (!rows.length) return <Empty>No records match.</Empty>
  return (
    <div className="tbl-wrap">
      <table>
        <thead><tr><th>Subject</th><th>Type</th><th>State / LGA</th><th>Created</th><th>Status</th><th><span className="sr">Open</span></th></tr></thead>
        <tbody>
          {rows.map((e) => (
            <tr key={eventId(e)}>
              <td><b>{subjectName(e)}</b></td>
              <td><TypeTag type={e.event_type} /></td>
              <td>{eventState(e)} / {eventLga(e)}</td>
              <td>{fmtDate(e.created_at)}</td>
              <td><StatusBadge status={e.status} /></td>
              <td><Link className="btn-light sm-btn" to={`/registrations/${eventId(e)}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AllRecords() {
  const [f, setF] = useState({ status: '', event_type: '', state_code: '', lga_code: '' })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const paged = usePaged((p) => api.get('/registrations', { ...f, ...p }), [f], 25)
  return (
    <>
      <div className="filters">
        <Select label="Status" value={f.status} onChange={set('status')} options={STATUSES} />
        <Select label="Type" value={f.event_type} onChange={set('event_type')} options={EVENT_TYPES} />
        <Select label="State" value={f.state_code} onChange={set('state_code')} options={NIGERIA_STATES} />
        <Input label="LGA code" value={f.lga_code} onChange={set('lga_code')} placeholder="e.g. LA-IKJ" />
        <button className="btn-light" onClick={() => setF({ status: '', event_type: '', state_code: '', lga_code: '' })}>Clear</button>
      </div>
      <ErrorNote error={paged.error} onRetry={paged.reload} />
      {paged.loading && !paged.rows.length ? <Spinner /> : <RecordsTable rows={paged.rows} />}
      <Pager paged={paged} />
    </>
  )
}

function SemanticSearch() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [topK, setTopK] = useState(10)
  const [submitted, setSubmitted] = useState(null)
  const res = useAsync(() => (submitted ? api.get('/registrations/search', { q: submitted.q, event_type: submitted.type, top_k: submitted.topK }) : Promise.resolve(null)), [submitted])
  const hits = Array.isArray(res.data) ? res.data : []
  return (
    <>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 3) setSubmitted({ q: q.trim(), type, topK }) }}>
        <label className="filter grow">Describe what you are looking for
          <input className="field sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. late birth attestation Kano 1990" minLength={3} />
        </label>
        <Select label="Type" value={type} onChange={setType} options={EVENT_TYPES} />
        <Input label="Results (1-50)" type="number" min={1} max={50} value={topK} onChange={(v) => setTopK(Math.min(50, Math.max(1, Number(v) || 10)))} />
        <button className="btn-primary" disabled={q.trim().length < 3 || res.loading}>Search</button>
      </form>
      <ErrorNote error={res.error} onRetry={res.reload} />
      {res.loading ? <Spinner label="Searching" /> : !submitted ? <Empty>Enter at least 3 characters to search by meaning, not just exact words.</Empty> : hits.length === 0 ? <Empty>No similar records found.</Empty> : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Match</th><th>Subject</th><th>Type</th><th>State / LGA</th><th>Status</th><th><span className="sr">Open</span></th></tr></thead>
            <tbody>
              {hits.map((h) => {
                const e = h.event || h
                return (
                  <tr key={eventId(e)}>
                    <td><span className="score" title="Similarity score">{typeof h.score === 'number' ? `${Math.round(h.score * 100)}%` : '-'}</span></td>
                    <td><b>{subjectName(e)}</b></td>
                    <td><TypeTag type={e.event_type} /></td>
                    <td>{eventState(e)} / {eventLga(e)}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td><Link className="btn-light sm-btn" to={`/registrations/${eventId(e)}`}>Open</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default function Records() {
  const [tab, setTab] = useState('all')
  return (
    <>
      <PageHeader title="Records" sub="Every registration in the system, with filters and semantic search." />
      <section className="card">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All records</button>
          <button role="tab" aria-selected={tab === 'search'} className={tab === 'search' ? 'on' : ''} onClick={() => setTab('search')}>Semantic search</button>
        </div>
        {tab === 'all' ? <AllRecords /> : <SemanticSearch />}
      </section>
    </>
  )
}
