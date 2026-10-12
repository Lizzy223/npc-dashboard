import { useState } from 'react'
import { api, deliverBlob } from '../api/client.js'
import { useAuth } from '../auth.jsx'
import { useAsync } from '../hooks.js'
import { fmtDate } from '../format.js'
import { Empty, ErrorNote, PageHeader, ReasonDialog, Spinner, TypeTag, useToast } from '../components/ui.jsx'

export default function Certificates() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const list = useAsync(() => api.get('/certificates'), [])
  const [filter, setFilter] = useState('')
  const [dialog, setDialog] = useState(null) // { kind: 'reprint' | 'revoke', cert }
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState('')

  const certs = (Array.isArray(list.data) ? list.data : []).filter((c) =>
    !filter || `${c.certificate_number} ${c.holder_name || ''} ${c.event_id || ''}`.toLowerCase().includes(filter.toLowerCase()))

  const download = async (c) => {
    setBusy(c.certificate_id); setError(null)
    try {
      deliverBlob(await api.get(`/certificates/${c.certificate_id}/download`, undefined, { blob: true }), `${c.certificate_number}.pdf`)
      toast('Certificate downloaded.')
    } catch (e) {
      if (e.code === 'REPRINT_REQUIRED') { setDialog({ kind: 'reprint', cert: c }); toast('Already downloaded once. A reprint needs a reason.', 'warn') }
      else setError(e)
    } finally { setBusy('') }
  }

  return (
    <>
      <PageHeader title="Certificates" sub="Issued certificates. The first download is free; every later copy is a logged reprint." />
      <section className="card">
        <div className="filters">
          <label className="filter grow">Filter loaded certificates
            <input className="field sm" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Certificate number or name" />
          </label>
          <button className="btn-light" onClick={list.reload}>↻ Refresh</button>
        </div>
        <ErrorNote error={error || list.error} onRetry={list.error ? list.reload : undefined} />
        {list.loading ? <Spinner /> : certs.length === 0 ? <Empty>No certificates found.</Empty> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Number</th><th>Holder</th><th>Type</th><th>Issued</th><th>Status</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>{certs.map((c) => {
              const revoked = String(c.status).toUpperCase() === 'REVOKED'
              return (
                <tr key={c.certificate_id}>
                  <td><code>{c.certificate_number}</code></td>
                  <td>{c.holder_name || '-'}</td>
                  <td>{c.event_type ? <TypeTag type={c.event_type} /> : '-'}</td>
                  <td>{fmtDate(c.issued_at || c.created_at)}</td>
                  <td><span className={'sbadge ' + (revoked ? 's-rejected' : 's-approved')}>{revoked ? 'Revoked' : 'Active'}</span></td>
                  <td className="actions">
                    <button className="btn-light sm-btn" disabled={busy === c.certificate_id || revoked} onClick={() => download(c)}>Download</button>
                    <button className="btn-light sm-btn" disabled={revoked} onClick={() => setDialog({ kind: 'reprint', cert: c })}>Reprint</button>
                    {isAdmin && <button className="btn-danger sm-btn" disabled={revoked} onClick={() => setDialog({ kind: 'revoke', cert: c })}>Revoke</button>}
                  </td>
                </tr>
              )
            })}</tbody>
          </table></div>
        )}
        <small className="muted">Showing up to 200 certificates.</small>
      </section>

      {dialog?.kind === 'reprint' && (
        <ReasonDialog
          title={`Reprint ${dialog.cert.certificate_number}`} intro="Reprints are logged against your account." min={5} max={300} confirmLabel="Reprint PDF"
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            deliverBlob(await api.post(`/certificates/${dialog.cert.certificate_id}/reprint`, { reason }, { blob: true }), `${dialog.cert.certificate_number}.pdf`)
            toast('Reprint downloaded.')
          }}
        />
      )}
      {dialog?.kind === 'revoke' && (
        <ReasonDialog
          title={`Revoke ${dialog.cert.certificate_number}`} intro="Revoked certificates fail public verification immediately. This cannot be undone." min={5} max={500} confirmLabel="Revoke certificate" danger
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => { await api.post(`/certificates/${dialog.cert.certificate_id}/revoke`, { reason }); toast('Certificate revoked.'); list.reload() }}
        />
      )}
    </>
  )
}
