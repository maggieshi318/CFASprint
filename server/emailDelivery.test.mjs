import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  buildFirstPracticeEmail,
  buildInactiveEmail,
  buildTrialExpiringEmail,
  buildWelcomeEmail,
  shouldMarkEmailSent,
} from './email.js'

test('marks Resend email as sent only when Resend returns an id', () => {
  assert.equal(shouldMarkEmailSent({ id: 'email_123' }), true)
  assert.equal(shouldMarkEmailSent({ skipped: true }), false)
  assert.equal(shouldMarkEmailSent({ error: 'missing api key' }), false)
  assert.equal(shouldMarkEmailSent(null), false)
})

test('public Docker compose passes Resend environment into production app', () => {
  const compose = fs.readFileSync(new URL('../docker-compose.public.yml', import.meta.url), 'utf8')

  assert.match(compose, /RESEND_API_KEY:\s*\$\{RESEND_API_KEY:-\}/)
  assert.match(compose, /RESEND_FROM:\s*\$\{RESEND_FROM:-/)
})

test('Resend activation emails are English-only for international candidates', () => {
  const emails = [
    buildWelcomeEmail({ name: 'Maggie', email: 'maggie@example.com' }),
    buildInactiveEmail({ name: 'Maggie', email: 'maggie@example.com' }),
    buildFirstPracticeEmail({ name: 'Maggie', email: 'maggie@example.com' }),
    buildTrialExpiringEmail({ name: 'Maggie', email: 'maggie@example.com', expiresAt: '2026-08-15T00:00:00Z' }),
  ]

  for (const message of emails) {
    const text = `${message.subject}\n${message.html}`
    assert.doesNotMatch(text, /[\u4e00-\u9fff]/)
    assert.doesNotMatch(text, /锛|鈥|馃|涓|浣|鏌|瀹|绔|€/)
  }

  assert.match(emails[0].subject, /Welcome to CFA Sprint/i)
  assert.match(emails[0].html, /Start practicing/i)
  assert.match(emails[1].subject, /ready when you are/i)
  assert.match(emails[2].subject, /Your AI Tutor review is ready/i)
  assert.match(emails[3].subject, /Your CFA Sprint trial ends soon/i)
})
