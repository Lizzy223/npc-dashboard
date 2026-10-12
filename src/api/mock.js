// Demo backend used when VITE_USE_MOCK=true. It mimics the eCRVS API contract so the UI
// can be exercised without a server. Staff logins: officer@npc.gov.ng / admin@npc.gov.ng,
// password "Password123!", OTP "123456".

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const fail = (status, code, message, fields) => json({ error: { code, message, ...(fields ? { fields } : {}) } }, status)
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))

const users = [
  { id: 'u-1', email: 'officer@npc.gov.ng', full_name: 'Amina Yusuf', role: 'NPC_OFFICER', mfa_enabled: true },
  { id: 'u-2', email: 'admin@npc.gov.ng', full_name: 'Chidi Okafor', role: 'ADMIN', mfa_enabled: true },
  { id: 'u-3', email: 'registrar@npc.gov.ng', full_name: 'Bola Adeyemi', role: 'FIELD_REGISTRAR', mfa_enabled: true },
  { id: 'u-4', email: 'dr.ibrahim@health.gov.ng', full_name: 'Dr. Musa Ibrahim', role: 'MEDICAL_PRACTITIONER', mfa_enabled: true },
  { id: 'u-5', email: 'citizen@example.com', full_name: 'Ngozi Eze', role: 'CITIZEN', mfa_enabled: false },
]

const places = [
  { state_code: 'LA', state: 'Lagos', lga_code: 'LA-IKJ', lat: 6.6, lon: 3.35 },
  { state_code: 'KN', state: 'Kano', lga_code: 'KN-NSW', lat: 12.0, lon: 8.52 },
  { state_code: 'FC', state: 'FCT', lga_code: 'FC-AMC', lat: 9.07, lon: 7.4 },
  { state_code: 'RV', state: 'Rivers', lga_code: 'RV-PHC', lat: 4.82, lon: 7.03 },
  { state_code: 'KD', state: 'Kaduna', lga_code: 'KD-KDS', lat: 10.5, lon: 7.43 },
  { state_code: 'EN', state: 'Enugu', lga_code: 'EN-ENN', lat: 6.45, lon: 7.5 },
  { state_code: 'BO', state: 'Borno', lga_code: 'BO-MAI', lat: 11.85, lon: 13.15 },
]
const names = ['Adaeze Okonkwo', 'Tunde Bakare', 'Fatima Abubakar', 'Emeka Nwosu', 'Halima Sani', 'Segun Ojo', 'Blessing Udoh', 'Ibrahim Danjuma', 'Chiamaka Obi', 'Yakubu Garba', 'Folake Adebayo', 'Musa Lawal']
const causes = ['Malaria', 'Hypertensive heart disease', 'Road traffic injury', 'Pneumonia', 'Diabetes mellitus', 'Stroke']
const statuses = ['PENDING_VERIFICATION', 'PENDING_VERIFICATION', 'PENDING_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_PAYMENT', 'REFERRED_TO_CENTER', 'APPROVED', 'REJECTED']
const types = ['BIRTH', 'BIRTH', 'DEATH', 'ATTESTATION']
const now = Date.now()

const events = Array.from({ length: 34 }, (_, i) => {
  const p = places[i % places.length]
  const type = types[i % types.length]
  const status = i < 4 ? 'PENDING_VERIFICATION' : statuses[i % statuses.length]
  const created = new Date(now - (40 - i) * 36e5 * 7).toISOString()
  return {
    event_id: `evt-${String(1000 + i)}`,
    event_type: type,
    status,
    created_at: created,
    submitted_by: i === 1 ? 'u-1' : i % 3 === 0 ? 'u-3' : 'u-5',
    subject: { full_name: names[i % names.length], nin: String(10000000000 + i * 7919), gender: i % 2 ? 'FEMALE' : 'MALE', date_of_birth: type === 'DEATH' ? '1948-03-11' : '2026-0' + (1 + (i % 9)) + '-14' },
    location: { state_code: p.state_code, state: p.state, lga_code: p.lga_code, ward: `Ward ${1 + (i % 11)}`, latitude: p.lat + (i % 5) * 0.03, longitude: p.lon + (i % 4) * 0.03 },
    details: type === 'DEATH'
      ? { date_of_death: '2026-08-02', place_of_death: 'General Hospital', cause_of_death: causes[i % causes.length], icd11_code: '1F40' }
      : type === 'ATTESTATION'
        ? { declared_birth_date: '1991-05-20', reason_for_late_registration: 'No hospital record available', witness: 'Chief Danladi' }
        : { place_of_birth: 'Primary Health Centre', father_name: 'Mr. ' + names[(i + 3) % names.length].split(' ')[1], mother_name: 'Mrs. ' + names[(i + 5) % names.length], birth_weight_kg: 3.1 },
    payment_reference: type === 'ATTESTATION' ? `PAY-${70000 + i}` : null,
    certificate_id: status === 'APPROVED' ? `cert-${i}` : null,
    rejection_reason: status === 'REJECTED' ? 'Supporting documents are illegible.' : null,
  }
})

const documents = (id) => [
  { document_id: `${id}-d1`, document_type: 'HOSPITAL_RECORD', file_name: 'hospital-record.txt', content_type: 'text/plain', size_bytes: 1280 },
  { document_id: `${id}-d2`, document_type: 'PARENT_ID', file_name: 'parent-id.txt', content_type: 'text/plain', size_bytes: 940 },
]

const certs = events.filter((e) => e.certificate_id).map((e) => ({
  certificate_id: e.certificate_id, certificate_number: `NPC-${e.event_type[0]}-2026-${e.event_id.slice(-4)}`, event_id: e.event_id,
  event_type: e.event_type, holder_name: e.subject.full_name, issued_at: e.created_at, status: 'ACTIVE', downloaded: false,
}))
const mdaClients = [{ client_id: 'mda-1', name: 'Federal Ministry of Health', scopes: ['stats:read', 'phc:notify'], created_at: new Date(now - 9e8).toISOString() }]
const centers = places.map((p, i) => ({ center_id: `CTR-${100 + i}`, name: `${p.state} Registration Centre`, center_type: i % 2 ? 'HEALTH_FACILITY' : 'NPC_OFFICE', state_code: p.state_code, lga_code: p.lga_code, geo_latitude: p.lat, geo_longitude: p.lon }))
const audit = []
const log = (action, resource_type, resource_id, user_id = 'u-1') => audit.unshift({ id: audit.length + 1, timestamp: new Date().toISOString(), action, resource_type, resource_id, user_id, hash: Math.random().toString(16).slice(2, 14) })
;['LOGIN', 'REGISTRATION_APPROVED', 'CERTIFICATE_DOWNLOADED', 'USER_CREATED'].forEach((a, i) => log(a, 'registration', events[i].event_id, i % 2 ? 'u-2' : 'u-1'))

const pdf = () => new Blob(['%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'], { type: 'application/pdf' })
const slice = (arr, q) => arr.slice(Number(q.get('offset') || 0), Number(q.get('offset') || 0) + Number(q.get('limit') || 50))
const counted = (stateCode, type) => events.filter((e) => e.status === 'APPROVED' || e.status === 'PENDING_VERIFICATION').filter((e) => (!stateCode || e.location.state_code === stateCode) && (!type || e.event_type === type))

function dashboard(q) {
  const list = counted(q.get('state_code'), q.get('event_type'))
  const births = list.filter((e) => e.event_type === 'BIRTH').length
  const deaths = list.filter((e) => e.event_type === 'DEATH').length
  const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
  const byState = {}
  list.forEach((e) => { byState[e.location.state] = (byState[e.location.state] || 0) + 1 })
  const cc = {}
  list.filter((e) => e.event_type === 'DEATH').forEach((e) => { cc[e.details.cause_of_death] = (cc[e.details.cause_of_death] || 0) + 1 })
  return {
    totals: { total: list.length, births, deaths, attestations: list.length - births - deaths, pending: events.filter((e) => e.status === 'PENDING_VERIFICATION').length },
    monthly: months.map((m, i) => ({ month: m, births: 40 + i * 7 + births, deaths: 12 + (i % 3) * 4 + deaths })),
    regions: Object.entries(byState).map(([name, count]) => ({ name, count: count * 120 })),
    age_sex: ['0-4', '5-14', '15-49', '50-64', '65+'].map((age, i) => ({ age_group: age, male: 30 + i * 9, female: 27 + i * 11 })),
    top_causes: Object.entries(cc).map(([cause, count]) => ({ cause, count: count * 14 })).sort((a, b) => b.count - a.count),
  }
}

export async function mockFetch(url, init) {
  await wait()
  const u = new URL(url)
  const path = u.pathname
  const q = u.searchParams
  const method = init.method || 'GET'
  const body = init.body ? JSON.parse(init.body) : {}
  const authHeader = init.headers?.Authorization
  const me = authHeader ? users.find((x) => `mock.${x.id}` === authHeader.replace('Bearer ', '')) : null
  const open = path === '/health' || path.startsWith('/auth/mfa') || path === '/auth/login' || path.startsWith('/verify/')
  if (!open && !me) return fail(401, 'UNAUTHORIZED', 'Session expired. Sign in again.')
  const staff = me && ['NPC_OFFICER', 'ADMIN'].includes(me.role)
  const isAdmin = me?.role === 'ADMIN'
  if (!open && path !== '/auth/me' && !staff) return fail(403, 'FORBIDDEN', 'Your role is not allowed to do this.')
  const adminOnly = path.startsWith('/admin') || path.endsWith('/revoke') || (path === '/centers' && method === 'POST')
  if (adminOnly && !isAdmin) return fail(403, 'FORBIDDEN', 'Administrator access is required.')

  if (path === '/health') return json({ status: 'ok' })

  if (path === '/auth/login' || path === '/auth/mfa/enroll' || path === '/auth/mfa/activate') {
    const found = users.find((x) => x.email === body.email?.toLowerCase())
    if (!found || body.password !== 'Password123!') return fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
    if (path === '/auth/mfa/enroll') return json({ secret: 'JBSWY3DPEHPK3PXP', otpauth_uri: `otpauth://totp/NPC:${found.email}?secret=JBSWY3DPEHPK3PXP&issuer=NPC` })
    if (!body.otp_code) return fail(401, 'MFA_REQUIRED', 'Enter the 6-digit code from your authenticator app.')
    if (body.otp_code !== '123456') return fail(401, 'INVALID_OTP', 'That code is not valid. Try the next one.')
    log('LOGIN', 'user', found.id, found.id)
    return json({ access_token: `mock.${found.id}`, token_type: 'bearer', expires_in_minutes: 30 })
  }
  if (path === '/auth/me') return json(me)

  if (path.startsWith('/verify/')) {
    const c = certs.find((x) => x.certificate_number === decodeURIComponent(path.slice(8)))
    if (!c) return json({ valid: false, status: 'NOT_FOUND' })
    return json({ valid: c.status === 'ACTIVE', status: c.status, certificate_number: c.certificate_number, event_type: c.event_type, holder_name: c.holder_name.replace(/(\S)\S+/g, '$1***'), issued_at: c.issued_at, hash_match: q.get('h') ? true : null })
  }

  if (path === '/registrations/queue') return json(slice(events.filter((e) => e.status === 'PENDING_VERIFICATION'), q))
  if (path === '/registrations/search') {
    const term = (q.get('q') || '').toLowerCase().split(' ')[0]
    const hits = events.filter((e) => (!q.get('event_type') || e.event_type === q.get('event_type')) && JSON.stringify(e).toLowerCase().includes(term))
    return json(hits.slice(0, Number(q.get('top_k') || 10)).map((e, i) => ({ score: +(0.92 - i * 0.04).toFixed(2), event: e })))
  }
  if (path === '/registrations') {
    let list = events
    if (q.get('status')) list = list.filter((e) => e.status === q.get('status'))
    if (q.get('event_type')) list = list.filter((e) => e.event_type === q.get('event_type'))
    if (q.get('state_code')) list = list.filter((e) => e.location.state_code === q.get('state_code'))
    if (q.get('lga_code')) list = list.filter((e) => e.location.lga_code === q.get('lga_code'))
    return json(slice(list, q))
  }
  let m = /^\/registrations\/([^/]+)(?:\/(documents|approve|reject))?(?:\/([^/]+))?$/.exec(path)
  if (m) {
    const ev = events.find((e) => e.event_id === m[1])
    if (!ev) return fail(404, 'NOT_FOUND', 'Application not found.')
    if (!m[2]) return json(ev)
    if (m[2] === 'documents') {
      if (!m[3]) return json(documents(ev.event_id))
      return new Response(new Blob([`Mock document ${m[3]} for ${ev.subject.full_name}`], { type: 'text/plain' }), { headers: { 'Content-Disposition': `attachment; filename="${m[3]}.txt"` } })
    }
    if (ev.status !== 'PENDING_VERIFICATION') return fail(409, 'INVALID_STATE', `Application is ${ev.status}, not pending verification.`)
    if (m[2] === 'approve') {
      if (ev.submitted_by === me.id) return fail(409, 'MAKER_CHECKER', 'You submitted this application, so someone else must approve it.')
      ev.status = 'APPROVED'
      ev.certificate_id = `cert-${ev.event_id}`
      const c = { certificate_id: ev.certificate_id, certificate_number: `NPC-${ev.event_type[0]}-2026-${ev.event_id.slice(-4)}`, event_id: ev.event_id, event_type: ev.event_type, holder_name: ev.subject.full_name, issued_at: new Date().toISOString(), status: 'ACTIVE', downloaded: false }
      certs.unshift(c)
      log('REGISTRATION_APPROVED', 'registration', ev.event_id, me.id)
      return json({ event_id: ev.event_id, status: 'APPROVED', certificate_id: c.certificate_id, certificate_number: c.certificate_number })
    }
    if (!body.reason || body.reason.length < 5) return fail(422, 'VALIDATION_ERROR', 'Validation failed.', [{ field: 'reason', message: 'Must be at least 5 characters.' }])
    ev.status = 'REJECTED'
    ev.rejection_reason = body.reason
    log('REGISTRATION_REJECTED', 'registration', ev.event_id, me.id)
    return json({ event_id: ev.event_id, status: 'REJECTED' })
  }

  if (path === '/citizens/lookup') {
    if (!!q.get('nin') === !!q.get('crn')) return fail(422, 'VALIDATION_ERROR', 'Provide exactly one of nin or crn.')
    const key = q.get('nin') || q.get('crn')
    const ev = events.find((e) => e.subject.nin === key || e.event_id.toUpperCase() === key.toUpperCase())
    if (!ev) return fail(404, 'NOT_FOUND', 'No citizen matches that number.')
    return json({ full_name: ev.subject.full_name, nin: ev.subject.nin, crn: ev.event_id.toUpperCase(), gender: ev.subject.gender, date_of_birth: ev.subject.date_of_birth, events: events.filter((e) => e.subject.nin === ev.subject.nin) })
  }
  if (path === '/identity/verify-nin') return /^\d{11}$/.test(body.nin || '') ? json({ valid: true, full_name: 'Verified Person', gender: 'FEMALE' }) : fail(422, 'VALIDATION_ERROR', 'NIN must be 11 digits.')
  if (path === '/identity/verify-face') return json({ match: true, score: 0.93 })

  if (path === '/certificates') return json(certs)
  m = /^\/certificates\/([^/]+)\/(download|reprint|revoke)$/.exec(path)
  if (m) {
    const c = certs.find((x) => x.certificate_id === m[1])
    if (!c) return fail(404, 'NOT_FOUND', 'Certificate not found.')
    if (m[2] === 'revoke') {
      if (!body.reason || body.reason.length < 5) return fail(422, 'VALIDATION_ERROR', 'Validation failed.', [{ field: 'reason', message: 'Must be at least 5 characters.' }])
      c.status = 'REVOKED'; log('CERTIFICATE_REVOKED', 'certificate', c.certificate_id, me.id)
      return json({ status: 'REVOKED' })
    }
    if (m[2] === 'download') {
      if (c.downloaded) return fail(409, 'REPRINT_REQUIRED', 'This certificate was already downloaded. Use reprint and give a reason.')
      c.downloaded = true
    } else {
      if (!body.reason || body.reason.length < 5) return fail(422, 'VALIDATION_ERROR', 'Validation failed.', [{ field: 'reason', message: 'Must be at least 5 characters.' }])
      log('CERTIFICATE_REPRINTED', 'certificate', c.certificate_id, me.id)
    }
    return new Response(pdf(), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${c.certificate_number}.pdf"` } })
  }

  if (path === '/centers') {
    if (method === 'POST') { centers.push(body); log('CENTER_CREATED', 'center', body.center_id, me.id); return json(body, 201) }
    return json(centers.filter((c) => (!q.get('state_code') || c.state_code === q.get('state_code')) && (!q.get('center_type') || c.center_type === q.get('center_type'))))
  }

  if (path === '/analytics/dashboard') return json(dashboard(q))
  if (path === '/analytics/heatmap') return json(counted(q.get('state_code'), q.get('event_type')).map((e) => ({ latitude: e.location.latitude, longitude: e.location.longitude, count: 1 + (e.event_id.charCodeAt(5) % 9) })))
  if (path === '/analytics/aggregate') return json(dashboard(q).regions.map((r) => ({ key: r.name, count: r.count })))
  if (path === '/ai/analytics/ask') {
    const d = dashboard(new URLSearchParams())
    return json({ answer: `Across the national register there are ${d.totals.total} recorded events: ${d.totals.births} births and ${d.totals.deaths} deaths. The leading cause of death is ${d.top_causes[0]?.cause || 'not available'}.`, data: d.regions, interpreted_query: { group_by: 'state', event_type: null } })
  }

  if (path === '/admin/users') {
    if (method === 'POST') {
      if (users.some((x) => x.email === body.email)) return fail(409, 'EMAIL_EXISTS', 'An account with that email already exists.')
      const nu = { id: `u-${users.length + 1}`, email: body.email, full_name: body.full_name, role: body.role, mfa_enabled: false }
      users.push(nu); log('USER_CREATED', 'user', nu.id, me.id)
      return json(nu, 201)
    }
    return json(slice(users, q))
  }
  if (path === '/admin/mda-clients') {
    const c = { client_id: `mda-${mdaClients.length + 1}`, name: body.name, scopes: body.scopes, created_at: new Date().toISOString() }
    mdaClients.push(c); log('MDA_KEY_ISSUED', 'mda_client', c.client_id, me.id)
    return json({ ...c, api_key: 'npc_live_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) }, 201)
  }
  if (path === '/admin/audit-logs/verify') return json({ intact: true, entries_checked: audit.length, first_broken_id: null })
  if (path === '/admin/audit-logs') {
    const list = audit.filter((a) => ['action', 'resource_type', 'resource_id', 'user_id'].every((k) => !q.get(k) || a[k] === q.get(k)))
    return json(slice(list, q))
  }
  return fail(404, 'NOT_FOUND', `No mock for ${method} ${path}`)
}
