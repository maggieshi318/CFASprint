#!/usr/bin/env node
import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { parseQuestionStem } from '../server/htmlText.js'

const db = new Database(config.dbPath)
const r = db.prepare(
  `SELECT stem FROM questions
   WHERE tags LIKE '%pack:2025-practice%' AND topic='Quantitative Methods'
   AND stem LIKE '%prediction interval%'`,
).get()
const parsed = parseQuestionStem(r.stem)
console.log('text:', parsed.text.slice(0, 120))
console.log('images:', parsed.images)
