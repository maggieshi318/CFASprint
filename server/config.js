import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')

function loadEnvFile() {
  const envPath = path.join(projectRoot, '.env')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile()

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'

export const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 8787),
  jwtSecret: process.env.JWT_SECRET || 'cfa_sprint_dev_secret',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data', 'cfa.db'),
  corsOrigin: process.env.CORS_ORIGIN || '',
  staticDir: path.join(projectRoot, 'dist'),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePriceProQuarterly: process.env.STRIPE_PRICE_PRO_QUARTERLY || '',
  stripePricePassPack: process.env.STRIPE_PRICE_PASS_PACK || '',
  stripePriceTrialMonthly: process.env.STRIPE_PRICE_TRIAL_MONTHLY || '',
  stripePriceFullAccess: process.env.STRIPE_PRICE_FULL_ACCESS || '',
  trialPaymentUrl: process.env.TRIAL_PAYMENT_URL || '',
  fullAccessPaymentUrl: process.env.FULL_ACCESS_PAYMENT_URL || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
}

if (isProduction && config.jwtSecret === 'cfa_sprint_dev_secret') {
  // eslint-disable-next-line no-console
  console.warn('[config] JWT_SECRET is using the dev default. Set JWT_SECRET in production.')
}
