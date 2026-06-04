import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const { user, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <div className="login-wrap">
        <section className="login-card">
          <p>Loading session...</p>
        </section>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/user/courses" replace />
  if (user.role === 'admin' && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin/analytics" replace />
  }

  if (!user.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (user.onboardingCompleted && location.pathname === '/onboarding') {
    return <Navigate to="/user/courses" replace />
  }

  return <Outlet />
}
