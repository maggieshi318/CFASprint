import { Link, useParams } from 'react-router-dom'

export default function PaymentPage() {
  const { planId } = useParams()
  const isTrial = planId === 'trial_monthly'
  const isCommunity = planId === 'community_sprint'

  return (
    <section className="payment-page">
      <div className="payment-card">
        <p className="marketing-kicker">Payment required</p>
        <h2>{isTrial ? 'Start 7-Day Trial' : isCommunity ? 'Join Sprint Community Plan' : 'Unlock Early Bird Full Access'}</h2>
        <p>
          {isTrial
            ? 'The 7-day trial is AED 9.9 and unlocks the full CFA Level I question bank for one week.'
            : isCommunity
              ? 'The Sprint Community Plan is AED 299 and includes full access plus supervision and study accountability.'
              : 'Early Bird Full Access is AED 99 and keeps the full CFA Level I question bank unlocked.'}
        </p>
        <div className="payment-summary">
          <span>{isTrial ? 'Trial price' : isCommunity ? 'Community plan price' : 'Early bird price'}</span>
          <strong>{isTrial ? 'AED 9.9' : isCommunity ? 'AED 299' : 'AED 99'}</strong>
          <small>{isTrial ? '7 days full access' : isCommunity ? 'Full access + supervision' : 'Standard price AED 199'}</small>
        </div>
        <p className="helper-text">
          A real payment link is not configured yet. Add{' '}
          {isTrial ? '`TRIAL_PAYMENT_URL`' : isCommunity ? '`COMMUNITY_PAYMENT_URL`' : '`FULL_ACCESS_PAYMENT_URL`'} or
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
