import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { getSubscriptionSnapshot } from '../server/billing.js'

const email = process.argv[2]?.trim().toLowerCase()

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/inspect-user.mjs user@example.com')
  process.exit(1)
}

const db = new Database(config.dbPath)
const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email)

if (!user) {
  console.log(`No account found for ${email}.`)
  db.close()
  process.exit(0)
}

const submissions = db.prepare('SELECT COUNT(*) AS count FROM submissions WHERE user_id = ?').get(user.id).count
const favorites = db.prepare('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?').get(user.id).count
const mocks = db.prepare('SELECT COUNT(*) AS count FROM mock_sessions WHERE user_id = ?').get(user.id).count
const packQuestions = db
  .prepare("SELECT COUNT(*) AS count FROM questions WHERE tags LIKE '%pack:2026-practice%'")
  .get().count
const qmQuestions = db
  .prepare(
    "SELECT COUNT(*) AS count FROM questions WHERE topic = 'Quantitative Methods' AND tags LIKE '%pack:2026-practice%'",
  )
  .get().count

console.table({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  plan: user.plan,
  subscription_status: user.subscription_status,
  subscription_expires_at: user.subscription_expires_at,
  isPremium: getSubscriptionSnapshot(user).isPremium,
  submissions,
  favorites,
  mock_sessions: mocks,
  practice_pack_questions: packQuestions,
  quantitative_methods_questions: qmQuestions,
})

db.close()
