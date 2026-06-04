import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login, user, authReady } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from
  const redirectTo = fromState?.startsWith('/') ? fromState : '/user/courses'
  const [email, setEmail] = useState('candidate@example.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')

  useEffect(() => {
    if (authReady && user) {
      navigate(redirectTo, { replace: true })
    }
  }, [authReady, navigate, redirectTo, user])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ok = await login(email.trim().toLowerCase(), password)
    if (!ok) {
      setError('Please enter valid credentials.')
      return
    }
    navigate(redirectTo)
  }

  if (!authReady) {
    return (
      <div className="login-wrap">
        <section className="login-card">
          <p>Loading session...</p>
        </section>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <section className="auth-product-panel" aria-label="CFA Sprint overview">
        <Link to="/" className="marketing-brand">
          <span className="marketing-brand-mark">CFA</span>
          <span>CFA Sprint</span>
        </Link>
        <h1>Mobile-first CFA Level I practice for serious candidates.</h1>
        <p>Practice questions, timed mock exams, wrong-book review, notes, bookmarks, and progress statistics.</p>
        <div className="auth-product-points">
          <span>Phone</span>
          <span>Tablet</span>
          <span>Desktop</span>
        </div>
      </section>
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Sign in</h2>
        <p>Continue your CFA Level I prep.</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit">Continue</button>
        <p className="helper-text">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p className="helper-text">
          New user? <Link to="/register">Create account</Link> or <Link to="/pricing">view plans</Link>
        </p>
        <p className="helper-text">
          <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link>
        </p>
      </form>
    </div>
  )
}
