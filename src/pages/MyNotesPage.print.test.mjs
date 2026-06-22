import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('AI study report can be printed after generation', () => {
  const source = fs.readFileSync(new URL('./MyNotesPage.tsx', import.meta.url), 'utf8')
  const css = fs.readFileSync(new URL('../index.css', import.meta.url), 'utf8')

  assert.match(source, /function handlePrintReport\(\)/)
  assert.match(source, /window\.print\(\)/)
  assert.match(source, />\s*Print Report\s*</)
  assert.match(source, /className="qb-notes-print-btn"/)
  assert.match(css, /@media print/)
  assert.match(css, /\.qb-notes-print-btn/)
  assert.match(css, /\.qb-notes-report/)
})
