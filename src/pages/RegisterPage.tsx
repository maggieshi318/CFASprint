import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { registerAccount } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, refreshUser } = useAuth()
  const fromState = (location.state as { from?: string } | null)?.from
  const redirectTo = fromState?.startsWith('/') ? fromState : '/onboarding'
  const [name, setName] = useState('New Candidate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [verifyHint, setVerifyHint] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setVerifyHint('')
    setLoading(true)
    try {
      const result = await registerAccount({ name, email, password })
      await login(email, password)
      if (result.dev?.verifyUrl) {
        setVerifyHint(`Dev verify link: ${result.dev.verifyUrl}`)
      } else {
        setVerifyHint('Check your inbox to verify your email address.')
      }
      await refreshUser()
      navigate(redirectTo)
    } catch {
      setError('Registration failed. Email may already exist.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <section className="auth-product-panel" aria-label="CFA Sprint value">
        <Link to="/" className="marketing-brand">
          <span className="marketing-brand-mark">CFA</span>
          <span>CFA Sprint</span>
        </Link>
        <h1>Create your CFA Level I study workspace.</h1>
        <p>Start free, save your progress, and upgrade when you need full mock exams and full-bank access.</p>
        <div className="auth-product-points">
          <span>Free starter</span>
          <span>Progress sync</span>
          <span>Upgrade anytime</span>
        </div>
      </section>
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Create account</h2>
        <p>Start your CFA Level I prep journey.</p>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        {verifyHint ? <p className="helper-text">{verifyHint}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <p className="helper-text">
          Already registered? <Link to="/login">Sign in</Link> | <Link to="/pricing">Compare plans</Link>
        </p>
      </form>
    </div>
  )
}
