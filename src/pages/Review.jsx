import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, deliverBlob } from '../api/client.js'
import { useAsync } from '../hooks.js'
import { eventLga, eventState, fmtDateTime, subjectName, titleCase } from '../format.js'
import MapView from '../components/MapView.jsx'
import { Empty, ErrorNote, KeyValue, Modal, PageHeader, ReasonDialog, Spinner, StatusBadge, TypeTag, useToast } from '../components/ui.jsx'

const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b ? `${Math.max(1, Math.round(b / 1024))} KB` : '')

export default function Review() {
  const { eventId } = useParams()
  const toast = useToast()
  const detail = useAsync(() => api.get(`/registrations/${eventId}`), [eventId])
  const docs = useAsync(() => api.get(`/registrations/${eventId}/documents`), [eventId])
  const [confirm, setConfirm] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [issued, setIssued] = useState(null)
  const [opening, setOpening] = useState('')

  const ev = detail.data
  const loc = ev?.location
  const points = useMemo(() => {
    const lat = Number(loc?.latitude ?? loc?.lat ?? loc?.geo_latitude)
    const lon = Number(loc?.longitude ?? loc?.lon ?? loc?.geo_longitude)
    return Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon) ? [{ lat, lon }] : []
  }, [loc])

  const approve = async () => {
    setBusy(true); setActionError(null)
    try {
      const res = await api.post(`/registrations/${eventId}/approve`)
      setConfirm(false)
      setIssued(res)
      toast('Application approved. Certificate issued.')
      detail.reload()
    } catch (e) { setActionError(e); setConfirm(false) } finally { setBusy(false) }
  }

  const openDoc = async (d) => {
    const id = d.document_id || d.id
    setOpening(id)
    try {
      const file = await api.get(`/registrations/${eventId}/documents/${id}`, undefined, { blob: true })
      const viewable = /^(image\/|application\/pdf|text\/)/.test(file.blob.type)
      deliverBlob({ ...file, filename: file.filename || d.file_name }, d.file_name || id, viewable)
    } catch (e) { setActionError(e) } finally { setOpening('') }
  }

  if (detail.loading && !ev) return <Spinner />
  if (detail.error) return <><PageHeader title="Application" /><ErrorNote error={detail.error} onRetry={detail.reload} /><Link to="/queue">← Back to queue</Link></>

  const pending = ev.status === 'PENDING_VERIFICATION'
  const certNumber = issued?.certificate_number || issued?.certificate?.certificate_number
  const certId = issued?.certificate_id || ev.certificate_id
  const docList = Array.isArray(docs.data) ? docs.data : []

  return (
    <>
      <PageHeader
        title={subjectName(ev)}
        sub={<><TypeTag type={ev.event_type} /> <StatusBadge status={ev.status} /> · Submitted {fmtDateTime(ev.created_at)} · ID {ev.event_id}</>}
        actions={<Link className="btn-light" to="/queue">← Queue</Link>}
      />

      {issued && (
        <div className="success" role="status">
          <b>Certificate issued.</b>{' '}
          {certNumber ? <>Certificate number <code>{certNumber}</code>.</> : <>Open the certificate from the certificates list.</>}{' '}
          <Link to="/certificates">Go to certificates →</Link>
        </div>
      )}
      {actionError && (
        <div className={'error' + (actionError.code === 'MAKER_CHECKER' ? ' strong' : '')} role="alert">
          {actionError.code === 'MAKER_CHECKER' ? (
            <><b>You cannot approve your own submission.</b> Maker-checker rules require a different officer to review this application. Ask a colleague to approve it.</>
          ) : actionError.code === 'INVALID_STATE' ? (
            <><b>This application is no longer awaiting verification.</b> Someone else may already have decided it. {actionError.message}</>
          ) : <ErrorNote error={actionError} />}
        </div>
      )}

      <div className="two review">
        <div className="col">
          <section className="card">
            <h3>Subject</h3>
            <KeyValue data={ev.subject} />
          </section>
          <section className="card">
            <h3>{titleCase(ev.event_type)} details</h3>
            <KeyValue data={ev.details} />
            {ev.payment_reference && <p className="sm">Payment reference: <code>{ev.payment_reference}</code></p>}
            {ev.rejection_reason && <p className="sm">Rejected: {ev.rejection_reason}</p>}
          </section>
          <section className="card">
            <h3>Documents</h3>
            {docs.loading ? <Spinner /> : docs.error ? <ErrorNote error={docs.error} onRetry={docs.reload} /> : docList.length === 0 ? <Empty>No documents were uploaded.</Empty> : (
              <ul className="doclist">
                {docList.map((d) => {
                  const id = d.document_id || d.id
                  return (
                    <li key={id}>
                      <div><b>{titleCase(d.document_type || d.type || 'Document')}</b><small className="muted"> {d.file_name} {size(d.size_bytes)}</small></div>
                      <button className="btn-light" disabled={opening === id} onClick={() => openDoc(d)}>{opening === id ? 'Opening…' : 'Open'}</button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="col">
          <section className="card">
            <h3>Location</h3>
            <p className="sm muted">{eventState(ev)} · LGA {eventLga(ev)}{loc?.ward ? ` · ${loc.ward}` : ''}</p>
            {points.length ? <MapView points={points} label="Event location" height={260} /> : <Empty>No coordinates were captured.</Empty>}
            {points.length > 0 && <small className="muted">{points[0].lat.toFixed(5)}, {points[0].lon.toFixed(5)}</small>}
          </section>
          <section className="card decision">
            <h3>Decision</h3>
            {pending ? (
              <>
                <p className="muted sm">Approving issues a signed certificate with a QR code. Rejecting requires a reason that is recorded in the audit log.</p>
                <div className="row">
                  <button className="btn-primary" disabled={busy} onClick={() => setConfirm(true)}>✔ Approve</button>
                  <button className="btn-danger" disabled={busy} onClick={() => setRejecting(true)}>✕ Reject</button>
                </div>
              </>
            ) : (
              <p className="muted sm">This application is <b>{titleCase(ev.status)}</b>, so no decision is available.{certId && <> Certificate <Link to="/certificates">{certNumber || certId}</Link>.</>}</p>
            )}
          </section>
        </div>
      </div>

      {confirm && (
        <Modal title="Approve this application?" onClose={() => !busy && setConfirm(false)}>
          <p>You are approving <b>{subjectName(ev)}</b> ({titleCase(ev.event_type)}). A certificate will be issued and this cannot be undone.</p>
          <div className="row end">
            <button className="btn-light" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
            <button className="btn-primary" onClick={approve} disabled={busy}>{busy ? 'Approving…' : 'Approve and issue'}</button>
          </div>
        </Modal>
      )}
      {rejecting && (
        <ReasonDialog
          title="Reject application" intro={`Tell the applicant why ${subjectName(ev)}'s application cannot proceed.`}
          min={5} max={500} confirmLabel="Reject application" danger onClose={() => setRejecting(false)}
          onSubmit={async (reason) => { await api.post(`/registrations/${eventId}/reject`, { reason }); toast('Application rejected.'); detail.reload() }}
        />
      )}
    </>
  )
}
