import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { refreshUser } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Missing verification token.')
      setLoading(false)
      return
    }
    verifyEmail(token)
      .then(async (result) => {
        setMessage(result.message)
        if (result.user) await refreshUser(result.user)
        else await refreshUser()
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Verification failed'))
      .finally(() => setLoading(false))
  }, [token, refreshUser])

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2>Email verification</h2>
        {loading ? <p>Verifying...</p> : null}
        {error ? <div className="error">{error}</div> : null}
        {message ? <p className="result ok">{message}</p> : null}
        {!loading ? (
          <p className="helper-text">
            <Link to="/user/courses">Go to My Courses</Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
