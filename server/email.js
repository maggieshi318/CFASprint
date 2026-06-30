/**
 * email.js - CFA Sprint transactional email via Resend
 *
 * 4 emails in the activation funnel:
 *   1. welcome         - sent immediately on registration
 *   2. inactive_24h    - sent if user has not logged in 24h after registration
 *   3. first_practice  - sent after user completes their first 10 questions
 *   4. trial_expiring  - sent 3 days before trial expires
 */

import { config } from './config.js'

const RESEND_API = 'https://api.resend.com/emails'
const FROM = config.resendFrom || 'CFA Sprint <noreply@cfasprint.com>'
const APP_URL = config.appUrl || 'https://cfasprint.com'

function baseEmail({ title, body, ctaHref, ctaLabel, footer = 'Maggie, CFA Sprint' }) {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.55">
  <h2 style="color:#2563eb;margin:0 0 18px">${title}</h2>
  ${body}
  <p style="margin:24px 0">
    <a href="${ctaHref}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
      ${ctaLabel}
    </a>
  </p>
  <p style="color:#6b7280;font-size:14px;margin-top:28px">
    Questions or feedback? Just reply to this email.<br>
    ${footer}
  </p>
</div>`
}

export function shouldMarkEmailSent(result) {
  return Boolean(result?.id)
}

export function buildWelcomeEmail({ name, email }) {
  return {
    to: email,
    subject: 'Welcome to CFA Sprint - your 7-day trial is active',
    html: baseEmail({
      title: `Hi ${name}, welcome to CFA Sprint`,
      body: `
  <p>Your account is active and your 7-day trial has started.</p>
  <p><strong>Recommended first step:</strong><br>
  Choose your weakest topic, answer 10 practice questions, then open AI Tutor to review the explanations.
  That is the fastest way to find the gaps that are costing you points.</p>`,
      ctaHref: APP_URL,
      ctaLabel: 'Start practicing',
    }),
  }
}

export function buildInactiveEmail({ name, email }) {
  return {
    to: email,
    subject: 'CFA Sprint is ready when you are',
    html: baseEmail({
      title: `Hi ${name}`,
      body: `
  <p>You created your CFA Sprint account, but you have not started your first practice session yet.</p>
  <p>Five minutes is enough to complete a short set and see where your current weak areas are.
  Start with one topic and let AI Tutor explain the questions you miss.</p>`,
      ctaHref: APP_URL,
      ctaLabel: 'Start your first set',
    }),
  }
}

export function buildFirstPracticeEmail({ name, email }) {
  return {
    to: email,
    subject: 'Your AI Tutor review is ready',
    html: baseEmail({
      title: `Nice work, ${name}`,
      body: `
  <p>You completed your first practice set in CFA Sprint.</p>
  <p>Now review the questions with AI Tutor. It will show where your reasoning broke down,
  not just which answer choice was correct.</p>`,
      ctaHref: APP_URL,
      ctaLabel: 'Review with AI Tutor',
    }),
  }
}

export function buildTrialExpiringEmail({ name, email, expiresAt }) {
  const expireDate = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return {
    to: email,
    subject: `Your CFA Sprint trial ends soon (${expireDate})`,
    html: baseEmail({
      title: `Hi ${name}`,
      body: `
  <p>Your CFA Sprint trial is scheduled to end on <strong>${expireDate}</strong>.</p>
  <p>If the practice bank, AI Tutor, or study reports helped you find weak areas faster,
  you can keep full access through your final exam prep window.</p>`,
      ctaHref: `${APP_URL}/pricing`,
      ctaLabel: 'View plans',
    }),
  }
}

async function send({ to, subject, html }) {
  if (!config.resendApiKey) {
    console.log(`[email] Resend not configured - would send "${subject}" to ${to}`)
    return { skipped: true }
  }
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[email] Resend error:', data)
      return { error: data }
    }
    console.log(`[email] Sent "${subject}" to ${to} - id: ${data.id}`)
    return { id: data.id }
  } catch (err) {
    console.error('[email] fetch error:', err.message)
    return { error: err.message }
  }
}

export async function sendWelcomeEmail(payload) {
  return send(buildWelcomeEmail(payload))
}

export async function sendInactiveEmail(payload) {
  return send(buildInactiveEmail(payload))
}

export async function sendFirstPracticeEmail(payload) {
  return send(buildFirstPracticeEmail(payload))
}

export async function sendTrialExpiringEmail(payload) {
  return send(buildTrialExpiringEmail(payload))
}
