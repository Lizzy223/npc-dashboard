import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, STAFF_ROLES, useAuth } from './auth.jsx'
import { ToastProvider, Spinner } from './components/ui.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Queue from './pages/Queue.jsx'
import Review from './pages/Review.jsx'
import Records from './pages/Records.jsx'
import Lookup from './pages/Lookup.jsx'
import Certificates from './pages/Certificates.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { AdminUsers, AdminMda, AdminCenters, AdminAudit } from './pages/Admin.jsx'
import Verify from './pages/Verify.jsx'
import { Forbidden, NotFound } from './pages/Misc.jsx'

/** Role-based route guard. roles omitted = any signed-in NPC staff member. */
function Guard({ roles = STAFF_ROLES, children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Spinner label="Restoring session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (!roles.includes(user.role)) return <Forbidden />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/verify/:number?" element={<Verify />} />
            <Route path="/forbidden" element={<Forbidden />} />
            <Route element={<Guard><Layout /></Guard>}>
              <Route index element={<Navigate to="/queue" replace />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/registrations/:eventId" element={<Review />} />
              <Route path="/records" element={<Records />} />
              <Route path="/lookup" element={<Lookup />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin/users" element={<Guard roles={['ADMIN']}><AdminUsers /></Guard>} />
              <Route path="/admin/mda" element={<Guard roles={['ADMIN']}><AdminMda /></Guard>} />
              <Route path="/admin/centers" element={<Guard roles={['ADMIN']}><AdminCenters /></Guard>} />
              <Route path="/admin/audit" element={<Guard roles={['ADMIN']}><AdminAudit /></Guard>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
