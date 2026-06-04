import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPricingPlans, startCheckout } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import type { PricingPlan } from '../types'

type CheckoutPlanId = 'trial_monthly' | 'paid_lifetime' | 'community_sprint'

function planButtonLabel(planId: CheckoutPlanId, loadingPlan: string | null) {
  if (loadingPlan === planId) return 'Opening checkout...'
  if (planId === 'trial_monthly') return 'Start 7-day trial'
  if (planId === 'community_sprint') return 'Join community plan'
  return 'Get early bird price'
}

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

  const paidAccessActive = user?.plan === 'paid_lifetime' || user?.plan === 'community_sprint'
  const currentPlanName = user?.isPremium
    ? user.plan === 'trial_monthly'
      ? '7-Day Trial'
      : user.plan === 'community_sprint'
        ? 'Sprint Community Plan'
        : 'Early Bird Full Access'
    : 'Account Only'

  return (
    <section className="pricing-simple-page">
      <div className="pricing-simple-hero">
        <p className="marketing-kicker">CFA Level I prep, simplified</p>
        <h2>Start with a 7-day full-access trial.</h2>
        <p>
          Pay AED 9.9 to test the complete question bank. Keep access with the AED 99 early bird plan, or choose the
          AED 299 community plan if you want supervision and accountability.
        </p>
        <div className="pricing-simple-actions">
          <button type="button" className="marketing-primary" onClick={() => void handleCheckout('trial_monthly')}>
            Start trial - AED 9.9
          </button>
          <button type="button" className="marketing-secondary" onClick={() => void handleCheckout('paid_lifetime')}>
            Early Bird - AED 99
          </button>
        </div>
        <p className="helper-text">
          Current access: <strong>{currentPlanName}</strong>
          {!user
            ? ' | Create an account before checkout.'
            : user.isPremium
              ? ' | Your question bank access is active.'
              : ' | Choose the AED 9.9 trial to start practicing.'}
        </p>
      </div>

      {message ? <p className="result ok">{message}</p> : null}

      <div className="pricing-simple-grid">
        {plans
          .filter((plan) => plan.planId !== 'free')
          .map((plan) => {
            const checkoutPlan = plan.planId as CheckoutPlanId
            const alreadyActive =
              plan.planId === 'trial_monthly'
                ? Boolean(user?.isPremium)
                : plan.planId === 'paid_lifetime'
                  ? paidAccessActive
                  : user?.plan === 'community_sprint'

            return (
              <article
                key={plan.planId}
                className={`pricing-simple-card ${plan.highlighted ? 'highlight' : ''}`}
              >
                <span className="pricing-plan-label">{plan.badge || 'Plan'}</span>
                <h3>{plan.name}</h3>
                <p className="price">
                  {plan.originalPrice ? <span className="old-price">{plan.originalPrice}</span> : null}
                  {plan.price}
                </p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={alreadyActive || loadingPlan === plan.planId}
                  onClick={() => void handleCheckout(checkoutPlan)}
                >
                  {alreadyActive ? 'Access active' : planButtonLabel(checkoutPlan, loadingPlan)}
                </button>
              </article>
            )
          })}
      </div>

      <section className="pricing-simple-card referral-card">
        <span className="pricing-plan-label">Reference plan</span>
        <h3>Invite friends, earn Level II benefits</h3>
        <p>
          Share your referral code. For every new candidate who registers through your code and pays AED 99 or joins the
          community plan, you earn a CFA Level II question bank 30% discount credit.
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
