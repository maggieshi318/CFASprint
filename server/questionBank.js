import { getBankAccessMeta, getFreeBankQuestionIds } from './bankAccess.js'
import { hasActiveSubscription } from './billing.js'
import { LANREN_PACK_ORDER } from './lanrenPacks.js'
import { countPackQuestions, listPackCategories, listPackTopics } from './qmBank.js'
import { questionHasPack } from './tagUtils.js'

/** Topic order as shown in lanrencfa question bank UI */
export const SCREENSHOT_TOPIC_ORDER = [
  'Quantitative Methods',
  'Economics',
  'FSA',
  'Corporate Issuers',
  'Equity Investments',
  'Fixed Income',
  'Derivatives',
  'Alternative Investments',
  'Portfolio Management',
  'Ethics',
]

export const TOPIC_LABELS = {
  Ethics: 'Ethical and Professional Standards',
  'Quantitative Methods': 'Quantitative Methods',
  Economics: 'Economics',
  FSA: 'Financial Statement Analysis',
  'Corporate Issuers': 'Corporate Issuers',
  'Equity Investments': 'Equity Investments',
  'Fixed Income': 'Fixed Income',
  Derivatives: 'Derivatives',
  'Alternative Investments': 'Alternative Investments',
  'Portfolio Management': 'Portfolio Management',
}

/** Display counts matching lanrencfa 2026 1000-question practice pack */
export const TOPIC_DISPLAY_COUNTS = {
  'Quantitative Methods': 79,
  Economics: 75,
  FSA: 126,
  'Corporate Issuers': 75,
  'Equity Investments': 140,
  'Fixed Income': 112,
  Derivatives: 75,
  'Alternative Investments': 70,
  'Portfolio Management': 100,
  Ethics: 148,
}

export const PACK_DISPLAY = {
  '2026-practice': { title: '2026 CFA Level I Practice Pack', displayCount: 1000 },
  '2026-mock': { title: '2026 CFA Level I Mock', displayCount: 1080 },
  '2025-practice': { title: '2025 CFA Level I Practice Pack', displayCount: 1000 },
  '2025-mock': { title: '2025 CFA Level I Mock', displayCount: 1440 },
  '2024-practice': { title: '2024 CFA Level I Practice Pack', displayCount: 1000 },
  '2024-mock': { title: '2024 CFA Level I Mock', displayCount: 900 },
  'past-mocks': { title: 'Past Mock Exams', displayCount: null },
}

const PACK_ACCESS = {
  '2026-practice': { accessible: true, defaultExpanded: true },
  '2026-mock': { accessible: false, defaultExpanded: false },
  '2025-practice': { accessible: false, defaultExpanded: false },
  '2025-mock': { accessible: false, defaultExpanded: false },
  '2024-practice': { accessible: false, defaultExpanded: false },
  '2024-mock': { accessible: false, defaultExpanded: false },
  'past-mocks': { accessible: false, defaultExpanded: false },
}

function getAllowedQuestionIds(db, userRow) {
  if (hasActiveSubscription(userRow)) {
    return db
      .prepare('SELECT id FROM questions ORDER BY id ASC')
      .all()
      .map((row) => row.id)
  }
  return getFreeBankQuestionIds(db)
}

function getTopicProgressMap(db, userId, questionRows) {
  if (questionRows.length === 0) return new Map()

  const progressRows = db
    .prepare(
      `
      SELECT q.topic AS topic,
             SUM(CASE WHEN s.user_id IS NOT NULL THEN 1 ELSE 0 END) AS completed,
             SUM(CASE WHEN s.correct = 1 THEN 1 ELSE 0 END) AS correct
      FROM questions q
      LEFT JOIN submissions s
        ON s.question_id = q.id
        AND s.user_id = ?
      WHERE q.id IN (${questionRows.map(() => '?').join(', ')})
      GROUP BY q.topic
    `,
    )
    .all(userId, ...questionRows.map((row) => row.id))

  return new Map(progressRows.map((row) => [row.topic, row]))
}

function getSessionProgressMap(db, userId, questionRows) {
  if (questionRows.length === 0) return new Map()

  const progressRows = db
    .prepare(
      `
      SELECT q.id AS question_id,
             CASE WHEN s.user_id IS NOT NULL THEN 1 ELSE 0 END AS completed,
             CASE WHEN s.correct = 1 THEN 1 ELSE 0 END AS correct
      FROM questions q
      LEFT JOIN submissions s
        ON s.question_id = q.id
        AND s.user_id = ?
      WHERE q.id IN (${questionRows.map(() => '?').join(', ')})
    `,
    )
    .all(userId, ...questionRows.map((row) => row.id))

  return new Map(progressRows.map((row) => [row.question_id, row]))
}

function buildTopicRows(db, userId, questionRows, { useDisplayCounts, isPremium }) {
  const topicMap = new Map()

  for (const row of questionRows) {
    if (!topicMap.has(row.topic)) {
      topicMap.set(row.topic, { topic: row.topic, questionIds: [] })
    }
    topicMap.get(row.topic).questionIds.push(row.id)
  }

  const progressMap = getTopicProgressMap(db, userId, questionRows)
  const topicOrder = useDisplayCounts
    ? SCREENSHOT_TOPIC_ORDER
    : SCREENSHOT_TOPIC_ORDER.filter((topic) => topicMap.has(topic))

  return topicOrder.map((topic) => {
    const ids = topicMap.get(topic)?.questionIds || []
    const progress = progressMap.get(topic) || { completed: 0, correct: 0 }
    const completed = progress.completed || 0
    const accuracy = completed > 0 ? Math.round((progress.correct / completed) * 100) : 0
    const count = useDisplayCounts ? TOPIC_DISPLAY_COUNTS[topic] || ids.length : ids.length

    return {
      topic,
      label: TOPIC_LABELS[topic] || topic,
      count,
      completed,
      accuracy,
      hasProgress: completed > 0,
      accessible: isPremium || ids.length > 0,
    }
  })
}

function buildMockSessionRows(db, userId, packId, allowedSet, isPremium) {
  const sessions = listPackCategories(db, packId)
  const progressMap = getSessionProgressMap(
    db,
    userId,
    sessions.flatMap((session) => session.questionIds.map((id) => ({ id }))),
  )

  return sessions.map((session) => {
    const accessibleIds = session.questionIds.filter((id) => allowedSet.has(id))
    let completed = 0
    let correct = 0
    for (const questionId of session.questionIds) {
      const progress = progressMap.get(questionId)
      if (!progress?.completed) continue
      completed += 1
      if (progress.correct) correct += 1
    }
    const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0

    return {
      topic: `session-${session.categoryId}`,
      label: session.label,
      categoryId: Number(session.categoryId),
      count: session.count,
      completed,
      accuracy,
      hasProgress: completed > 0,
      accessible: isPremium || accessibleIds.length > 0,
    }
  })
}

function summarizePack(topics, displayCount) {
  const questionCount = displayCount ?? topics.reduce((sum, topic) => sum + topic.count, 0)
  const completed = topics.reduce((sum, topic) => sum + topic.completed, 0)
  const correct = topics.reduce((sum, topic) => {
    if (!topic.completed) return sum
    return sum + Math.round((topic.accuracy / 100) * topic.completed)
  }, 0)
  const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0

  return { questionCount, completed, accuracy }
}

function packHeading(packId) {
  const display = PACK_DISPLAY[packId] || { title: packId, displayCount: null }
  if (display.displayCount) {
    return `${display.title} ${display.displayCount} Questions`
  }
  return display.title
}

function rowsForPack(db, packId, allowedSet) {
  return db
    .prepare('SELECT id, topic, exam_year, tags FROM questions ORDER BY sort_order ASC, id ASC')
    .all()
    .filter((row) => allowedSet.has(row.id) && questionHasPack(row.tags, packId))
}

function buildPracticePackMeta(db, userRow, packId, { isPremium, useDisplayCounts }) {
  const userId = userRow.id
  const access = PACK_ACCESS[packId]
  const allowedSet = new Set(getAllowedQuestionIds(db, userRow))
  const questionRows = rowsForPack(db, packId, allowedSet)
  const importedCount = countPackQuestions(db, packId)
  const topics = buildTopicRows(db, userId, questionRows, {
    useDisplayCounts: useDisplayCounts && packId === '2026-practice',
    isPremium,
  })
  const display = PACK_DISPLAY[packId]
  const summary = summarizePack(
    topics,
    importedCount > 0 ? importedCount : useDisplayCounts ? display?.displayCount : null,
  )
  const packAccessible = access.accessible || isPremium

  return {
    id: packId,
    kind: 'practice',
    title: packHeading(packId),
    accessible: packAccessible,
    locked: !packAccessible,
    defaultExpanded: access.defaultExpanded,
    questionCount: summary.questionCount,
    completed: summary.completed,
    accuracy: summary.accuracy,
    topics: importedCount > 0 ? topics.filter((topic) => topic.count > 0 || useDisplayCounts) : topics,
    sessionQuery: { pack: packId },
    imported: importedCount > 0,
  }
}

function buildMockPackMeta(db, userRow, packId, isPremium) {
  const userId = userRow.id
  const access = PACK_ACCESS[packId]
  const allowedSet = new Set(getAllowedQuestionIds(db, userRow))
  const importedCount = countPackQuestions(db, packId)
  const sessions = importedCount > 0 ? buildMockSessionRows(db, userId, packId, allowedSet, isPremium) : []
  const summary = summarizePack(sessions, importedCount > 0 ? importedCount : PACK_DISPLAY[packId]?.displayCount)
  const packAccessible = isPremium

  return {
    id: packId,
    kind: packId === 'past-mocks' ? 'past-mock' : 'mock',
    title: packHeading(packId),
    accessible: packAccessible,
    locked: !packAccessible,
    defaultExpanded: access.defaultExpanded,
    questionCount: summary.questionCount,
    completed: summary.completed,
    accuracy: summary.accuracy,
    topics: sessions,
    sessionQuery: { pack: packId },
    imported: importedCount > 0,
  }
}

export function buildQuestionBankMeta(db, userRow) {
  const userId = userRow.id
  const bank = getBankAccessMeta(db, userRow)
  const isPremium = bank.isPremium

  const packs = LANREN_PACK_ORDER.map((packId) => {
    const isPractice = packId.endsWith('-practice')
    if (isPractice) {
      return buildPracticePackMeta(db, userRow, packId, {
        isPremium,
        useDisplayCounts: packId === '2026-practice',
      })
    }
    return buildMockPackMeta(db, userRow, packId, isPremium)
  })

  const wrongCount = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM submissions
      WHERE user_id = ? AND correct = 0
    `,
    )
    .get(userId).count

  const favoriteCount = db
    .prepare('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?')
    .get(userId).count

  const importedTotal = db
    .prepare(`SELECT COUNT(*) AS count FROM questions WHERE tags LIKE '%lanrencfa-import%'`)
    .get().count

  return {
    bankMode: isPremium ? 'full' : 'free',
    isPremium,
    totalAccessible: bank.accessibleCount,
    fullBankSize: importedTotal || bank.totalQuestions,
    packs,
    sidebar: {
      wrongCount,
      favoriteCount,
    },
  }
}

/** Lanren statistics page topic order (Ethics first) */
export const LANREN_STATS_TOPIC_ORDER = [
  'Ethics',
  'Quantitative Methods',
  'Economics',
  'FSA',
  'Corporate Issuers',
  'Equity Investments',
  'Fixed Income',
  'Derivatives',
  'Alternative Investments',
  'Portfolio Management',
]

export function buildPracticePackStudyStats(db, userRow, packId = '2026-practice') {
  const isPremium = hasActiveSubscription(userRow)
  const packMeta = buildPracticePackMeta(db, userRow, packId, {
    isPremium,
    useDisplayCounts: packId === '2026-practice',
  })
  const correct = packMeta.topics.reduce(
    (sum, topic) => sum + Math.round((topic.accuracy / 100) * topic.completed),
    0,
  )

  const topicMap = new Map(
    packMeta.topics.map((topic) => [
      topic.topic,
      {
        topic: topic.topic,
        label: topic.label,
        total: topic.count,
        completed: topic.completed,
        accuracy: topic.accuracy,
        progressPct: topic.count > 0 ? Math.round((topic.completed / topic.count) * 100) : 0,
      },
    ]),
  )

  const topicPerformance = LANREN_STATS_TOPIC_ORDER.map((topic) => {
    const row = topicMap.get(topic)
    if (row) return row
    return {
      topic,
      label: TOPIC_LABELS[topic] || topic,
      total: TOPIC_DISPLAY_COUNTS[topic] || 0,
      completed: 0,
      accuracy: 0,
      progressPct: 0,
    }
  })

  return {
    pack: {
      id: packMeta.id,
      title: '2026 CFA Level I Practice Pack',
      questionCount: packMeta.questionCount,
      completed: packMeta.completed,
      correct,
      wrong: packMeta.completed - correct,
      accuracy: packMeta.accuracy,
      progressPct:
        packMeta.questionCount > 0
          ? Math.round((packMeta.completed / packMeta.questionCount) * 100)
          : 0,
    },
    topicPerformance,
  }
}

export { listPackTopics }
