import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const file = path.join(os.tmpdir(), 'lanren-modals.js')
if (!fs.existsSync(file)) {
  console.error('Run: curl -s https://lanrencfa.cn/js/modals-BzrcrGe5.js -o %TEMP%/lanren-modals.js')
  process.exit(1)
}
const text = fs.readFileSync(file, 'utf8')

// find gu function - may be minified as ,gu= or function gu
const patterns = [',gu=', 'function gu(', 'gu=function']
for (const p of patterns) {
  const i = text.indexOf(p)
  if (i >= 0) {
    console.log('Found', p)
    console.log(text.slice(i, i + 2500))
    break
  }
}

// search common field names
for (const term of ['questions:', 'questionList', 'optionA', 'optionList', 'moduleName', 'analysis', 'title:', 'content:']) {
  const idx = text.indexOf(term)
  if (idx >= 0) console.log('\n', term, '->', text.slice(idx, idx + 150))
}
