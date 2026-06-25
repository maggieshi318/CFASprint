import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  ensureFounderFunnelTables,
  getFounderFunnelSnapshot,
  markFounderEvent,
  updateFounderProfile,
} from './founderFunnel.js'

function createDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'student',
      locale TEXT NOT NULL DEFAULT 'en',
      password_hash TEXT NOT NULL,
      created_at TEXT
    );
  `)
  db.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)').run(
    'Candidate',
    'candidate@example.com',
    'hash',
  )
  ensureFounderFunnelTables(db)
  return db
}

test('founder funnel records qualification fields and value moments', () => {
  const db = createDb()

  updateFounderProfile(db, 1, {
    examWindow: 'aug_2026',
    dailyCheckinWilling: true,
    freeTrialFeedbackWilling: true,
    activationStarted: true,
  })
  markFounderEvent(db, 1, 'practice_completed')
  markFounderEvent(db, 1, 'ai_tutor_used')
  markFounderEvent(db, 1, 'ai_study_report_generated')
  markFounderEvent(db, 1, 'founder_offer_sent', { price: 49, currency: 'USD' })
  markFounderEvent(db, 1, 'founder_offer_accepted')

  const snapshot = getFounderFunnelSnapshot(db)
  assert.equal(snapshot.totals.qualifiedCandidates, 1)
  assert.equal(snapshot.totals.aiTutorUsed, 1)
  assert.equal(snapshot.totals.aiStudyReportGenerated, 1)
  assert.equal(snapshot.totals.valueSignal, 1)
  assert.equal(snapshot.totals.founderOfferAccepted, 1)
  assert.equal(snapshot.candidates[0].founderOfferPrice, 49)
  assert.equal(snapshot.candidates[0].founderOfferCurrency, 'USD')
  assert.equal(snapshot.candidates[0].stage, 'offer_accepted')
})

test('paid_user is explicit and not inferred from value signal', () => {
  const db = createDb()

  markFounderEvent(db, 1, 'ai_study_report_generated')
  let snapshot = getFounderFunnelSnapshot(db)
  assert.equal(snapshot.totals.paidUsers, 0)

  markFounderEvent(db, 1, 'paid_user')
  snapshot = getFounderFunnelSnapshot(db)
  assert.equal(snapshot.totals.paidUsers, 1)
  assert.equal(snapshot.candidates[0].stage, 'paid_user')
})

test('founder offer can capture rejection reason and feedback for daily review', () => {
  const db = createDb()

  markFounderEvent(db, 1, 'founder_offer_sent', { price: 179, currency: 'AED' })
  markFounderEvent(db, 1, 'founder_offer_rejected', {
    rejectionReason: 'Too expensive this week',
    feedback: 'Likes AI Study Report, wants WhatsApp check-in proof.',
  })

  const snapshot = getFounderFunnelSnapshot(db)
  assert.equal(snapshot.totals.founderOfferSent, 1)
  assert.equal(snapshot.totals.founderOfferRejected, 1)
  assert.equal(snapshot.candidates[0].founderOfferCurrency, 'AED')
  assert.equal(snapshot.candidates[0].founderOfferRejectionReason, 'Too expensive this week')
  assert.equal(snapshot.candidates[0].founderOfferFeedback, 'Likes AI Study Report, wants WhatsApp check-in proof.')
  assert.equal(snapshot.candidates[0].stage, 'offer_rejected')
})
