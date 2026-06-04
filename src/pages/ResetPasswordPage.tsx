import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/mockApi'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const result = await resetPassword(token, password)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h2>Invalid link</h2>
          <p className="helper-text">
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Set new password</h2>
        <label>
          New password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label>
          Confirm password
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error ? <div className="error">{error}</div> : null}
        {message ? <p className="result ok">{message}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Update password'}
        </button>
        {message ? (
          <p className="helper-text">
            <Link to="/login">Sign in with new password</Link>
          </p>
        ) : null}
      </form>
    </div>
  )
}
