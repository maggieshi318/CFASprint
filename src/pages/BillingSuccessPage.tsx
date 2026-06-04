import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function BillingSuccessPage() {
  const { token, refreshUser } = useAuth()

  useEffect(() => {
    if (!token) return
    void refreshUser()
  }, [token, refreshUser])

  return (
    <section className="panel">
      <h2>Payment Successful</h2>
      <p>Your subscription is being activated. Premium features unlock once Stripe confirms payment.</p>
      <p className="helper-text">
        <Link to="/user/courses">Go to My Courses</Link> · <Link to="/user/orders">View orders</Link>
      </p>
    </section>
  )
}
