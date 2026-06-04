import { config } from '../server/config.js'
import { lanrenPost } from '../server/lanrenClient.js'
import { requireLanrenAuth } from './lanrenAuth.mjs'

const auth = requireLanrenAuth()
const groupId = Number(process.env.LANREN_GROUP_ID || 1)
const projects = await lanrenPost('/v2/project', { groupId }, { ...auth, language: 'en' })
const list = Array.isArray(projects) ? projects : projects?.list || []

for (const p of list) {
  const cats = p.category || p.categories || []
  console.log('\n---', p.projectId || p.id, JSON.stringify(p.name || p.title), '---')
  console.log('category count:', cats.length)
  cats.forEach((c) => console.log(' ', c.id, JSON.stringify(c.title || c.name), 'total=', c.total))
}
