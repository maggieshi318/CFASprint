import { Link } from 'react-router-dom'

export default function PaymentPage() {
  return (
    <section className="payment-page">
      <div className="payment-card">
        <p className="marketing-kicker">Payment required</p>
        <h2>Unlock Full Access</h2>
        <p>
          Full Access is AED 99 for a limited time. This page is the payment handoff step between the free trial and
          unlocked question bank access.
        </p>
        <div className="payment-summary">
          <span>Limited-time price</span>
          <strong>AED 99</strong>
          <small>Original price AED 188</small>
        </div>
        <p className="helper-text">
          A real payment link is not configured yet. Add `FULL_ACCESS_PAYMENT_URL` or Stripe keys on the server, then
          this button will take users to the payment provider instead of unlocking access directly.
        </p>
        <div className="payment-actions">
          <Link to="/pricing" className="marketing-secondary">
            Back to pricing
          </Link>
          <Link to="/study/practice" className="marketing-primary">
            Continue free trial
          </Link>
        </div>
      </div>
    </section>
  )
}
