#!/usr/bin/env node
import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { countPackQuestions } from '../server/qmBank.js'
import { extractPackId } from '../server/tagUtils.js'

const db = new Database(config.dbPath)
const total = db.prepare("SELECT COUNT(*) AS c FROM questions WHERE topic = 'Ethics'").get().c
console.log('Ethics total:', total)

const rows = db.prepare("SELECT tags FROM questions WHERE topic = 'Ethics'").all()
const packCounts = {}
for (const row of rows) {
  const pack = extractPackId(row.tags) || 'unknown'
  packCounts[pack] = (packCounts[pack] || 0) + 1
}
console.log('Ethics by pack:', packCounts)

const mockEthics = db.prepare("SELECT COUNT(*) AS c FROM questions WHERE topic = 'Ethics' AND tags LIKE '%mock-exam%'").get().c
const practiceEthics = db.prepare("SELECT COUNT(*) AS c FROM questions WHERE topic = 'Ethics' AND tags LIKE '%practice-pack%'").get().c
console.log('Ethics mock-exam:', mockEthics)
console.log('Ethics practice-pack:', practiceEthics)

for (const pack of ['2026-practice', '2025-practice', '2024-practice']) {
  console.log(`${pack} Ethics:`, countPackQuestions(db, pack, { topic: 'Ethics' }))
}
