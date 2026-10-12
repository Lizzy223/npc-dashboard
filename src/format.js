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

// Tolerant readers: the OpenAPI schema is the contract, but older/newer builds name fields differently.
export const subjectName = (e) => {
  const s = e?.subject || {}
  return s.full_name || [s.first_name, s.middle_name, s.last_name || s.surname].filter(Boolean).join(' ') || e?.full_name || '-'
}
export const eventState = (e) => e?.location?.state || e?.location?.state_code || e?.state_code || '-'
export const eventLga = (e) => e?.location?.lga || e?.location?.lga_code || e?.lga_code || '-'
export const eventId = (e) => e?.event_id || e?.id
