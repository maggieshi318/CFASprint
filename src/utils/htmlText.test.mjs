import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'

async function loadHtmlTextModule() {
  const source = fs.readFileSync(new URL('./htmlText.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const file = path.join(os.tmpdir(), `htmlText-${Date.now()}-${Math.random()}.mjs`)
  fs.writeFileSync(file, compiled)
  return import(`file://${file}`)
}

test('parseQuestionStem keeps embedded statement tables between text blocks', async () => {
  const { parseQuestionStem } = await loadHtmlTextModule()
  const stem = [
    'An analyst gathers the following information:',
    '<!--STEM_TABLE:{"headers":["","Company 1","Company 2"],"rows":[["Revenue","7,586,000","9,445,000"]]}-->',
    'Based only on the companies common-size income statements, it appears that:',
  ].join('\n')

  const result = parseQuestionStem(stem)

  assert.deepEqual(result.blocks, [
    { type: 'text', text: 'An analyst gathers the following information:' },
    {
      type: 'table',
      headers: ['', 'Company 1', 'Company 2'],
      rows: [['Revenue', '7,586,000', '9,445,000']],
    },
    {
      type: 'text',
      text: 'Based only on the companies common-size income statements, it appears that:',
    },
  ])
  assert.equal(result.text.includes('STEM_TABLE'), false)
})
