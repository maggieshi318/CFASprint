import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { config } from '../server/config.js'

const seedPath = path.join(process.cwd(), 'data', 'question-bank-seed.json')
const payload = JSON.parse(readFileSync(seedPath, 'utf8'))
const questions = Array.isArray(payload.questions) ? payload.questions : []

if (!questions.length) {
  console.error(`No questions found in ${seedPath}`)
  process.exit(1)
}

const db = new Database(config.dbPath)

const columns = db.prepare('PRAGMA table_info(questions)').all()
if (!columns.some((column) => column.name === 'sort_order')) {
  db.exec('ALTER TABLE questions ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
}

const importQuestions = db.transaction(() => {
  db.prepare('DELETE FROM submissions').run()
  db.prepare('DELETE FROM favorites').run()
  db.prepare('DELETE FROM questions').run()

  const insert = db.prepare(`
    INSERT INTO questions
      (id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation, sort_order)
    VALUES
      (@id, @topic, @los, @exam_year, @tags, @difficulty, @stem, @option_a, @option_b, @option_c, @answer, @explanation, @sort_order)
  `)

  for (const question of questions) {
    insert.run({
      id: question.id,
      topic: question.topic,
      los: question.los || '',
      exam_year: Number(question.exam_year || 2026),
      tags: question.tags || '[]',
      difficulty: question.difficulty || 'Medium',
      stem: question.stem,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      answer: question.answer,
      explanation: question.explanation || '',
      sort_order: Number(question.sort_order || 0),
    })
  }
})

importQuestions()

const total = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count
const practice = db
  .prepare("SELECT COUNT(*) AS count FROM questions WHERE tags LIKE '%pack:2026-practice%'")
  .get().count
const qm = db
  .prepare(
    "SELECT COUNT(*) AS count FROM questions WHERE topic = 'Quantitative Methods' AND tags LIKE '%pack:2026-practice%'",
  )
  .get().count

db.close()

console.log(`Imported ${total} questions.`)
console.log(`2026 Practice Pack: ${practice}`)
console.log(`Quantitative Methods in 2026 Practice Pack: ${qm}`)
