import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export function Forbidden() {
  const { signOut } = useAuth()
  return (
    <div className="center-page">
      <div className="card narrow">
        <h1>Not allowed</h1>
        <p className="muted">Your role does not have permission to view this page or perform that action.</p>
        <div className="row"><Link className="btn-primary" to="/queue">Back to the queue</Link><button className="btn-light" onClick={() => signOut()}>Sign out</button></div>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="center-page">
      <div className="card narrow"><h1>Page not found</h1><p className="muted">That address does not exist.</p><Link className="btn-primary" to="/queue">Go to the queue</Link></div>
    </div>
  )
}
