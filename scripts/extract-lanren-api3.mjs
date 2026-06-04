import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.join(os.tmpdir(), 'lanren-index.js')
const text = fs.readFileSync(file, 'utf8')
const matches = [...text.matchAll(/Ql\.get\("([^"]+)"/g)].map((m) => m[1])
console.log([...new Set(matches)].sort().join('\n'))

// Also search question-related strings
const q = [...text.matchAll(/"\/[^"]*question[^"]*"/gi)].map((m) => m[0])
console.log('\nquestion paths:')
console.log([...new Set(q)].slice(0, 50).join('\n'))
