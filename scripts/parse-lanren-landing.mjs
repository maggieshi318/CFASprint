import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const text = fs.readFileSync(path.join(os.tmpdir(), 'lanren-landing.js'), 'utf8')
console.log('len', text.length)
const apis = [...text.matchAll(/\.post\("([^"]+)"/g)].map((m) => m[1])
console.log('POST:', [...new Set(apis)].join('\n'))
for (const term of ['Quantitative', 'category', 'projectId', 'question', '/quiz']) {
  const i = text.indexOf(term)
  if (i >= 0) console.log('\n---', term, '---\n', text.slice(i, i + 400))
}
