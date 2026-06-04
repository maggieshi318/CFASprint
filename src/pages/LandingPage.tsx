import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const outcomes = [
  'Topic-based CFA Level I practice with answer review',
  'Timed mock exams that work on phone, tablet, and desktop',
  'Wrong questions, bookmarks, notes, and progress statistics',
]

const workflow = [
  { title: 'Diagnose', text: 'Start with your topic accuracy and weak areas.' },
  { title: 'Practice', text: 'Drill questions by topic, LOS, and question bank.' },
  { title: 'Simulate', text: 'Run timed mock sessions before exam day.' },
]

export default function LandingPage() {
  const { user } = useAuth()
  const primaryHref = user ? '/user/courses' : '/register'

  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <Link to="/" className="marketing-brand">
          <span className="marketing-brand-mark">CFA</span>
          <span>CFA Sprint</span>
        </Link>
        <nav>
          <Link to="/pricing">Pricing</Link>
          {user ? <Link to="/user/courses">My Courses</Link> : <Link to="/login">Sign in</Link>}
        </nav>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="marketing-kicker">CFA Level I question bank and mock exam platform</p>
          <h1>Practice every day, review smarter, and walk into Level I with a plan.</h1>
          <p className="marketing-lede">
            CFA Sprint gives candidates a mobile-ready practice workflow: topic drills, timed mocks, wrong-book review,
            notes, bookmarks, and progress statistics in one account.
          </p>
          <div className="marketing-actions">
            <Link to={primaryHref} className="marketing-primary">
              {user ? 'Continue studying' : 'Start free practice'}
            </Link>
            <Link to="/pricing" className="marketing-secondary">
              View plans
            </Link>
          </div>
          <div className="marketing-proof">
            <span>Free starter access</span>
            <span>Stripe-ready checkout</span>
            <span>PWA-ready for mobile</span>
          </div>
        </div>

        <div className="marketing-device" aria-label="Product preview">
          <div className="marketing-device-top">
            <span>Mock Exam</span>
            <strong>02:14:59</strong>
          </div>
          <div className="marketing-question">
            <p>Question 1 of 90</p>
            <h2>Material nonpublic information</h2>
            <div className="marketing-option active">A. No</div>
            <div className="marketing-option">B. Yes, because the information is not public</div>
            <div className="marketing-option">C. Yes, because the report is not public</div>
          </div>
          <div className="marketing-device-footer">
            <span>Progress 1%</span>
            <button type="button">Next</button>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-section-head">
          <p className="marketing-kicker">Built for real study sessions</p>
          <h2>Everything a candidate needs after work, on commute, or at a desk.</h2>
        </div>
        <div className="marketing-grid">
          {outcomes.map((item) => (
            <article key={item}>
              <h3>{item}</h3>
              <p>Designed for short practice bursts and full-length review sessions across screen sizes.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-workflow">
        {workflow.map((item) => (
          <article key={item.title}>
            <span>{item.title}</span>
            <p>{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
