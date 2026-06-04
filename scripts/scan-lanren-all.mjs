import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const files = ['lanren-index.js', 'lanren-quiz.js', 'lanren-landing.js', 'lanren-modals.js', 'lanren-quiz-data.js']
for (const name of files) {
  const fp = path.join(os.tmpdir(), name)
  if (!fs.existsSync(fp)) continue
  const text = fs.readFileSync(fp, 'utf8')
  const apis = [...text.matchAll(/\.post\("([^"]+)"/g)].map((m) => m[1])
  if (apis.length) console.log(name, ':', [...new Set(apis)].join(', '))
}

// search question load pattern across index
const index = fs.readFileSync(path.join(os.tmpdir(), 'lanren-index.js'), 'utf8')
for (const pat of ['"/question', 'question/list', 'getQuestion', 'fetchQuestion', '/category', '/project/question']) {
  let idx = 0
  while ((idx = index.indexOf(pat, idx)) >= 0) {
    console.log('\nFOUND', pat, ':', index.slice(idx, idx + 200))
    idx += pat.length
    if (idx > 500000) break
  }
}
