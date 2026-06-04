import fs from 'node:fs'
import { config } from './config.js'

let messagingClient = null

async function getMessaging() {
  if (!config.firebaseServiceAccountJson && !config.firebaseServiceAccountPath) {
    return null
  }
  if (messagingClient) return messagingClient

  const admin = await import('firebase-admin')
  if (admin.apps.length === 0) {
    const serviceAccount = config.firebaseServiceAccountJson
      ? JSON.parse(config.firebaseServiceAccountJson)
      : JSON.parse(fs.readFileSync(config.firebaseServiceAccountPath, 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  }
  messagingClient = admin.messaging()
  return messagingClient
}

export function isPushConfigured() {
  return Boolean(config.firebaseServiceAccountJson || config.firebaseServiceAccountPath)
}

export function registerDeviceToken(db, userId, token, platform) {
  db.prepare(
    `
    INSERT INTO device_tokens (user_id, token, platform)
    VALUES (?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform
  `,
  ).run(userId, token, platform)
}

export function listDeviceTokens(db) {
  return db.prepare('SELECT token, platform FROM device_tokens ORDER BY id DESC').all()
}

export async function sendPushBroadcast(db, title, body) {
  const tokens = listDeviceTokens(db).map((row) => row.token)
  if (!tokens.length) {
    return { mode: 'none', sent: 0, failed: 0, message: 'No registered device tokens' }
  }

  const messaging = await getMessaging()
  if (!messaging) {
    // eslint-disable-next-line no-console
    console.log(`[push:dev] broadcast "${title}" -> ${tokens.length} token(s)`)
    db.prepare('INSERT INTO push_broadcasts (title, body, sent_count) VALUES (?, ?, ?)').run(
      title,
      body,
      0,
    )
    return {
      mode: 'dev',
      sent: 0,
      failed: 0,
      targeted: tokens.length,
      message: 'Firebase not configured. Logged tokens to console.',
    }
  }

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
  })

  db.prepare('INSERT INTO push_broadcasts (title, body, sent_count) VALUES (?, ?, ?)').run(
    title,
    body,
    response.successCount,
  )

  return {
    mode: 'fcm',
    sent: response.successCount,
    failed: response.failureCount,
    targeted: tokens.length,
  }
}

export function getPushStatus(db) {
  const tokens = db.prepare('SELECT COUNT(*) AS count FROM device_tokens').get().count
  const broadcasts = db.prepare('SELECT COUNT(*) AS count FROM push_broadcasts').get().count
  return {
    configured: isPushConfigured(),
    registeredTokens: tokens,
    broadcasts,
  }
}

export function computeStudyStreak(db, userId) {
  const days = db
    .prepare(
      `
      SELECT DISTINCT date(submitted_at) AS day
      FROM submissions
      WHERE user_id = ?
      ORDER BY day DESC
      LIMIT 60
    `,
    )
    .all(userId)
    .map((row) => row.day)

  if (!days.length) return 0

  const today = db.prepare("SELECT date('now') AS day").get().day
  const yesterday = db.prepare("SELECT date('now', '-1 day') AS day").get().day
  if (days[0] !== today && days[0] !== yesterday) return 0

  let streak = 0
  let cursor = days[0] === today ? today : yesterday
  const daySet = new Set(days)

  while (daySet.has(cursor)) {
    streak += 1
    cursor = db.prepare('SELECT date(?, ?) AS day').get(cursor, '-1 day').day
  }

  return streak
}
