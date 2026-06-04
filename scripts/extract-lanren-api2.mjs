import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.join(os.tmpdir(), 'lanren-index.js')
const text = fs.readFileSync(file, 'utf8')
for (const pattern of [
  /fetch\("([^"]+)"/g,
  /Ql\.(get|post|put)\("([^"]+)"/g,
  /baseURL[^,]+/g,
  /\/v2\/[a-zA-Z0-9_/]+/g,
]) {
  const matches = [...text.matchAll(pattern)].map((m) => m[1] || m[0]).slice(0, 30)
  console.log('\n===', pattern, '===')
  console.log([...new Set(matches)].slice(0, 40).join('\n'))
}
