import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { usePaged } from '../hooks.js'
import { EVENT_TYPES, eventId, eventLga, eventState, fmtDateTime, subjectName } from '../format.js'
import { Empty, ErrorNote, NIGERIA_STATES, PageHeader, Pager, Select, Spinner, StatusBadge, TypeTag } from '../components/ui.jsx'

const ageLabel = (iso) => {
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5)
  if (Number.isNaN(h)) return '-'
  return h < 24 ? `${Math.floor(h)}h` : `${Math.floor(h / 24)}d`
}

export default function Queue() {
  // The queue endpoint only takes limit/offset, so type and state are filtered on the loaded page.
  const [type, setType] = useState('')
  const [state, setState] = useState('')
  const paged = usePaged((p) => api.get('/registrations/queue', p), [], 25)
  const rows = paged.rows.filter((e) => (!type || e.event_type === type) && (!state || e.location?.state_code === state || e.location?.state === state))

  return (
    <>
      <PageHeader title="Verification queue" sub="Applications waiting for review, oldest first." />
      <section className="card">
        <div className="filters">
          <Select label="Type" value={type} onChange={setType} options={EVENT_TYPES} />
          <Select label="State" value={state} onChange={setState} options={NIGERIA_STATES} />
          <button className="btn-light" onClick={paged.reload}>↻ Refresh</button>
        </div>
        <ErrorNote error={paged.error} onRetry={paged.reload} />
        {paged.loading && !paged.rows.length ? <Spinner /> : rows.length === 0 ? <Empty>{paged.rows.length ? 'No applications on this page match the filters.' : 'The queue is empty. Nothing is waiting for review.'}</Empty> : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Type</th><th>State / LGA</th><th>Submitted</th><th>Waiting</th><th>Status</th><th><span className="sr">Action</span></th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={eventId(e)}>
                    <td><b>{subjectName(e)}</b></td>
                    <td><TypeTag type={e.event_type} /></td>
                    <td>{eventState(e)} / {eventLga(e)}</td>
                    <td>{fmtDateTime(e.created_at)}</td>
                    <td>{ageLabel(e.created_at)}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td><Link className="btn-primary sm-btn" to={`/registrations/${eventId(e)}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager paged={paged} />
      </section>
    </>
  )
}
