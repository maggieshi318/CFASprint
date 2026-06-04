import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/mockApi'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [devLink, setDevLink] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setDevLink('')
    try {
      const result = await requestPasswordReset(email)
      setMessage(result.message)
      if (result.dev?.resetUrl) setDevLink(result.dev.resetUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Reset password</h2>
        <p>Enter your account email and we will send a reset link.</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {message ? <p className="result ok">{message}</p> : null}
        {devLink ? (
          <p className="helper-text">
            Dev reset link:{' '}
            <a href={devLink} target="_blank" rel="noreferrer">
              Open reset page
            </a>
          </p>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        <p className="helper-text">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}
