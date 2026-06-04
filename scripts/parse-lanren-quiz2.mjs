import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.join(os.tmpdir(), 'lanren-quiz.js')
const text = fs.readFileSync(file, 'utf8')
const apis = [...text.matchAll(/r\.post\("([^"]+)"/g)].map((m) => m[1])
console.log('POST:', [...new Set(apis)].join('\n'))
const idx = text.indexOf('/answer')
console.log('\n--- around /answer ---\n')
console.log(text.slice(Math.max(0, idx - 500), idx + 2000))
