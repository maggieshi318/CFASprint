import Database from 'better-sqlite3'
import { config } from '../server/config.js'

const email = process.argv[2]?.trim().toLowerCase()

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/reset-user.mjs user@example.com')
  process.exit(1)
}

const db = new Database(config.dbPath)
const user = db.prepare('SELECT id, email FROM users WHERE lower(email) = ?').get(email)
const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name))

function hasColumn(tableName, columnName) {
  if (!tables.has(tableName)) return false
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName)
}

if (!user) {
  console.log(`No account found for ${email}. It is already available for new registration.`)
  db.close()
  process.exit(0)
}

const deleteByUserId = [
  ['submissions', 'user_id'],
  ['favorites', 'user_id'],
  ['mock_sessions', 'user_id'],
  ['auth_tokens', 'user_id'],
  ['device_tokens', 'user_id'],
  ['orders', 'user_id'],
  ['user_messages', 'user_id'],
]

const summary = db.transaction(() => {
  const counts = {}

  for (const [table, column] of deleteByUserId) {
    if (!tables.has(table)) {
      counts[table] = 0
      continue
    }
    const result = db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(user.id)
    counts[table] = result.changes
  }

  counts.referral_rewards = tables.has('referral_rewards')
    ? db
        .prepare('DELETE FROM referral_rewards WHERE referrer_user_id = ? OR referred_user_id = ?')
        .run(user.id, user.id).changes
    : 0

  counts.referred_users = hasColumn('users', 'referred_by_user_id')
    ? db.prepare('UPDATE users SET referred_by_user_id = NULL WHERE referred_by_user_id = ?').run(user.id).changes
    : 0

  counts.invite_codes =
    hasColumn('invite_codes', 'redeemed_by_user_id') &&
    hasColumn('invite_codes', 'redeemed_at') &&
    hasColumn('invite_codes', 'status')
    ? db
        .prepare(
          `
        UPDATE invite_codes
        SET status = 'active', redeemed_by_user_id = NULL, redeemed_at = NULL
        WHERE redeemed_by_user_id = ?
      `,
        )
        .run(user.id).changes
    : 0

  counts.users = db.prepare('DELETE FROM users WHERE id = ?').run(user.id).changes

  return counts
})()

db.close()

console.log(`Reset complete for ${email}. The account can now register again as a new user.`)
console.table(summary)
