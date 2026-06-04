import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { copyFor } from '../i18n/copy'

export default function AppLayout() {
  const { user, logout, locale, setLocale } = useAuth()
  const navigate = useNavigate()
  const t = copyFor(locale)
  const location = useLocation()
  const isStudyHub = location.pathname === '/study'
  const isAdmin = user?.role === 'admin'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app study-app">
      <header className="topbar">
        <div>
          <h1>{isAdmin ? 'Merchant Dashboard' : 'CFA Sprint'}</h1>
          <p>{isAdmin ? 'Real candidate registration, practice, and mock exam analytics' : t.layout.subtitle}</p>
        </div>
        <div className="topbar-right">
          {!isAdmin ? (
            <>
              <Link to="/user/courses" className="ghost-btn link-btn">
                {t.layout.backToCourses}
              </Link>
              <span className="exam-tag">
                {user?.examDaysRemaining != null
                  ? t.layout.examCountdown(user.examDaysRemaining)
                  : t.layout.setExamDate}
              </span>
              <button className="ghost-btn" onClick={() => void setLocale(locale === 'en' ? 'zh' : 'en')}>
                {locale === 'en' ? 'Chinese' : 'English'}
              </button>
            </>
          ) : null}
          <span className="user-tag">{user?.email}</span>
          <button className="ghost-btn" onClick={handleLogout}>
            {t.layout.logout}
          </button>
        </div>
      </header>

      {!isStudyHub ? (
        <nav className="tabs">
          {isAdmin ? (
            <NavLink to="/admin/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
              Data Analytics
            </NavLink>
          ) : (
            <>
              <NavLink to="/study/statistics" className={({ isActive }) => (isActive ? 'active' : '')}>
                {t.layout.nav.dashboard}
              </NavLink>
              <NavLink to="/study/sprint-plan" className={({ isActive }) => (isActive ? 'active' : '')}>
                {t.layout.nav.sprint}
              </NavLink>
              <NavLink to="/study/practice" className={({ isActive }) => (isActive ? 'active' : '')}>
                {t.layout.nav.questionBank}
              </NavLink>
              <NavLink to="/study/mock-exam" className={({ isActive }) => (isActive ? 'active' : '')}>
                {t.layout.nav.mock}
              </NavLink>
              <NavLink to="/study/review" className={({ isActive }) => (isActive ? 'active' : '')}>
                {t.layout.nav.review}
              </NavLink>
            </>
          )}
        </nav>
      ) : null}

      <main>
        <Outlet />
      </main>

      <footer className="app-footer">
        <NavLink to="/privacy">Privacy</NavLink>
        <span>|</span>
        <NavLink to="/terms">Terms</NavLink>
      </footer>
    </div>
  )
}
