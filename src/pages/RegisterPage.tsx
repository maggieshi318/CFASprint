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
  const referralCode = new URLSearchParams(location.search).get('ref')?.trim() || ''
  const [name, setName] = useState('New Candidate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [verifyHint, setVerifyHint] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setVerifyHint('')
    setLoading(true)
    try {
      const result = await registerAccount({ name, email, password, referralCode, inviteCode })
      await login(email, password)
      if (result.dev?.verifyUrl) {
        setVerifyHint(`Dev verify link: ${result.dev.verifyUrl}`)
      } else {
        setVerifyHint('Check your inbox to verify your email address.')
      }
      await refreshUser()
      navigate(redirectTo)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed. Email may already exist.')
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
        <p>Invite-only beta access. Use an internal test code to unlock a 7-day full-access trial.</p>
        <div className="auth-product-points">
          <span>Invite-only beta</span>
          <span>Progress sync</span>
          <span>7-day full trial</span>
        </div>
      </section>
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Create account</h2>
        <div className="invite-code-callout">
          <strong>Internal beta requires a registration code.</strong>
          <span>Ask the admin for a code, then enter it below to unlock your 7-day full-access trial.</span>
        </div>
        {referralCode ? <p className="helper-text">Referral code applied: {referralCode}</p> : null}
        <label className="invite-code-field">
          Internal test registration code
          <input
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="CFA-ABC123"
            autoComplete="one-time-code"
          />
        </label>
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
          {loading ? 'Creating...' : 'Create account with code'}
        </button>
        <p className="helper-text">
          Already registered? <Link to="/login">Sign in</Link> | <Link to="/pricing">Compare plans</Link>
        </p>
      </form>
    </div>
  )
}
