export const BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

const TOKEN_KEY = 'npc.token'
const store = {
  get: (k) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { sessionStorage.setItem(k, v) } catch { /* storage unavailable */ } },
  del: (k) => { try { sessionStorage.removeItem(k) } catch { /* storage unavailable */ } },
}

export const getToken = () => store.get(TOKEN_KEY)
export const setToken = (t) => (t ? store.set(TOKEN_KEY, t) : store.del(TOKEN_KEY))

/** Error shape from the backend: { error: { code, message, fields? } } */
export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields || []
  }
}

// Lets the auth layer react to 401 / 403 without the client knowing about the router.
const listeners = new Set()
export const onAuthEvent = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const emit = (type) => listeners.forEach((fn) => fn(type))

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

/**
 * request(path, { method, query, body, blob, auth })
 * - auth: false for the "no login" endpoints
 * - blob: true to return { blob, filename } (document / PDF downloads)
 */
export async function request(path, { method = 'GET', query, body, blob = false, auth = true } = {}) {
  const headers = { Accept: blob ? '*/*' : 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const url = `${BASE_URL}${path}${qs(query)}`
  const init = { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }

  let res
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and the API address.')
  }

  if (!res.ok) {
    let err = {}
    try { err = (await res.json()).error || {} } catch { /* non-JSON error body */ }
    const e = new ApiError(res.status, err.code || `HTTP_${res.status}`, err.message || res.statusText || 'Request failed', err.fields)
    // A failed login is also a 401, so only treat it as session expiry when we sent a token.
    if (res.status === 401 && auth && token) emit('unauthorized')
    if (res.status === 403) emit('forbidden')
    throw e
  }

  if (blob) {
    const cd = res.headers.get('Content-Disposition') || ''
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)
    return { blob: await res.blob(), filename: m ? decodeURIComponent(m[1]) : null }
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path, query, opts) => request(path, { query, ...opts }),
  post: (path, body, opts) => request(path, { method: 'POST', body: body ?? {}, ...opts }),
}

/** Save a downloaded blob to disk, or open it in a new tab when it is viewable. */
export function deliverBlob({ blob, filename }, fallbackName = 'download', open = false) {
  const url = URL.createObjectURL(blob)
  if (open) {
    window.open(url, '_blank', 'noopener')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = filename || fallbackName
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
