import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('server startup does not reset the candidate demo account to free', () => {
  const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /SET plan = 'free'[\s\S]*WHERE lower\(email\) = 'candidate@example\.com'/)
})
