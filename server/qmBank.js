import { CSV_HEADERS, escapeCsvValue } from './csvImport.js'
import { buildQmPracticePackQuestions } from './qmQuestionsData.js'
import {
  categoryTag,
  extractCategoryId,
  normalizeTags,
  packTag,
  parseQuestionTags,
  questionHasPack,
} from './tagUtils.js'

export { buildQmPracticePackQuestions }

function ensureSortOrderColumn(db) {
  const columns = db.prepare('PRAGMA table_info(questions)').all()
  if (!columns.some((col) => col.name === 'sort_order')) {
    db.exec('ALTER TABLE questions ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
  }
}

function deleteQuestionRows(db, questionIds) {
  if (!questionIds.length) return
  const placeholders = questionIds.map(() => '?').join(',')
  db.prepare(`DELETE FROM submissions WHERE question_id IN (${placeholders})`).run(...questionIds)
  db.prepare(`DELETE FROM favorites WHERE question_id IN (${placeholders})`).run(...questionIds)
  db.prepare(`DELETE FROM questions WHERE id IN (${placeholders})`).run(...questionIds)
}

function insertQuestionRows(db, rows, topicOverride = null) {
  const insert = db.prepare(`
    INSERT INTO questions (id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let nextId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM questions').get().nextId || 1
  rows.forEach((row, index) => {
    const sortOrder = Number(row.sortOrder ?? row.sort_order ?? index + 1)
    insert.run(
      nextId,
      topicOverride || row.topic,
      row.los,
      Number(row.examYear || row.exam_year || 2026),
      normalizeTags(row.tags),
      row.difficulty || 'Medium',
      row.stem,
      row.optionA || row.option_a,
      row.optionB || row.option_b,
      row.optionC || row.option_c,
      row.answer,
      row.explanation || 'Imported from CFA practice pack.',
      sortOrder,
    )
    nextId += 1
  })
}

export function findPackQuestionIds(db, packId, { topic = null, categoryId = null } = {}) {
  const rows = db.prepare('SELECT id, topic, tags FROM questions').all()
  return rows
    .filter((row) => {
      if (!questionHasPack(row.tags, packId)) return false
      if (topic && row.topic !== topic) return false
      if (categoryId && extractCategoryId(row.tags) !== String(categoryId)) return false
      return true
    })
    .map((row) => row.id)
}

/** Legacy import — replaces all questions for a topic regardless of pack */
export function replaceTopicQuestions(db, topic, rows) {
  ensureSortOrderColumn(db)
  const existingIds = db.prepare('SELECT id FROM questions WHERE topic = ?').all(topic).map((row) => row.id)

  const clearTopic = db.transaction(() => {
    deleteQuestionRows(db, existingIds)
  })
  clearTopic()

  const importRows = db.transaction(() => {
    insertQuestionRows(db, rows, topic)
  })
  importRows()

  return rows.length
}

export function replacePackTopicQuestions(db, packId, topic, rows) {
  ensureSortOrderColumn(db)
  const existingIds = findPackQuestionIds(db, packId, { topic })

  const importRows = db.transaction(() => {
    deleteQuestionRows(db, existingIds)
    insertQuestionRows(db, rows, topic)
  })
  importRows()

  return rows.length
}

export function replacePackCategoryQuestions(db, packId, categoryId, rows) {
  ensureSortOrderColumn(db)
  const existingIds = findPackQuestionIds(db, packId, { categoryId })

  const importRows = db.transaction(() => {
    deleteQuestionRows(db, existingIds)
    insertQuestionRows(db, rows)
  })
  importRows()

  return rows.length
}

export function migrateLegacyLanrenTags(db, defaultPackId = '2026-practice') {
  const rows = db
    .prepare(`SELECT id, tags FROM questions WHERE tags LIKE '%lanrencfa-import%' AND tags NOT LIKE '%pack:%'`)
    .all()

  if (!rows.length) return 0

  const update = db.prepare('UPDATE questions SET tags = ? WHERE id = ?')
  const migrate = db.transaction(() => {
    for (const row of rows) {
      const tags = parseQuestionTags(row.tags)
      tags.unshift(packTag(defaultPackId))
      update.run(normalizeTags(tags), row.id)
    }
  })
  migrate()
  return rows.length
}

export function countPackQuestions(db, packId, { topic = null, categoryId = null } = {}) {
  return findPackQuestionIds(db, packId, { topic, categoryId }).length
}

export function listPackCategories(db, packId) {
  const rows = db
    .prepare('SELECT id, los, tags, sort_order FROM questions WHERE tags LIKE ? ORDER BY sort_order ASC, id ASC')
    .all(`%${packTag(packId)}%`)

  const sessions = new Map()
  for (const row of rows) {
    const categoryId = extractCategoryId(row.tags)
    if (!categoryId) continue
    if (!sessions.has(categoryId)) {
      sessions.set(categoryId, {
        categoryId,
        label: row.los,
        count: 0,
        questionIds: [],
        minSort: row.sort_order || row.id,
      })
    }
    const session = sessions.get(categoryId)
    session.count += 1
    session.questionIds.push(row.id)
    session.minSort = Math.min(session.minSort, row.sort_order || row.id)
  }

  return [...sessions.values()].sort((a, b) => a.minSort - b.minSort || Number(a.categoryId) - Number(b.categoryId))
}

/** Pair Session 1 + Session 2 into one full mock (180 questions on lanrencfa). */
export function buildMockSessionPairs(sessions) {
  if (!sessions?.length) return []
  const pairs = []
  for (let index = 0; index + 1 < sessions.length; index += 2) {
    const first = sessions[index]
    const second = sessions[index + 1]
    pairs.push({
      label: `${first.label} + ${second.label}`,
      questionIds: [...first.questionIds, ...second.questionIds],
    })
  }
  if (!pairs.length) {
    pairs.push({
      label: sessions[0].label,
      questionIds: [...sessions[0].questionIds],
    })
  }
  return pairs
}

/** Maps picker options to pack + session pair index in the imported mock bank. */
export const MOCK_EXAM_BANKS = {
  '2026-mock-exam-1': { packId: '2026-mock', pairIndex: 0, label: '2026 Mock Exam 1' },
  '2026-mock-exam-2': { packId: '2026-mock', pairIndex: 1, label: '2026 Mock Exam 2' },
  '2026-mock-exam-3': { packId: '2026-mock', pairIndex: 2, label: '2026 Mock Exam 3' },
  '2026-mock-exam-4': { packId: '2026-mock', pairIndex: 3, label: '2026 Mock Exam 4' },
  '2026-mock-exam-5': { packId: '2026-mock', pairIndex: 4, label: '2026 Mock Exam 5' },
  '2026-mock-exam-6': { packId: '2026-mock', pairIndex: 5, label: '2026 Mock Exam 6' },
  '2025-special-mock-a': { packId: '2025-mock', pairIndex: 0, label: '2025 Specialized Mock Exam A' },
  '2025-special-mock-b': { packId: '2025-mock', pairIndex: 1, label: '2025 Specialized Mock Exam B' },
}

export const DEFAULT_MOCK_BANK_ID = '2026-mock-exam-1'

export function resolveMockBankId(mockBankId) {
  const candidate = typeof mockBankId === 'string' ? mockBankId.trim() : ''
  if (candidate && MOCK_EXAM_BANKS[candidate]) return candidate
  return DEFAULT_MOCK_BANK_ID
}

export function pickMockExamQuestionIdsByBank(db, bankId) {
  const resolvedBankId = resolveMockBankId(bankId)
  const bank = MOCK_EXAM_BANKS[resolvedBankId]
  if (!bank) {
    return { packId: null, bankId: resolvedBankId, bankLabel: null, sessionLabel: null, questionIds: [] }
  }

  const sessions = listPackCategories(db, bank.packId)
  const pairs = buildMockSessionPairs(sessions)
  const picked = pairs[bank.pairIndex]
  if (!picked) {
    return {
      packId: bank.packId,
      bankId: resolvedBankId,
      bankLabel: bank.label,
      sessionLabel: null,
      questionIds: [],
    }
  }

  return {
    packId: bank.packId,
    bankId: resolvedBankId,
    bankLabel: bank.label,
    sessionLabel: picked.label,
    questionIds: picked.questionIds,
  }
}

export function pickMockExamQuestionIds(db, packId) {
  const sessions = listPackCategories(db, packId)
  const pairs = buildMockSessionPairs(sessions)
  if (pairs.length) {
    const picked = pairs[Math.floor(Math.random() * pairs.length)]
    return {
      packId,
      sessionLabel: picked.label,
      questionIds: picked.questionIds,
    }
  }

  return {
    packId,
    sessionLabel: null,
    questionIds: findPackQuestionIds(db, packId),
  }
}

export function listPackTopics(db, packId) {
  const rows = db
    .prepare('SELECT id, topic, tags FROM questions WHERE tags LIKE ?')
    .all(`%${packTag(packId)}%`)

  const topics = new Map()
  for (const row of rows) {
    if (!topics.has(row.topic)) {
      topics.set(row.topic, { topic: row.topic, count: 0, questionIds: [] })
    }
    const entry = topics.get(row.topic)
    entry.count += 1
    entry.questionIds.push(row.id)
  }
  return topics
}

export function questionsToCsv(rows) {
  const lines = [CSV_HEADERS.join(',')]
  for (const row of rows) {
    const tags = Array.isArray(row.tags)
      ? row.tags.join('|')
      : typeof row.tags === 'string' && row.tags.startsWith('[')
        ? JSON.parse(row.tags).join('|')
        : row.tags || 'quantitative-methods|practice-pack'

    lines.push(
      [
        row.topic || 'Quantitative Methods',
        row.los,
        row.examYear || row.exam_year || 2026,
        tags,
        row.difficulty || 'Medium',
        row.stem,
        row.optionA || row.option_a,
        row.optionB || row.option_b,
        row.optionC || row.option_c,
        row.answer,
        row.explanation,
      ]
        .map(escapeCsvValue)
        .join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

export { parseQuestionTags, questionHasPack, packTag, categoryTag }
