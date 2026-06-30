import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config } from '../server/config.js'

const KEEP_EMAILS = new Set([
  'maraj.trish@gmail.com',
  'woderanshijie@hotmail.com',
  'maggieshi318@gmail.com',
])

const UNPAID_REAL_USERS = new Set([
  'maraj.trish@gmail.com',
  'woderanshijie@hotmail.com',
])

const apply = process.argv.includes('--apply')
const dbPath = path.resolve(config.dbPath)

if (!fs.existsSync(dbPath)) {
  throw new Error(`Database not found: ${dbPath}`)
}

const db = new Database(dbPath)
db.pragma('foreign_keys = OFF')

function getCandidates() {
  return db
    .prepare(
      `
      SELECT
        u.id,
        u.name,
        lower(u.email) AS email,
        u.role,
        u.plan,
        u.subscription_status AS subscriptionStatus,
        u.subscription_expires_at AS subscriptionExpiresAt,
        ic.code AS inviteCode,
        ff.paid_user_at AS paidUserAt,
        ff.founder_offer_accepted_at AS founderOfferAcceptedAt
      FROM users u
      LEFT JOIN invite_codes ic ON ic.redeemed_by_user_id = u.id
      LEFT JOIN founder_funnel ff ON ff.user_id = u.id
      WHERE u.role = 'student'
      ORDER BY u.id
    `,
    )
    .all()
}

function deleteUser(userId) {
  const tables = [
    'submissions',
    'favorites',
    'mock_sessions',
    'orders',
    'auth_tokens',
    'device_tokens',
    'user_messages',
    'practice_notes',
    'ai_tutor_requests',
    'ai_study_reports',
  ]

  for (const table of tables) {
    db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId)
  }

  db.prepare('DELETE FROM referral_rewards WHERE referrer_user_id = ? OR referred_user_id = ?').run(userId, userId)
  db.prepare('DELETE FROM founder_funnel WHERE user_id = ?').run(userId)
  db.prepare(
    `
    UPDATE invite_codes
    SET status = 'active', redeemed_by_user_id = NULL, redeemed_at = NULL
    WHERE redeemed_by_user_id = ?
  `,
  ).run(userId)
  db.prepare('UPDATE users SET referred_by_user_id = NULL WHERE referred_by_user_id = ?').run(userId)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
}

function clearPaidConversion(userId) {
  db.prepare(
    `
    UPDATE founder_funnel
    SET
      paid_user_at = NULL,
      founder_offer_accepted_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `,
  ).run(userId)
}

const before = getCandidates()
const toDelete = before.filter((user) => !KEEP_EMAILS.has(user.email) && !user.inviteCode)
const unexpectedKept = before.filter((user) => !KEEP_EMAILS.has(user.email) && user.inviteCode)
const missingRequired = [...KEEP_EMAILS].filter((email) => !before.some((user) => user.email === email))

console.log(
  JSON.stringify(
    {
      mode: apply ? 'apply' : 'dry-run',
      dbPath,
      before: before.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        inviteCode: user.inviteCode || null,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        paidUserAt: user.paidUserAt || null,
      })),
      toDelete: toDelete.map((user) => ({ id: user.id, email: user.email, name: user.name })),
      paidConversionToClear: before
        .filter((user) => UNPAID_REAL_USERS.has(user.email))
        .map((user) => ({ id: user.id, email: user.email, paidUserAt: user.paidUserAt || null })),
      unexpectedKeptWithAccessCode: unexpectedKept.map((user) => ({
        id: user.id,
        email: user.email,
        inviteCode: user.inviteCode,
      })),
      missingRequired,
    },
    null,
    2,
  ),
)

if (!apply) {
  console.log('Dry run only. Re-run with --apply to modify the database.')
  db.close()
  process.exit(0)
}

if (missingRequired.length > 0) {
  db.close()
  throw new Error(`Required keep users missing: ${missingRequired.join(', ')}`)
}

const backupPath = `${dbPath}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`
fs.copyFileSync(dbPath, backupPath)

db.transaction(() => {
  for (const user of toDelete) {
    deleteUser(user.id)
  }

  for (const user of before.filter((item) => UNPAID_REAL_USERS.has(item.email))) {
    clearPaidConversion(user.id)
  }
})()

const after = getCandidates()
console.log(
  JSON.stringify(
    {
      backupPath,
      deleted: toDelete.map((user) => ({ id: user.id, email: user.email })),
      after: after.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        inviteCode: user.inviteCode || null,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        paidUserAt: user.paidUserAt || null,
      })),
    },
    null,
    2,
  ),
)

db.close()
