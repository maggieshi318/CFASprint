import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const text = fs.readFileSync(path.join(os.tmpdir(), 'lanren-modals.js'), 'utf8')
const idx = text.indexOf('/v2/questions')
console.log(text.slice(Math.max(0, idx - 800), idx + 2500))
