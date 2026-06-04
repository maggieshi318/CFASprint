#!/usr/bin/env node

import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import {
  fetchLanrenPackTopicQuestions,
  getLanrenTopicConfig,
  LANREN_PRACTICE_PACK_TOPICS,
  loadLanrenProject,
} from '../server/lanrenClient.js'
import { countPackQuestions, migrateLegacyLanrenTags, replacePackTopicQuestions } from '../server/qmBank.js'
import { requireLanrenAuth } from './lanrenAuth.mjs'

const PACK_ID = '2026-practice'
const auth = requireLanrenAuth()
const groupId = Number(process.env.LANREN_GROUP_ID || 1)
const onlyTopic = process.argv[2]?.trim()

const topics = onlyTopic ? [onlyTopic] : LANREN_PRACTICE_PACK_TOPICS

for (const topic of topics) {
  try {
    getLanrenTopicConfig(topic)
  } catch (error) {
    console.error(error.message || error)
    process.exit(1)
  }
}

const db = new Database(config.dbPath)
const migrated = migrateLegacyLanrenTags(db, PACK_ID)
if (migrated > 0) {
  console.log(`Migrated ${migrated} legacy Lanren questions to ${PACK_ID}`)
}
const authPayload = { ...auth, language: 'en' }
const { project, categories } = await loadLanrenProject(authPayload, PACK_ID, { groupId })

console.log(`Project: ${project.name || project.title}`)
console.log(`Importing ${topics.length} topic(s) into ${PACK_ID}...`)

let failures = 0
let importedTotal = 0

for (const topic of topics) {
  const topicConfig = getLanrenTopicConfig(topic)
  try {
    const result = await fetchLanrenPackTopicQuestions(authPayload, {
      packId: PACK_ID,
      groupId,
      topic,
      project,
      categories,
    })
    const imported = replacePackTopicQuestions(db, PACK_ID, topicConfig.topic, result.questions)
    const count = countPackQuestions(db, PACK_ID, { topic: topicConfig.topic })
    importedTotal += imported

    const label = result.category.title || result.category.name
    console.log(`✓ ${topicConfig.topic} — ${label} — imported ${imported} (${count} in pack)`)

    if (count !== topicConfig.expectedCount) {
      console.warn(`  warning: expected ${topicConfig.expectedCount}, found ${count}`)
    }
  } catch (error) {
    failures += 1
    console.error(`✗ ${topicConfig.topic} — ${error.message || error}`)
  }
}

const packTotal = countPackQuestions(db, PACK_ID)
const grandTotal = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count
console.log(`Done. Imported ${importedTotal} questions (${packTotal} in ${PACK_ID}, ${grandTotal} total in DB).`)

if (failures > 0) process.exit(1)
