#!/usr/bin/env node
import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { resolveQuestionsPack } from '../server/bankAccess.js'
import { extractPackId } from '../server/tagUtils.js'

const db = new Database(config.dbPath)

function simulateQuery({ topic, pack, year }) {
  const effectivePack = resolveQuestionsPack({ pack, topic, category: null })
  const conditions = []
  const params = []
  if (topic) {
    conditions.push('q.topic = ?')
    params.push(topic)
  }
  if (effectivePack) {
    conditions.push('q.tags LIKE ?')
    params.push(`%pack:${effectivePack}%`)
  } else if (year) {
    conditions.push('q.exam_year = ?')
    params.push(Number(year))
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db.prepare(`SELECT id, tags FROM questions q ${where} ORDER BY sort_order, id LIMIT 5`).all(...params)
  return { count: db.prepare(`SELECT COUNT(*) c FROM questions q ${where}`).get(...params).c, sample: rows }
}

console.log('2026 QM (pack=2026-practice):', simulateQuery({ topic: 'Quantitative Methods', pack: '2026-practice' }))
console.log('QM topic only (defaults 2026):', simulateQuery({ topic: 'Quantitative Methods' }))
console.log('QM + year=2025 NO pack (OLD BUG):', simulateQuery({ topic: 'Quantitative Methods', year: 2025 }))
console.log('QM + year=2025 + pack=2026 (fixed ignores year):', simulateQuery({ topic: 'Quantitative Methods', pack: '2026-practice', year: 2025 }))
