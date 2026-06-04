const PLAN_NAMES = {
  free: 'Free',
  paid_lifetime: 'Full Access',
  pro_quarterly: 'Full Access',
  pass_pack: 'Full Access',
}

const PLAN_PRICES = {
  free: '$0',
  paid_lifetime: 'AED 99',
  pro_quarterly: 'AED 99',
  pass_pack: 'AED 99',
}

export function recordOrder(db, userId, planId, expiresAt = null) {
  const amount = PLAN_PRICES[planId] || '$0'
  db.prepare(
    `
    INSERT INTO orders (user_id, plan_id, amount, status, created_at, expires_at)
    VALUES (?, ?, ?, 'paid', datetime('now'), ?)
  `,
  ).run(userId, planId, amount, expiresAt)
}

export function listOrders(db, userId) {
  const rows = db
    .prepare(
      `
      SELECT id, plan_id AS planId, amount, status, created_at AS createdAt, expires_at AS expiresAt
      FROM orders
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    )
    .all(userId)

  const planNames = PLAN_NAMES

  return rows.map((row) => ({
    ...row,
    planName: planNames[row.planId] || row.planId,
  }))
}

export function ensureDemoOrder(db, userId, planId, expiresAt) {
  const existing = db.prepare('SELECT id FROM orders WHERE user_id = ? LIMIT 1').get(userId)
  if (existing) return
  recordOrder(db, userId, planId, expiresAt)
}
