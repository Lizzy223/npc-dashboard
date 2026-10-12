import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client.js'
import { titleCase } from '../format.js'

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const t = useRef(null)
  const show = useCallback((message, kind = 'ok') => {
    clearTimeout(t.current)
    setToast({ message, kind })
    t.current = setTimeout(() => setToast(null), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div className={'toast ' + toast.kind} role="status">{toast.message}</div>}
    </ToastCtx.Provider>
  )
}

/* ---------- small pieces ---------- */
export function StatusBadge({ status }) {
  return <span className={'sbadge s-' + String(status).toLowerCase()}>{titleCase(status)}</span>
}
export const TypeTag = ({ type }) => <span className={'ttag t-' + String(type).toLowerCase()}>{titleCase(type)}</span>

export function Spinner({ label = 'Loading' }) {
  return <div className="spinner" role="status"><i />{label}…</div>
}

/** Renders an ApiError, including per-field 422 messages. */
export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  const fields = error instanceof ApiError ? error.fields : []
  return (
    <div className="error" role="alert">
      <b>{error.message || 'Something went wrong.'}</b>
      {Array.isArray(fields) && fields.length > 0 && (
        <ul>{fields.map((f, i) => <li key={i}>{[f.field || f.loc?.join?.('.'), f.message || f.msg].filter(Boolean).join(': ')}</li>)}</ul>
      )}
      {onRetry && <button type="button" className="link-btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {actions && <div className="row">{actions}</div>}
    </div>
  )
}

export function Empty({ children = 'Nothing to show.' }) {
  return <div className="empty">{children}</div>
}

export function Pager({ paged }) {
  const { offset, rows, hasPrev, hasNext, prev, next, loading } = paged
  return (
    <div className="pager">
      <small className="muted">{rows.length ? `Showing ${offset + 1}–${offset + rows.length}` : 'No rows'}</small>
      <div className="row">
        <button className="btn-light" disabled={!hasPrev || loading} onClick={prev}>← Previous</button>
        <button className="btn-light" disabled={!hasNext || loading} onClick={next}>Next →</button>
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="row between"><h2>{title}</h2><button className="x" aria-label="Close" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  )
}

/** Dialog that collects a reason (min/max length) and runs an async action. */
export function ReasonDialog({ title, intro, min = 5, max = 500, confirmLabel, danger, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const valid = reason.trim().length >= min && reason.length <= max
  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setError(null)
    try { await onSubmit(reason.trim()); onClose() } catch (err) { setError(err); setBusy(false) }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="stack-form">
        {intro && <p className="muted">{intro}</p>}
        <label htmlFor="reason">Reason (at least {min} characters)</label>
        <textarea id="reason" className="field" rows={4} maxLength={max} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        <small className="muted">{reason.trim().length}/{max}</small>
        <ErrorNote error={error} />
        <div className="row end">
          <button type="button" className="btn-light" onClick={onClose}>Cancel</button>
          <button type="submit" className={danger ? 'btn-danger' : 'btn-primary'} disabled={!valid || busy}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </form>
    </Modal>
  )
}

export function Select({ label, value, onChange, options, any = 'All' }) {
  return (
    <label className="filter">{label}
      <select className="field sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{any}</option>
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{titleCase(o)}</option>))}
      </select>
    </label>
  )
}

export function Input({ label, ...rest }) {
  return <label className="filter">{label}<input className="field sm" {...rest} onChange={(e) => rest.onChange(e.target.value)} /></label>
}

export function KeyValue({ data }) {
  const rows = Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
  if (!rows.length) return <Empty>No details recorded.</Empty>
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (<div key={k}><dt>{titleCase(k)}</dt><dd>{String(v)}</dd></div>))}
    </dl>
  )
}

export const NIGERIA_STATES = [
  ['AB', 'Abia'], ['AD', 'Adamawa'], ['AK', 'Akwa Ibom'], ['AN', 'Anambra'], ['BA', 'Bauchi'], ['BY', 'Bayelsa'], ['BE', 'Benue'], ['BO', 'Borno'],
  ['CR', 'Cross River'], ['DE', 'Delta'], ['EB', 'Ebonyi'], ['ED', 'Edo'], ['EK', 'Ekiti'], ['EN', 'Enugu'], ['FC', 'FCT'], ['GO', 'Gombe'],
  ['IM', 'Imo'], ['JI', 'Jigawa'], ['KD', 'Kaduna'], ['KN', 'Kano'], ['KT', 'Katsina'], ['KE', 'Kebbi'], ['KO', 'Kogi'], ['KW', 'Kwara'],
  ['LA', 'Lagos'], ['NA', 'Nasarawa'], ['NI', 'Niger'], ['OG', 'Ogun'], ['ON', 'Ondo'], ['OS', 'Osun'], ['OY', 'Oyo'], ['PL', 'Plateau'],
  ['RV', 'Rivers'], ['SO', 'Sokoto'], ['TA', 'Taraba'], ['YO', 'Yobe'], ['ZA', 'Zamfara'],
]
