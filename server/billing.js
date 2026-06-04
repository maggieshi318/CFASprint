import Stripe from 'stripe'
import { config } from './config.js'
import { recordOrder } from './orders.js'

const PLAN_META = {
  free: {
    name: 'Free Trial',
    price: '$0',
    features: [
      'Try real CFA Level I practice questions',
      '20 answered questions per day',
      'Basic statistics dashboard',
      'Upgrade prompts when you need more',
    ],
  },
  paid_lifetime: {
    name: 'Full Access',
    price: 'AED 99',
    originalPrice: 'AED 188',
    badge: 'Limited-time 50% off',
    highlighted: true,
    features: [
      'Full Level I question bank',
      'Unlimited daily practice',
      'Wrong-book, favorites, and analytics',
      'Full mock exam mode',
    ],
  },
}

const PLAN_ENTITLEMENTS = {
  free: {
    bankAccess: 'starter',
    dailyQuestionLimit: 20,
    mockQuestionLimit: 3,
    mockSubmissionLimit: 1,
    analytics: 'basic',
  },
  paid_lifetime: {
    bankAccess: 'full',
    dailyQuestionLimit: null,
    mockQuestionLimit: null,
    mockSubmissionLimit: null,
    analytics: 'full',
  },
  admin: {
    bankAccess: 'full',
    dailyQuestionLimit: null,
    mockQuestionLimit: null,
    mockSubmissionLimit: null,
    analytics: 'merchant',
  },
}

export function getPricingPlans() {
  return Object.entries(PLAN_META).map(([planId, meta]) => ({
    planId,
    ...meta,
    checkoutable: planId !== 'free',
  }))
}

export function isPaidPlan(plan) {
  return plan === 'paid_lifetime'
}

export function hasActiveSubscription(userRow) {
  if (!userRow) return false
  if (userRow.role === 'admin') return true
  if (!isPaidPlan(userRow.plan)) return false
  if (userRow.subscription_status !== 'active') return false
  if (!userRow.subscription_expires_at) return true
  return new Date(userRow.subscription_expires_at).getTime() > Date.now()
}

export function getPlanEntitlements(userRow) {
  if (userRow?.role === 'admin') return PLAN_ENTITLEMENTS.admin
  const active = hasActiveSubscription(userRow)
  const plan = active ? userRow?.plan : 'free'
  return PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free
}

export function getSubscriptionSnapshot(userRow) {
  const active = hasActiveSubscription(userRow)
  return {
    plan: userRow?.plan || 'free',
    subscriptionStatus: userRow?.subscription_status || 'inactive',
    subscriptionExpiresAt: userRow?.subscription_expires_at || null,
    isPremium: active,
    entitlements: getPlanEntitlements(userRow),
  }
}

function getStripeClient() {
  if (!config.stripeSecretKey) return null
  return new Stripe(config.stripeSecretKey)
}

function getPriceId(planId) {
  if (planId === 'paid_lifetime') return config.stripePriceFullAccess || config.stripePricePassPack
  return null
}

export function activatePlan(db, userId, planId, extra = {}) {
  const expiresAt = null

  db.prepare(
    `
    UPDATE users
    SET plan = ?, subscription_status = ?, subscription_expires_at = ?,
        stripe_customer_id = COALESCE(?, stripe_customer_id),
        stripe_subscription_id = COALESCE(?, stripe_subscription_id)
    WHERE id = ?
  `,
  ).run(
    planId,
    planId === 'free' ? 'inactive' : 'active',
    expiresAt,
    extra.stripeCustomerId || null,
    extra.stripeSubscriptionId || null,
    userId,
  )

  if (planId !== 'free') {
    recordOrder(db, userId, planId, expiresAt)
  }
}

export async function createCheckoutSession(db, userRow, planId) {
  if (!isPaidPlan(planId)) {
    throw new Error('Invalid paid plan')
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return {
      mode: config.fullAccessPaymentUrl ? 'payment_link' : 'payment_required',
      url: config.fullAccessPaymentUrl || '/payment/full-access',
      message: config.fullAccessPaymentUrl
        ? 'Redirecting to payment.'
        : 'Payment is not configured yet. Full Access will not unlock until payment is completed.',
    }
  }

  const priceId = getPriceId(planId)
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for plan ${planId}`)
  }

  let customerId = userRow.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userRow.email,
      name: userRow.name,
      metadata: { userId: String(userRow.id) },
    })
    customerId = customer.id
    db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, userRow.id)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.appUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/pricing?checkout=cancelled`,
    client_reference_id: String(userRow.id),
    metadata: { userId: String(userRow.id), planId },
  })

  return { mode: 'stripe', url: session.url }
}

export function handleStripeWebhook(db, rawBody, signature) {
  const stripe = getStripeClient()
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  if (!config.stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = Number(session.client_reference_id || session.metadata?.userId)
    const planId = session.metadata?.planId
    if (userId && isPaidPlan(planId)) {
      activatePlan(db, userId, planId, {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      })
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const userId = Number(subscription.metadata?.userId)
    if (!userId) return event.type

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      const planId = subscription.metadata?.planId
      if (isPaidPlan(planId)) {
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
        db.prepare(
          `
          UPDATE users
          SET plan = ?, subscription_status = 'active', subscription_expires_at = ?,
              stripe_subscription_id = ?
          WHERE id = ?
        `,
        ).run(planId, periodEnd, subscription.id, userId)
      }
    } else {
      db.prepare(
        `
        UPDATE users
        SET plan = 'free', subscription_status = 'inactive', subscription_expires_at = NULL
        WHERE id = ?
      `,
      ).run(userId)
    }
  }

  return event.type
}
