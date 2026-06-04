#!/usr/bin/env node

import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import {
  fetchLanrenPackCategoryQuestions,
  fetchLanrenPackTopicQuestions,
  loadLanrenProject,
} from '../server/lanrenClient.js'
import { getLanrenPackConfig, LANREN_PACK_ORDER } from '../server/lanrenPacks.js'
import { getLanrenTopicConfig, LANREN_PRACTICE_PACK_TOPICS } from '../server/lanrenTopics.js'
import {
  countPackQuestions,
  migrateLegacyLanrenTags,
  replacePackCategoryQuestions,
  replacePackTopicQuestions,
} from '../server/qmBank.js'
import { requireLanrenAuth } from './lanrenAuth.mjs'

const auth = requireLanrenAuth()
const groupId = Number(process.env.LANREN_GROUP_ID || 1)
const onlyPack = process.argv[2]?.trim()
const onlyTopic = process.argv[3]?.trim()

const packs = onlyPack ? [onlyPack] : LANREN_PACK_ORDER

for (const packId of packs) {
  try {
    getLanrenPackConfig(packId)
  } catch (error) {
    console.error(error.message || error)
    process.exit(1)
  }
}

const db = new Database(config.dbPath)
const migrated = migrateLegacyLanrenTags(db, '2026-practice')
if (migrated > 0) {
  console.log(`Migrated ${migrated} legacy Lanren questions to 2026-practice`)
}
const authPayload = { ...auth, language: 'en' }

let failures = 0
let importedTotal = 0

for (const packId of packs) {
  const packConfig = getLanrenPackConfig(packId)
  console.log(`\n=== ${packId} (${packConfig.kind}) ===`)

  let projectContext
  try {
    projectContext = await loadLanrenProject(authPayload, packId, { groupId })
  } catch (error) {
    failures += 1
    console.error(`✗ Could not load project — ${error.message || error}`)
    continue
  }

  const { project, categories } = projectContext
  console.log(`Project: ${project.name || project.title}`)
  console.log(`Categories: ${categories.length}`)

  if (packConfig.kind === 'practice') {
    const topics = onlyTopic ? [onlyTopic] : LANREN_PRACTICE_PACK_TOPICS
    for (const topic of topics) {
      const topicConfig = getLanrenTopicConfig(topic)
      try {
        const result = await fetchLanrenPackTopicQuestions(authPayload, {
          packId,
          groupId,
          topic,
          project,
          categories,
        })
        const imported = replacePackTopicQuestions(db, packId, topicConfig.topic, result.questions)
        const count = countPackQuestions(db, packId, { topic: topicConfig.topic })
        importedTotal += imported
        const label = result.category.title || result.category.name
        console.log(`✓ ${topicConfig.topic} — ${label} — imported ${imported} (${count} in pack)`)
        await new Promise((resolve) => setTimeout(resolve, 400))
      } catch (error) {
        failures += 1
        console.error(`✗ ${topicConfig.topic} — ${error.message || error}`)
      }
    }
  } else {
    for (const category of categories) {
      try {
        const result = await fetchLanrenPackCategoryQuestions(authPayload, {
          packId,
          groupId,
          categoryId: category.id,
          project,
          categories,
        })
        const imported = replacePackCategoryQuestions(db, packId, category.id, result.questions)
        const count = countPackQuestions(db, packId, { categoryId: category.id })
        importedTotal += imported
        const label = category.title || category.name || category.id
        console.log(`✓ ${label} — imported ${imported} (${count} in pack)`)
        await new Promise((resolve) => setTimeout(resolve, 400))
      } catch (error) {
        failures += 1
        const label = category.title || category.name || category.id
        console.error(`✗ ${label} — ${error.message || error}`)
      }
    }
  }

  const packTotal = countPackQuestions(db, packId)
  console.log(`Pack total: ${packTotal}`)
}

const grandTotal = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count
console.log(`\nDone. Imported ${importedTotal} questions (${grandTotal} total in DB). Failures: ${failures}`)

if (failures > 0) process.exit(1)
