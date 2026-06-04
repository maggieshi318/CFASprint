import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { listPackCategories, buildMockSessionPairs, pickMockExamQuestionIdsByBank } from '../server/qmBank.js'

const db = new Database(config.dbPath)

const sessions = listPackCategories(db, '2026-mock')
console.log('=== 2026-mock categories ===')
for (const s of sessions) {
  console.log(s.categoryId, s.label, s.count, 'firstQ', s.questionIds[0])
}

const pairs = buildMockSessionPairs(sessions)
for (let i = 0; i < pairs.length; i += 1) {
  const p = pairs[i]
  const q = db.prepare('SELECT id, stem FROM questions WHERE id=?').get(p.questionIds[0])
  console.log('pair', i + 1, p.label.split('+')[0].trim(), 'firstQ', q.id, q.stem.slice(0, 70))
}

const picked = pickMockExamQuestionIdsByBank(db, '2026-mock-exam-1')
const q1 = db.prepare('SELECT id, stem, tags, sort_order FROM questions WHERE id=?').get(picked.questionIds[0])
console.log('=== 2026-mock-exam-1 ===')
console.log('first id', q1.id, 'sort', q1.sort_order)
console.log('stem', q1.stem.slice(0, 120))

const conf = db
  .prepare(
    "SELECT id, los, tags, sort_order, substr(stem,1,100) AS s FROM questions WHERE stem LIKE '%preservation of confidentiality%' LIMIT 5",
  )
  .all()
console.log('=== confidentiality question ===')
for (const r of conf) console.log(r)

const cols = db.prepare('PRAGMA table_info(mock_sessions)').all().map((c) => c.name)
console.log('mock_sessions columns', cols)

const active = db.prepare("SELECT id, user_id, status, total, question_ids FROM mock_sessions WHERE status='active'").all()
console.log('=== active sessions ===')
for (const r of active) {
  const ids = JSON.parse(r.question_ids || '[]')
  const q = db.prepare('SELECT stem FROM questions WHERE id=?').get(ids[0])
  console.log('session', r.id, 'user', r.user_id, 'total', r.total, 'q1', ids[0], q?.stem?.slice(0, 90))
}
