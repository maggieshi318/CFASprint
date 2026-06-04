import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPricingPlans, startCheckout } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import type { PricingPlan } from '../types'

type CheckoutPlanId = 'trial_monthly' | 'paid_lifetime'

export default function PricingPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPricingPlans().then(setPlans)
  }, [])

  async function handleCheckout(planId: CheckoutPlanId) {
    if (!token) {
      navigate('/register', { state: { from: '/pricing' } })
      return
    }
    setLoadingPlan(planId)
    setMessage('')
    try {
      const result = await startCheckout(token, planId)
      if (result.url) {
        window.location.assign(result.url)
        return
      }
      setMessage(result.message || 'Payment is not configured yet.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout failed')
    } finally {
      setLoadingPlan(null)
    }
  }

  const trialPlan = plans.find((plan) => plan.planId === 'trial_monthly')
  const paidPlan = plans.find((plan) => plan.planId === 'paid_lifetime')
  const currentPlanName = user?.isPremium
    ? user.plan === 'trial_monthly'
      ? '1-Month Trial'
      : 'Full Access'
    : 'Account Only'

  return (
    <section className="pricing-simple-page">
      <div className="pricing-simple-hero">
        <p className="marketing-kicker">CFA Level I prep, simplified</p>
        <h2>Try the full question bank for one month.</h2>
        <p>
          Start with AED 9.9 for 30 days of full access. After the trial month, continue with Full Access for AED 99.
        </p>
        <div className="pricing-simple-actions">
          <button type="button" className="marketing-primary" onClick={() => void handleCheckout('trial_monthly')}>
            Start 1-month trial - AED 9.9
          </button>
          <button type="button" className="marketing-secondary" onClick={() => void handleCheckout('paid_lifetime')}>
            Unlock Full Access - AED 99
          </button>
        </div>
        <p className="helper-text">
          Current access: <strong>{currentPlanName}</strong>
          {!user
            ? ' | Create an account before checkout.'
            : user.isPremium
              ? ' | Full question bank access is active.'
              : ' | Choose the AED 9.9 trial to start practicing.'}
        </p>
      </div>

      {message ? <p className="result ok">{message}</p> : null}

      <div className="pricing-simple-grid">
        {trialPlan ? (
          <article className="pricing-simple-card highlight">
            <span className="pricing-plan-label">{trialPlan.badge || 'Best first step'}</span>
            <h3>{trialPlan.name}</h3>
            <p className="price">{trialPlan.price}</p>
            <ul>
              {trialPlan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              type="button"
              className="primary-btn"
              disabled={user?.isPremium || loadingPlan === trialPlan.planId}
              onClick={() => void handleCheckout('trial_monthly')}
            >
              {user?.isPremium ? 'Access active' : loadingPlan === trialPlan.planId ? 'Opening checkout...' : 'Start trial'}
            </button>
          </article>
        ) : null}

        {paidPlan ? (
          <article className="pricing-simple-card">
            <span className="pricing-plan-label">{paidPlan.badge || 'Continue after trial'}</span>
            <h3>{paidPlan.name}</h3>
            <p className="price">
              {paidPlan.originalPrice ? <span className="old-price">{paidPlan.originalPrice}</span> : null}
              {paidPlan.price}
            </p>
            <ul>
              {paidPlan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              type="button"
              className="primary-btn"
              disabled={user?.plan === 'paid_lifetime' || loadingPlan === paidPlan.planId}
              onClick={() => void handleCheckout('paid_lifetime')}
            >
              {user?.plan === 'paid_lifetime'
                ? 'Already unlocked'
                : loadingPlan === paidPlan.planId
                  ? 'Opening checkout...'
                  : 'Pay AED 99'}
            </button>
          </article>
        ) : null}
      </div>

      <section className="pricing-simple-card referral-card">
        <span className="pricing-plan-label">Reference plan</span>
        <h3>Invite friends, earn Level II benefits</h3>
        <p>
          Share your referral code. For every new candidate who registers through your code and pays AED 99, you earn a
          CFA Level II question bank 30% discount credit.
        </p>
        {user?.referralCode ? (
          <p className="helper-text">
            Your referral link:{' '}
            <strong>{`${window.location.origin}/register?ref=${user.referralCode}`}</strong>
          </p>
        ) : (
          <p className="helper-text">
            <Link to="/register">Create an account</Link> to get your referral link.
          </p>
        )}
      </section>
    </section>
  )
}
