#!/usr/bin/env node

import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { fetchLanrenPackTopicQuestions, getLanrenTopicConfig } from '../server/lanrenClient.js'
import { countPackQuestions, replacePackTopicQuestions } from '../server/qmBank.js'
import { requireLanrenAuth } from './lanrenAuth.mjs'

const topicArg = process.argv[2]?.trim()
if (!topicArg) {
  console.error('Usage: node scripts/import-lanren-topic.mjs "<Topic Name>"')
  console.error('Supported topics:')
  console.error('  Quantitative Methods, Economics, FSA, Corporate Issuers, Equity Investments,')
  console.error('  Fixed Income, Derivatives, Alternative Investments, Portfolio Management, Ethics')
  console.error('Example: node scripts/import-lanren-topic.mjs "FSA"')
  process.exit(1)
}

let topicConfig
try {
  topicConfig = getLanrenTopicConfig(topicArg)
} catch (error) {
  console.error(error.message || error)
  process.exit(1)
}

const PACK_ID = process.env.LANREN_PACK_ID || '2026-practice'
const auth = requireLanrenAuth()
const groupId = Number(process.env.LANREN_GROUP_ID || 1)

try {
  const result = await fetchLanrenPackTopicQuestions({ ...auth, language: 'en' }, {
    packId: PACK_ID,
    groupId,
    topic: topicConfig.topic,
  })
  const db = new Database(config.dbPath)
  const imported = replacePackTopicQuestions(db, PACK_ID, topicConfig.topic, result.questions)
  const count = countPackQuestions(db, PACK_ID, { topic: topicConfig.topic })

  console.log(`Pack: ${PACK_ID}`)
  console.log(`Project: ${result.project.name || result.project.title}`)
  console.log(
    `Category: ${result.category.title || result.category.name} (${result.category.total ?? result.questions.length} questions)`,
  )
  console.log(`Imported ${imported} ${topicConfig.topic} questions (${count} now in pack)`)

  if (count !== topicConfig.expectedCount) {
    console.warn(`Warning: expected ${topicConfig.expectedCount} questions, found ${count}`)
  }
} catch (error) {
  console.error(`Import failed: ${error.message || error}`)
  process.exit(1)
}
