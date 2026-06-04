import { config } from '../server/config.js'
import { lanrenPost } from '../server/lanrenClient.js'
import { requireLanrenAuth } from './lanrenAuth.mjs'

const auth = requireLanrenAuth()
const groupId = 1
const payload = await lanrenPost(
  '/v2/questions',
  { groupId, projectId: 10, categoryId: 108 },
  { ...auth, language: 'en' },
)
const q = payload.questions?.[0]
console.log('count', payload.questions?.length)
console.log(JSON.stringify(q, null, 2).slice(0, 1200))
