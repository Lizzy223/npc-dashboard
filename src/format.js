export const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
export const fmtDateTime = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('en-NG') : n ?? '-')
export const titleCase = (s) => String(s ?? '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const STATUSES = ['PENDING_DOCUMENTS', 'PENDING_PAYMENT', 'PENDING_VERIFICATION', 'REFERRED_TO_CENTER', 'APPROVED', 'REJECTED']
export const EVENT_TYPES = ['BIRTH', 'DEATH', 'ATTESTATION']

// Field names follow the backend OpenAPI schema (EventOut, CitizenBrief).
export const personName = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ') || '-'
export const subjectName = (e) => personName(e?.subject)
export const eventState = (e) => e?.state_code || '-'
export const eventLga = (e) => e?.lga_code || '-'
export const eventId = (e) => e?.event_id
