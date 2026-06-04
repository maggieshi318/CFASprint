import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const text = fs.readFileSync(path.join(os.tmpdir(), 'lanren-modals.js'), 'utf8')
function show(term) {
  let idx = 0
  let n = 0
  while ((idx = text.indexOf(term, idx)) >= 0 && n < 3) {
    console.log('\n---', term, '---')
    console.log(text.slice(idx, idx + 300))
    idx += term.length
    n++
  }
}
for (const t of ['function gu', 'questionContent', 'optionList', 'moduleName', 'analysis', 'correctAnswer']) show(t)
