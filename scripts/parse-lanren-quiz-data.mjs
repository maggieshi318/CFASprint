import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.join(os.tmpdir(), 'lanren-quiz-data.js')
if (!fs.existsSync(file)) {
  console.error('missing file')
  process.exit(1)
}
const text = fs.readFileSync(file, 'utf8')
console.log('len', text.length)
const apis = [...text.matchAll(/\.post\("([^"]+)"/g)].map((m) => m[1])
console.log('POST:', [...new Set(apis)].join('\n'))
const idx = text.indexOf('question')
console.log(text.slice(idx, idx + 1500))
