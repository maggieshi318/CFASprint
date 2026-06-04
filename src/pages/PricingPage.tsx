import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPricingPlans, startCheckout } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import type { PricingPlan } from '../types'

export default function PricingPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPricingPlans().then(setPlans)
  }, [])

  async function handleCheckout() {
    if (!token) {
      navigate('/register', { state: { from: '/pricing' } })
      return
    }
    setLoadingPlan('paid_lifetime')
    setMessage('')
    try {
      const result = await startCheckout(token, 'paid_lifetime')
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

  const freePlan = plans.find((plan) => plan.planId === 'free')
  const paidPlan = plans.find((plan) => plan.planId === 'paid_lifetime')
  const currentPlanName = user?.isPremium ? 'Full Access' : 'Free Trial'

  return (
    <section className="pricing-simple-page">
      <div className="pricing-simple-hero">
        <p className="marketing-kicker">CFA Level I prep, simplified</p>
        <h2>Stop wasting time guessing what to practice next.</h2>
        <p>
          Start with a free daily trial. When the 20-question limit gets in your way, unlock the full question bank and
          mock exam mode with one payment.
        </p>
        <div className="pricing-simple-actions">
          <Link to={user ? '/study/practice' : '/register'} className="marketing-primary">
            Start free trial
          </Link>
          <button type="button" className="marketing-secondary" onClick={() => void handleCheckout()}>
            Unlock for AED 99
          </button>
        </div>
        <p className="helper-text">
          Current access: <strong>{currentPlanName}</strong>
          {!user ? ' | Create an account to save progress.' : user.isPremium ? ' | Unlimited practice enabled.' : ' | 20 questions/day.'}
        </p>
      </div>

      {message ? <p className="result ok">{message}</p> : null}

      <div className="pricing-simple-grid">
        {freePlan ? (
          <article className="pricing-simple-card">
            <span className="pricing-plan-label">Free trial</span>
            <h3>{freePlan.name}</h3>
            <p className="price">{freePlan.price}</p>
            <ul>
              {freePlan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link to={user ? '/study/practice' : '/register'} className="primary-btn pricing-link-btn">
              Start free
            </Link>
          </article>
        ) : null}

        {paidPlan ? (
          <article className="pricing-simple-card highlight">
            <span className="pricing-plan-label">{paidPlan.badge || 'Limited-time offer'}</span>
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
              disabled={user?.isPremium || loadingPlan === paidPlan.planId}
              onClick={() => void handleCheckout()}
            >
              {user?.isPremium ? 'Already unlocked' : loadingPlan ? 'Opening checkout...' : 'Pay AED 99 once'}
            </button>
          </article>
        ) : null}
      </div>
    </section>
  )
}
