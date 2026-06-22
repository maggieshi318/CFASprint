import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('practice notes render saved feedback separately from the character count', () => {
  const source = fs.readFileSync(new URL('./PracticePage.tsx', import.meta.url), 'utf8')

  assert.match(source, /className="practice-note-status"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /`\$\{draftNote\.length\} \/ 1000`/)
  assert.doesNotMatch(source, /noteSavedMessage \|\| `\$\{draftNote\.length\} \/ 1000`/)
})
