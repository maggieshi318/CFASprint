import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.join(os.tmpdir(), 'lanren-quiz.js')
const text = fs.readFileSync(file, 'utf8')
console.log(text.slice(0, 8000))
console.log('\n--- API ---\n')
for (const pattern of [/\.post\("([^"]+)"/g, /\.get\("([^"]+)"/g, /"\/api\/[^"]+"/g]) {
  const matches = [...text.matchAll(pattern)].map((m) => m[1] || m[0])
  console.log([...new Set(matches)].join('\n'))
}
