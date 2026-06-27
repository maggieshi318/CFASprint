/**
 * email.js — CFA Sprint transactional email via Resend
 *
 * 4 emails in the activation funnel:
 *   1. welcome         — sent immediately on registration
 *   2. inactive_24h    — sent if user hasn't logged in 24h after registration
 *   3. first_practice  — sent after user completes their first 10 questions
 *   4. trial_expiring  — sent 3 days before trial expires
 */

import { config } from './config.js'

const RESEND_API = 'https://api.resend.com/emails'
const FROM = config.resendFrom || 'CFA Sprint <noreply@cfasprint.com>'
const APP_URL = config.appUrl || 'https://cfasprint.com'

async function send({ to, subject, html }) {
  if (!config.resendApiKey) {
    console.log(`[email] Resend not configured — would send "${subject}" to ${to}`)
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
    console.log(`[email] Sent "${subject}" to ${to} — id: ${data.id}`)
    return { id: data.id }
  } catch (err) {
    console.error('[email] fetch error:', err.message)
    return { error: err.message }
  }
}

// ─── Email 1: Welcome ────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ name, email }) {
  return send({
    to: email,
    subject: '你的 CFA Sprint 账号已就绪 👋',
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#2563eb">Hi ${name}，欢迎来到 CFA Sprint</h2>
  <p>你的账号已激活，7天试用现在开始计时。</p>
  <p><strong>建议第一步：</strong><br>
  找你最弱的科目，做10道题，然后点开 AI Tutor 看解析——<br>
  这是整个产品里最有价值的功能。</p>
  <p style="margin:24px 0">
    <a href="${APP_URL}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      开始练习 →
    </a>
  </p>
  <p style="color:#666;font-size:14px">
    做完告诉我感觉怎么样——直接回复这封邮件就行。<br>
    — Maggie，CFA Sprint
  </p>
</div>`,
  })
}

// ─── Email 2: 24h Inactive ───────────────────────────────────────────────────

export async function sendInactiveEmail({ name, email }) {
  return send({
    to: email,
    subject: '你还没开始——但现在还来得及',
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2>Hi ${name}</h2>
  <p>你昨天注册了 CFA Sprint，但还没做第一道题。</p>
  <p>距离8月考试还有几周。<strong>5分钟</strong>就能完成第一组练习，<br>
  帮你找到你现在最大的知识漏洞。</p>
  <p style="margin:24px 0">
    <a href="${APP_URL}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      做第一组题 →
    </a>
  </p>
  <p style="color:#666;font-size:14px">— Maggie，CFA Sprint</p>
</div>`,
  })
}

// ─── Email 3: First Practice Complete ───────────────────────────────────────

export async function sendFirstPracticeEmail({ name, email }) {
  return send({
    to: email,
    subject: '做完了——AI 给你的分析在这里',
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2>Hi ${name}，做完第一组了 🎉</h2>
  <p>你刚完成了第一次练习。</p>
  <p>现在去看一下 <strong>AI Tutor 的解析</strong>——<br>
  它会告诉你每道错题的思路在哪一步出了问题，<br>
  而不只是告诉你答案是B。</p>
  <p style="margin:24px 0">
    <a href="${APP_URL}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      查看 AI 解析 →
    </a>
  </p>
  <p style="color:#666;font-size:14px">
    感觉怎么样？直接回复这封邮件告诉我。<br>
    — Maggie，CFA Sprint
  </p>
</div>`,
  })
}

// ─── Email 4: Trial Expiring in 3 Days ──────────────────────────────────────

export async function sendTrialExpiringEmail({ name, email, expiresAt }) {
  const expireDate = new Date(expiresAt).toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric',
  })
  return send({
    to: email,
    subject: `你的试用还有3天（到期：${expireDate}）`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2>Hi ${name}</h2>
  <p>你的 CFA Sprint 试用将于 <strong>${expireDate}</strong> 到期。</p>
  <p>如果这7天的练习对你有帮助，继续用下去——<br>
  考前这最后几周是提分最快的窗口。</p>
  <p style="margin:24px 0">
    <a href="${APP_URL}/pricing" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      查看升级方案 →
    </a>
  </p>
  <p style="color:#666;font-size:14px">
    有任何问题直接回复这封邮件。<br>
    — Maggie，CFA Sprint
  </p>
</div>`,
  })
}
