import { Link, useParams } from 'react-router-dom'

export default function PaymentPage() {
  const { planId } = useParams()
  const isTrial = planId === 'trial_monthly'

  return (
    <section className="payment-page">
      <div className="payment-card">
        <p className="marketing-kicker">Payment required</p>
        <h2>{isTrial ? 'Start 1-Month Trial' : 'Unlock Full Access'}</h2>
        <p>
          {isTrial
            ? 'The 1-month trial is AED 9.9 and unlocks the full CFA Level I question bank for 30 days.'
            : 'Full Access is AED 99 and keeps the full CFA Level I question bank unlocked.'}
        </p>
        <div className="payment-summary">
          <span>{isTrial ? 'Trial price' : 'Full Access price'}</span>
          <strong>{isTrial ? 'AED 9.9' : 'AED 99'}</strong>
          <small>{isTrial ? '30 days full access' : 'Original price AED 188'}</small>
        </div>
        <p className="helper-text">
          A real payment link is not configured yet. Add {isTrial ? '`TRIAL_PAYMENT_URL`' : '`FULL_ACCESS_PAYMENT_URL`'} or
          Stripe price IDs on the server, then this page will redirect users to the payment provider.
        </p>
        <div className="payment-actions">
          <Link to="/pricing" className="marketing-secondary">
            Back to pricing
          </Link>
          <Link to="/study/practice" className="marketing-primary">
            Back to question bank
          </Link>
        </div>
      </div>
    </section>
  )
}
