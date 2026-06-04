#!/usr/bin/env node

import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { fetchLanrenPackTopicQuestions } from '../server/lanrenClient.js'
import { countPackQuestions, replacePackTopicQuestions } from '../server/qmBank.js'
import { requireLanrenAuth } from './lanrenAuth.mjs'

const PACK_ID = '2026-practice'
const auth = requireLanrenAuth()
const groupId = Number(process.env.LANREN_GROUP_ID || 1)

try {
  const result = await fetchLanrenPackTopicQuestions({ ...auth, language: 'en' }, {
    packId: PACK_ID,
    groupId,
    topic: 'Quantitative Methods',
  })
  const db = new Database(config.dbPath)
  const imported = replacePackTopicQuestions(db, PACK_ID, 'Quantitative Methods', result.questions)
  const count = countPackQuestions(db, PACK_ID, { topic: 'Quantitative Methods' })

  console.log(`Pack: ${PACK_ID}`)
  console.log(`Project: ${result.project.name || result.project.title}`)
  console.log(`Category: ${result.category.title || result.category.name} (${result.category.total ?? result.questions.length} questions)`)
  console.log(`Imported ${imported} Quantitative Methods questions (${count} now in pack)`)
} catch (error) {
  console.error(`Import failed: ${error.message || error}`)
  process.exit(1)
}
