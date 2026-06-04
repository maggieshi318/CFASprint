#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { buildQmPracticePackQuestions, questionsToCsv, replaceTopicQuestions } from '../server/qmBank.js'

const topic = 'Quantitative Methods'
const outputCsv = path.join(process.cwd(), 'data', 'qm-practice-pack-79.csv')

const rows = buildQmPracticePackQuestions()
const csv = questionsToCsv(rows)
fs.mkdirSync(path.dirname(outputCsv), { recursive: true })
fs.writeFileSync(outputCsv, csv, 'utf8')

const db = new Database(config.dbPath)
const imported = replaceTopicQuestions(db, topic, rows)
const qmCount = db.prepare('SELECT COUNT(*) AS count FROM questions WHERE topic = ?').get(topic).count
const total = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count

console.log(`Wrote ${outputCsv}`)
console.log(`Imported ${imported} ${topic} questions (${qmCount} now in DB, ${total} total)`)

if (qmCount !== 79) {
  console.error(`Expected 79 ${topic} questions, found ${qmCount}`)
  process.exitCode = 1
}
