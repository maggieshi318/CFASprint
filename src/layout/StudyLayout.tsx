import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useEffect } from 'react'

import { fetchReview } from '../api/mockApi'

import { useAuth } from '../auth/AuthContext'

import { useStudy } from '../store/StudyContext'

import { STUDY_REVIEW_CHANGED } from '../utils/studyReview'

import StudySidebarPanels from '../components/StudySidebarPanels'



const primaryNavItems = [

  { to: '/study/statistics', label: 'Statistics', icon: '📊', end: true },

  { to: '/study/practice', label: 'Question Bank', icon: '📘', end: false },

]



export default function StudyLayout() {

  const { user, logout, token } = useAuth()

  const { setFromServer } = useStudy()

  const navigate = useNavigate()

  const userLabel = user?.email?.split('@')[0]?.toUpperCase().slice(0, 12) || 'STUDENT'



  useEffect(() => {

    if (!token) return

    const syncReview = () => {

      fetchReview(token)

        .then(setFromServer)

        .catch(() => {

          // keep local state if refresh fails

        })

    }

    syncReview()

    window.addEventListener(STUDY_REVIEW_CHANGED, syncReview)

    return () => window.removeEventListener(STUDY_REVIEW_CHANGED, syncReview)

  }, [token, setFromServer])



  function handleLogout() {

    logout()

    navigate('/login')

  }



  return (

    <div className="study-shell">

      <header className="study-topbar">

        <div className="study-topbar-left">

          <Link to="/user/courses" className="lr-brand">

            <span className="lr-brand-icon">CFA</span>

            <span className="lr-brand-name">CFA Sprint</span>

          </Link>

        </div>

        <div className="study-topbar-right">

          <Link to="/user/account" className="lr-personal-link">

            <span className="lr-personal-icon">👤</span>

            Personal Center

          </Link>

          <div className="lr-user-chip">

            <span className="lr-user-avatar">{userLabel.slice(0, 1)}</span>

            <span className="lr-user-id">{userLabel}</span>

          </div>

          <Link to="/user/courses" className="study-back-link">

            ← My Courses

          </Link>

          <button type="button" className="lr-logout-btn" onClick={handleLogout}>

            Logout

          </button>

        </div>

      </header>



      <div className="study-body">

        <main className="study-content study-content-stacked">

          <div className="study-nav-rows">

            <nav className="study-nav-row study-nav-row-primary" aria-label="Study sections">

              {primaryNavItems.map((item) => (

                <NavLink

                  key={item.to}

                  to={item.to}

                  end={item.end}

                  className={({ isActive }) => `study-nav-tab ${isActive ? 'active' : ''}`}

                >

                  <span className="study-sidebar-icon">{item.icon}</span>

                  {item.label}

                </NavLink>

              ))}

            </nav>

            <nav className="study-nav-row study-nav-row-secondary" aria-label="Study tools">

              <StudySidebarPanels />

            </nav>

          </div>

          <div className="study-page-body">

            <Outlet />

          </div>

        </main>

      </div>

    </div>

  )

}


