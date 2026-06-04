import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const levelTabs = [
  { id: 'l1', label: 'Level I', active: true },
  { id: 'l2', label: 'Level II', active: false },
  { id: 'l3', label: 'Level III', active: false },
  { id: 'esg', label: 'CFA ESG', active: false },
]

export default function UserCenterLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isCoursesHome = location.pathname === '/user/courses'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const userLabel = user?.email?.split('@')[0]?.toUpperCase().slice(0, 12) || 'STUDENT'

  return (
    <div className="lr-home">
      <header className="lr-header">
        <div className="lr-header-left">
          <Link to="/" className="lr-brand">
            <span className="lr-brand-icon">CFA</span>
            <span className="lr-brand-name">CFA Sprint</span>
          </Link>
          <nav className="lr-product-nav">
            <span className="active">CFA</span>
            <span className="muted">FRM</span>
          </nav>
        </div>
        <div className="lr-header-right">
          <NavLink to="/pricing" className="lr-personal-link">
            Pricing
          </NavLink>
          {user?.role === 'admin' ? (
            <NavLink to="/admin/analytics" className="lr-personal-link">
              Merchant Dashboard
            </NavLink>
          ) : null}
          <NavLink to="/user/account" className="lr-personal-link">
            Personal Center
          </NavLink>
          <div className="lr-user-chip">
            <span className="lr-user-avatar">{userLabel.slice(0, 1)}</span>
            <span className="lr-user-id">{userLabel}</span>
          </div>
          <button type="button" className="lr-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {isCoursesHome ? (
        <>
          <div className="lr-level-tabs">
            {levelTabs.map((tab) => (
              <button key={tab.id} type="button" className={tab.active ? 'active' : ''} disabled={!tab.active}>
                {tab.label}
              </button>
            ))}
          </div>

          <section className="lr-hero commercial-user-hero">
            <p className="marketing-kicker">Question bank + mock exams</p>
            <h1>CFA Level I Full Prep</h1>
            <p>Study on phone, tablet, or desktop with one account. Drill topics, simulate mocks, and review mistakes.</p>
            <div className="marketing-actions">
              <Link to="/study/practice" className="marketing-primary">
                Start practice
              </Link>
              <Link to="/study/mock-exam" className="marketing-secondary">
                Take mock exam
              </Link>
            </div>
          </section>
        </>
      ) : (
        <div className="lr-subnav">
          <NavLink to="/user/courses">My Courses</NavLink>
          <NavLink to="/user/orders">My Orders</NavLink>
          <NavLink to="/user/account">Account</NavLink>
          <NavLink to="/user/messages">My Messages</NavLink>
        </div>
      )}

      <main className="lr-main">
        <Outlet />
      </main>

      <footer className="app-footer lr-footer">
        <Link to="/privacy">Privacy</Link>
        <span>|</span>
        <Link to="/terms">Terms</Link>
      </footer>
    </div>
  )
}
