#!/usr/bin/env node

import { config } from '../server/config.js'

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787'
const strict = process.argv.includes('--strict')

const checks = []

function ok(name, detail = 'ok') {
  checks.push({ name, pass: true, detail })
}

function fail(name, detail) {
  checks.push({ name, pass: false, detail })
}

function readEnv(name) {
  return process.env[name] || ''
}

async function run() {
  console.log(`CFA Sprint preflight (${strict ? 'strict' : 'standard'})`)

  const jwt = config.jwtSecret
  if (jwt && jwt !== 'cfa_sprint_dev_secret' && jwt.length >= 24) {
    ok('JWT_SECRET', 'strong secret set')
  } else if (strict) {
    fail('JWT_SECRET', 'Set JWT_SECRET to a random string with 24+ chars')
  } else {
    ok('JWT_SECRET', 'dev/default ok (set strong secret before production)')
  }

  const appUrl = config.appUrl
  if (appUrl.startsWith('https://') || !strict) ok('APP_URL', appUrl || 'http://localhost:5173 (dev)')
  else fail('APP_URL', 'Production should use https:// APP_URL')

  const stripeKey = config.stripeSecretKey
  const stripeWebhook = config.stripeWebhookSecret
  const stripePro = config.stripePriceProQuarterly
  const stripePass = config.stripePricePassPack

  if (stripeKey && stripeWebhook && stripePro && stripePass) {
    ok('Stripe billing', stripeKey.startsWith('sk_live_') ? 'live keys detected' : 'test keys detected')
  } else if (!strict) {
    ok('Stripe billing', 'not fully configured (dev mode checkout available)')
  } else {
    fail('Stripe billing', 'Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and both price IDs')
  }

  const smtpHost = config.smtpHost
  const smtpFrom = config.smtpFrom
  if (smtpHost && smtpFrom) ok('SMTP mailer', `${smtpHost} / ${smtpFrom}`)
  else if (!strict) ok('SMTP mailer', 'not configured (dev console links only)')
  else fail('SMTP mailer', 'Set SMTP_HOST and SMTP_FROM for production auth emails')

  ok('DB_PATH', config.dbPath)

  try {
    const response = await fetch(`${BASE_URL}/api/health`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.json()
    ok('API /api/health', JSON.stringify(body))
  } catch (error) {
    fail('API /api/health', error.message || 'Server not reachable')
  }

  console.log('')
  for (const item of checks) {
    const mark = item.pass ? 'PASS' : 'FAIL'
    console.log(`${mark}  ${item.name} — ${item.detail}`)
  }

  const failed = checks.filter((item) => !item.pass)
  if (failed.length) {
    console.log(`\n${failed.length} check(s) failed.`)
    process.exit(1)
  }

  console.log('\nAll preflight checks passed.')
}

run().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
