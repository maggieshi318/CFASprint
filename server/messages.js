export function listMessages(db, userId) {
  return db
    .prepare(
      `
      SELECT
        id,
        subject,
        body,
        status,
        admin_reply AS adminReply,
        created_at AS createdAt,
        replied_at AS repliedAt
      FROM user_messages
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    )
    .all(userId)
}

export function createMessage(db, userId, subject, body) {
  const trimmedSubject = String(subject || '').trim()
  const trimmedBody = String(body || '').trim()
  if (!trimmedSubject || !trimmedBody) {
    throw new Error('Subject and message are required')
  }
  if (trimmedSubject.length > 120) {
    throw new Error('Subject must be 120 characters or less')
  }
  if (trimmedBody.length > 2000) {
    throw new Error('Message must be 2000 characters or less')
  }

  const result = db
    .prepare(
      `
      INSERT INTO user_messages (user_id, subject, body, status, created_at)
      VALUES (?, ?, ?, 'open', datetime('now'))
    `,
    )
    .run(userId, trimmedSubject, trimmedBody)

  return db
    .prepare(
      `
      SELECT
        id,
        subject,
        body,
        status,
        admin_reply AS adminReply,
        created_at AS createdAt,
        replied_at AS repliedAt
      FROM user_messages
      WHERE id = ?
    `,
    )
    .get(result.lastInsertRowid)
}
