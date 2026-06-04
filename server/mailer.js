import nodemailer from 'nodemailer'
import { config } from './config.js'

let transporter

function getTransporter() {
  if (!config.smtpHost) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth:
        config.smtpUser && config.smtpPass
          ? { user: config.smtpUser, pass: config.smtpPass }
          : undefined,
    })
  }
  return transporter
}

export function isSmtpConfigured() {
  return Boolean(config.smtpHost && config.smtpFrom)
}

export function getMailerStatus() {
  return isSmtpConfigured() ? 'smtp' : 'dev'
}

function buildHtml(subject, actionLabel, actionUrl) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="color:#2563eb">${subject}</h2>
      <p>Use the button below to continue.</p>
      <p><a href="${actionUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${actionLabel}</a></p>
      <p style="color:#64748b;font-size:12px">If the button does not work, copy this link:<br>${actionUrl}</p>
    </div>
  `
}

export async function sendAuthEmail({ to, subject, actionUrl, actionLabel }) {
  const text = `${subject}\n\n${actionLabel}: ${actionUrl}`
  const html = buildHtml(subject, actionLabel, actionUrl)
  const transport = getTransporter()

  if (!transport) {
    if (!config.isProduction) {
      // eslint-disable-next-line no-console
      console.log(`[auth-email] ${subject} -> ${to}: ${actionUrl}`)
    }
    return { mode: 'dev', delivered: false }
  }

  await transport.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text,
    html,
  })

  return { mode: 'smtp', delivered: true }
}

export async function verifySmtpConnection() {
  const transport = getTransporter()
  if (!transport) return { ok: false, reason: 'SMTP not configured' }
  await transport.verify()
  return { ok: true }
}
