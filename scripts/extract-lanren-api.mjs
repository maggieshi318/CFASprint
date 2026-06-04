import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.join(os.tmpdir(), 'lanren-index.js')
const text = fs.readFileSync(file, 'utf8')
const matches = [...text.matchAll(/Ql\.post\("([^"]+)"/g)].map((m) => m[1])
console.log([...new Set(matches)].sort().join('\n'))
