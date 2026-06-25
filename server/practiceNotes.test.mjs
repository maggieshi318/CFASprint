import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  ensurePracticeNotesTables,
  listPracticeNotes,
  upsertPracticeNote,
  migratePracticeNotes,
} from './practiceNotes.js'

function createDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'student',
      locale TEXT NOT NULL DEFAULT 'en',
      password_hash TEXT NOT NULL
    );
    CREATE TABLE questions (
      id INTEGER PRIMARY KEY,
      topic TEXT NOT NULL,
      los TEXT NOT NULL DEFAULT '',
      exam_year INTEGER NOT NULL DEFAULT 2026,
      tags TEXT NOT NULL DEFAULT '[]',
      difficulty TEXT NOT NULL,
      stem TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT NOT NULL
    );
  `)
  db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (1, ?, ?, ?)').run(
    'Candidate',
    'candidate@example.com',
    'hash',
  )
  db.prepare(
    `INSERT INTO questions (
      id, topic, los, difficulty, stem, option_a, option_b, option_c, answer, explanation
    ) VALUES (101, 'Ethics', 'Ethics LOS', 'medium', 'Stem', 'A', 'B', 'C', 'A', 'Explanation')`,
  ).run()
  ensurePracticeNotesTables(db)
  return db
}

test('practice notes are persisted per user and ordered by last update', () => {
  const db = createDb()

  const saved = upsertPracticeNote(db, 1, {
    questionId: 101,
    text: 'Need to remember Standard I(A).',
    pack: '2026-practice',
    topic: 'Ethics',
    session: 'Starter',
  })

  assert.equal(saved.questionId, 101)
  assert.equal(saved.text, 'Need to remember Standard I(A).')
  assert.equal(saved.topic, 'Ethics')
  assert.equal(listPracticeNotes(db, 1).length, 1)

  upsertPracticeNote(db, 1, { questionId: 101, text: '' })

  assert.deepEqual(listPracticeNotes(db, 1), [])
})

test('legacy practice notes migrate without duplicating records', () => {
  const db = createDb()

  const result = migratePracticeNotes(db, 1, [
    {
      questionId: 101,
      text: 'Legacy note from localStorage',
      pack: '2026-practice',
      topic: 'Ethics',
      session: 'Legacy',
    },
    {
      questionId: 101,
      text: 'Legacy note from localStorage',
      pack: '2026-practice',
      topic: 'Ethics',
      session: 'Legacy',
    },
  ])

  assert.equal(result.migrated, 1)
  const notes = listPracticeNotes(db, 1)
  assert.equal(notes.length, 1)
  assert.equal(notes[0].text, 'Legacy note from localStorage')
})
