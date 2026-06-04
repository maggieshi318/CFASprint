import crypto from 'node:crypto'

const TOKEN_TTL_MINUTES = {
  reset: 60,
  verify: 24 * 60,
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function buildAuthLink(appUrl, path, rawToken) {
  const base = appUrl.replace(/\/$/, '')
  return `${base}${path}?token=${rawToken}`
}

export function createAuthToken(db, userId, type) {
  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const ttl = TOKEN_TTL_MINUTES[type] || 60
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString()

  db.prepare(
    `
    INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `,
  ).run(userId, type, tokenHash, expiresAt)

  return { rawToken, expiresAt }
}

export function consumeAuthToken(db, rawToken, expectedType) {
  if (!rawToken) return null
  const tokenHash = hashToken(rawToken)
  const row = db
    .prepare(
      `
      SELECT * FROM auth_tokens
      WHERE token_hash = ? AND type = ? AND used_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `,
    )
    .get(tokenHash, expectedType)

  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null

  db.prepare('UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id)
  return row
}

export function issueAuthAction(db, userRow, type, appUrl, path) {
  const { rawToken } = createAuthToken(db, userRow.id, type)
  const actionUrl = buildAuthLink(appUrl, path, rawToken)
  return { actionUrl, devToken: rawToken }
}
