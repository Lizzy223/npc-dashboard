import { NavLink, Outlet } from 'react-router-dom'
import { ROLE_LABEL, useAuth } from '../auth.jsx'

const officerNav = [
  ['/queue', 'Verification queue', '✔'],
  ['/records', 'Records & search', '🗂'],
  ['/lookup', 'Citizen lookup', '🔎'],
  ['/certificates', 'Certificates', '📜'],
  ['/dashboard', 'Dashboards', '📊'],
]
const adminNav = [
  ['/admin/users', 'Staff accounts', '👥'],
  ['/admin/mda', 'MDA API keys', '🔑'],
  ['/admin/centers', 'Registration centres', '🏢'],
  ['/admin/audit', 'Audit log', '🛡'],
]

export default function Layout() {
  const { user, isAdmin, signOut } = useAuth()
  const initials = (user?.full_name || user?.email || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const link = ([to, label, icon]) => (
    <NavLink key={to} to={to} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}><span aria-hidden="true">{icon}</span> {label}</NavLink>
  )
  return (
    <div className="dash">
      <aside className="side">
        <div className="side-brand"><span className="shield sm" aria-hidden="true">🛡</span><div><b>NPC eCRVS</b><small>Verification Desk</small></div></div>
        <nav aria-label="Main">
          <small className="caps muted">Civil registration</small>
          {officerNav.map(link)}
          {isAdmin && <><small className="caps muted mt">Administration</small>{adminNav.map(link)}</>}
          <small className="caps muted mt">Public</small>
          <NavLink to="/verify" className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}><span aria-hidden="true">✅</span> Verify certificate</NavLink>
        </nav>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <div className="user">
            <span className="avatar" aria-hidden="true">{initials}</span>
            <div><b>{user?.full_name || user?.email}</b><small>{ROLE_LABEL[user?.role] || user?.role}</small></div>
          </div>
          <button className="logout" onClick={() => signOut()}>Sign out</button>
        </header>
        <main className="main" id="main"><Outlet /></main>
      </div>
    </div>
  )
}
