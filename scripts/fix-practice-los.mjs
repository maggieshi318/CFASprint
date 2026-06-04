#!/usr/bin/env node
/**
 * Update los for practice-pack rows where los is only a PP label (e.g. "2025PP").
 */
import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { TOPIC_LABELS } from '../server/questionBank.js'

const db = new Database(config.dbPath)
const rows = db
  .prepare(`SELECT id, topic, los FROM questions WHERE tags LIKE '%practice-pack%'`)
  .all()

const update = db.prepare('UPDATE questions SET los = ? WHERE id = ?')
let fixed = 0
for (const row of rows) {
  if (/^20\d{2}PP$/i.test(row.los)) {
    update.run(TOPIC_LABELS[row.topic] || row.topic, row.id)
    fixed += 1
  }
}
console.log(`Updated ${fixed} practice-pack rows with generic PP los.`)
