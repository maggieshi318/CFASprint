#!/usr/bin/env node
/**
 * Fix mock/past-mock questions incorrectly tagged as Ethics
 * (caused by inferTopicFromText defaulting to Ethics).
 * Keeps practice-pack Ethics (148 per pack from Lanren category).
 */
import Database from 'better-sqlite3'
import { config } from '../server/config.js'

const db = new Database(config.dbPath)

const before = db.prepare("SELECT COUNT(*) AS c FROM questions WHERE topic = 'Ethics'").get().c
const mockMislabeled = db
  .prepare("SELECT COUNT(*) AS c FROM questions WHERE topic = 'Ethics' AND tags LIKE '%mock-exam%'")
  .get().c

const fix = db.transaction(() => {
  db.prepare(`
    UPDATE questions
    SET topic = 'Mock Exam'
    WHERE topic = 'Ethics'
      AND tags LIKE '%mock-exam%'
  `).run()
})

fix()

const after = db.prepare("SELECT COUNT(*) AS c FROM questions WHERE topic = 'Ethics'").get().c
const practiceEthics = db
  .prepare("SELECT COUNT(*) AS c FROM questions WHERE topic = 'Ethics' AND tags LIKE '%practice-pack%'")
  .get().c

console.log(`Fixed ${mockMislabeled} mock questions: Ethics -> Mock Exam`)
console.log(`Ethics before: ${before}, after: ${after}`)
console.log(`Practice-pack Ethics kept: ${practiceEthics}`)
