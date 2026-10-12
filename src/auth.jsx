import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getToken, onAuthEvent, setToken } from './api/client.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export const STAFF_ROLES = ['NPC_OFFICER', 'ADMIN']
export const ROLE_LABEL = {
  NPC_OFFICER: 'NPC Officer', ADMIN: 'Administrator', FIELD_REGISTRAR: 'Field Registrar',
  MEDICAL_PRACTITIONER: 'Medical Practitioner', CITIZEN: 'Citizen',
}
const EXP_KEY = 'npc.exp'
const readExp = () => { try { return Number(sessionStorage.getItem(EXP_KEY)) || 0 } catch { return 0 } }
const writeExp = (v) => { try { v ? sessionStorage.setItem(EXP_KEY, String(v)) : sessionStorage.removeItem(EXP_KEY) } catch { /* storage unavailable */ } }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!getToken())
  const [notice, setNotice] = useState('')
  const timer = useRef(null)
  const navigate = useNavigate()

  const signOut = useCallback((message = '') => {
    clearTimeout(timer.current)
    setToken(null); writeExp(0); setUser(null); setNotice(message)
  }, [])

  const armExpiry = useCallback((exp) => {
    clearTimeout(timer.current)
    const ms = exp - Date.now()
    if (ms <= 0) return signOut('Your session expired. Sign in again.')
    timer.current = setTimeout(() => signOut('Your session expired. Sign in again.'), Math.min(ms, 2 ** 31 - 1))
  }, [signOut])

  // Restore a session on reload. GET /auth/me is the source of truth for the role.
  useEffect(() => {
    if (!getToken()) return
    const exp = readExp()
    if (exp && exp <= Date.now()) { signOut('Your session expired. Sign in again.'); setReady(true); return }
    api.get('/auth/me').then((u) => { setUser(u); if (exp) armExpiry(exp) }).catch(() => signOut()).finally(() => setReady(true))
  }, [armExpiry, signOut])

  useEffect(() => onAuthEvent((type) => {
    if (type === 'unauthorized') signOut('Your session expired. Sign in again.')
    if (type === 'forbidden') navigate('/forbidden', { replace: true })
  }), [navigate, signOut])

  const signIn = useCallback(async ({ access_token, expires_in_minutes }) => {
    setToken(access_token)
    const exp = Date.now() + (expires_in_minutes || 30) * 60_000
    writeExp(exp)
    try {
      const me = await api.get('/auth/me')
      setUser(me); setNotice(''); armExpiry(exp)
      return me
    } catch (e) { setToken(null); writeExp(0); throw e }
  }, [armExpiry])

  const value = useMemo(() => ({
    user, ready, notice, signIn, signOut,
    isStaff: !!user && STAFF_ROLES.includes(user.role),
    isAdmin: user?.role === 'ADMIN',
  }), [user, ready, notice, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
