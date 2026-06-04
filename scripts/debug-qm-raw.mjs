#!/usr/bin/env node
import '../server/config.js'
import { lanrenPost, loadLanrenProject } from '../server/lanrenClient.js'
import { requireLanrenAuth } from './lanrenAuth.mjs'

const auth = requireLanrenAuth()
const { project, categories } = await loadLanrenProject({ ...auth, language: 'en' }, '2025-practice')
const cat = categories.find((c) => /quant/i.test(c.title || c.name || ''))
const payload = await lanrenPost('/v2/questions', {
  groupId: 1,
  projectId: project.projectId || project.id,
  categoryId: cat.id,
}, { ...auth, language: 'en' })

const rawQuestions = payload?.questions || payload?.questionList || payload?.list || []
const q = rawQuestions.find((item) => JSON.stringify(item).includes('prediction interval')) || rawQuestions[0]

console.log('keys:', Object.keys(q))
for (const key of Object.keys(q)) {
  const val = q[key]
  if (typeof val === 'string' && val.length > 20 && val.length < 5000) {
    if (/prediction|table|regression/i.test(val)) {
      console.log(`\n--- ${key} (${val.length}) ---`)
      console.log(val.slice(0, 2500))
    }
  }
}
