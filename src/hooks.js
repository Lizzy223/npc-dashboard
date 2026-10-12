import { useCallback, useEffect, useRef, useState } from 'react'

/** Run an async loader whenever deps change; ignores stale responses. */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const run = useRef(0)
  const reload = useCallback(() => {
    const id = ++run.current
    setState((s) => ({ ...s, loading: true, error: null }))
    loader().then(
      (data) => id === run.current && setState({ data, error: null, loading: false }),
      (error) => id === run.current && setState({ data: null, error, loading: false }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

/**
 * Offset paging for endpoints that return a plain array with no total.
 * "Next" is offered while a full page comes back.
 */
export function usePaged(fetchPage, deps, limit = 25) {
  const [offset, setOffset] = useState(0)
  const key = JSON.stringify(deps)
  useEffect(() => { setOffset(0) }, [key])
  const state = useAsync(() => fetchPage({ limit, offset }), [key, offset, limit])
  const rows = Array.isArray(state.data) ? state.data : []
  return {
    ...state, rows, offset, limit,
    hasNext: rows.length === limit,
    hasPrev: offset > 0,
    next: () => setOffset(offset + limit),
    prev: () => setOffset(Math.max(0, offset - limit)),
  }
}
