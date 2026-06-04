import { hasActiveSubscription } from './billing.js'

export const FREE_BANK_QUESTION_LIMIT = 40
export const DEFAULT_PRACTICE_PACK = '2026-practice'

export function getFreeBankQuestionIds(db, packId = DEFAULT_PRACTICE_PACK) {
  const packScoped = db
    .prepare(
      `
      SELECT id FROM questions
      WHERE tags LIKE ?
      ORDER BY sort_order ASC, id ASC
      LIMIT ${FREE_BANK_QUESTION_LIMIT}
    `,
    )
    .all(`%pack:${packId}%`)
    .map((row) => row.id)

  if (packScoped.length >= FREE_BANK_QUESTION_LIMIT) {
    return packScoped
  }

  return db
    .prepare(`SELECT id FROM questions ORDER BY id ASC LIMIT ${FREE_BANK_QUESTION_LIMIT}`)
    .all()
    .map((row) => row.id)
}

export function filterQuestionsForUser(db, userRow, questions, { pack = DEFAULT_PRACTICE_PACK } = {}) {
  if (hasActiveSubscription(userRow)) return questions
  const allowed = new Set(getFreeBankQuestionIds(db, pack))
  return questions.filter((question) => allowed.has(question.id))
}

export function getBankAccessMeta(db, userRow) {
  const totalQuestions = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count
  const isPremium = hasActiveSubscription(userRow)
  const packTotal = db
    .prepare('SELECT COUNT(*) AS count FROM questions WHERE tags LIKE ?')
    .get(`%pack:${DEFAULT_PRACTICE_PACK}%`).count
  const accessibleCount = isPremium
    ? totalQuestions
    : Math.min(FREE_BANK_QUESTION_LIMIT, packTotal || totalQuestions)

  return {
    isPremium,
    totalQuestions,
    accessibleCount,
    bankPath: '/study/practice',
    bankLabel: isPremium ? 'Full question bank' : '40 real exam questions',
  }
}

export function resolveQuestionsPack({ pack, topic }) {
  if (pack) return String(pack)
  if (topic) return DEFAULT_PRACTICE_PACK
  return null
}
