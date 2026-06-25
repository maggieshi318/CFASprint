const FOUNDER_EVENTS = new Map([
  ['activation_started', 'activation_started_at'],
  ['practice_completed', 'practice_completed_at'],
  ['ai_tutor_used', 'ai_tutor_used_at'],
  ['ai_study_report_generated', 'ai_study_report_generated_at'],
  ['value_signal', 'value_signal_at'],
  ['founder_offer_sent', 'founder_offer_sent_at'],
  ['founder_offer_accepted', 'founder_offer_accepted_at'],
  ['founder_offer_rejected', 'founder_offer_rejected_at'],
  ['paid_user', 'paid_user_at'],
])

export function ensureFounderFunnelTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS founder_funnel (
      user_id INTEGER PRIMARY KEY,
      source TEXT,
      exam_window TEXT,
      daily_checkin_willing INTEGER NOT NULL DEFAULT 0,
      free_trial_feedback_willing INTEGER NOT NULL DEFAULT 0,
      activation_started_at TEXT,
      practice_completed_at TEXT,
      ai_tutor_used_at TEXT,
      ai_study_report_generated_at TEXT,
      value_signal_at TEXT,
      founder_offer_sent_at TEXT,
      founder_offer_price REAL,
      founder_offer_currency TEXT,
      founder_offer_accepted_at TEXT,
      founder_offer_rejected_at TEXT,
      founder_offer_rejection_reason TEXT,
      founder_offer_feedback TEXT,
      paid_user_at TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
  ensureColumn(db, 'founder_funnel', 'founder_offer_price', 'REAL')
  ensureColumn(db, 'founder_funnel', 'founder_offer_currency', 'TEXT')
  ensureColumn(db, 'founder_funnel', 'founder_offer_accepted_at', 'TEXT')
  ensureColumn(db, 'founder_funnel', 'founder_offer_rejected_at', 'TEXT')
  ensureColumn(db, 'founder_funnel', 'founder_offer_rejection_reason', 'TEXT')
  ensureColumn(db, 'founder_funnel', 'founder_offer_feedback', 'TEXT')
}

function ensureColumn(db, tableName, columnName, columnSql) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  const hasColumn = columns.some((col) => col.name === columnName)
  if (!hasColumn) db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`)
}

function ensureFounderRow(db, userId) {
  db.prepare(
    `
    INSERT INTO founder_funnel (user_id, created_at, updated_at)
    VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO NOTHING
  `,
  ).run(userId)
}

function truthyFlag(value) {
  return value ? 1 : 0
}

export function updateFounderProfile(db, userId, payload) {
  ensureFounderRow(db, userId)
  const fields = []
  const values = []

  if (payload.source !== undefined) {
    fields.push('source = ?')
    values.push(payload.source || null)
  }
  if (payload.examWindow !== undefined) {
    fields.push('exam_window = ?')
    values.push(payload.examWindow || null)
  }
  if (payload.dailyCheckinWilling !== undefined) {
    fields.push('daily_checkin_willing = ?')
    values.push(truthyFlag(payload.dailyCheckinWilling))
  }
  if (payload.freeTrialFeedbackWilling !== undefined) {
    fields.push('free_trial_feedback_willing = ?')
    values.push(truthyFlag(payload.freeTrialFeedbackWilling))
  }
  if (payload.adminNotes !== undefined) {
    fields.push('admin_notes = ?')
    values.push(payload.adminNotes || null)
  }
  if (payload.activationStarted) {
    fields.push('activation_started_at = COALESCE(activation_started_at, CURRENT_TIMESTAMP)')
  }

  if (fields.length === 0) return getFounderProfile(db, userId)
  fields.push('updated_at = CURRENT_TIMESTAMP')
  db.prepare(`UPDATE founder_funnel SET ${fields.join(', ')} WHERE user_id = ?`).run(...values, userId)
  return getFounderProfile(db, userId)
}

export function markFounderEvent(db, userId, eventName, payload = {}) {
  const column = FOUNDER_EVENTS.get(eventName)
  if (!column) throw new Error(`Unsupported founder funnel event: ${eventName}`)

  ensureFounderRow(db, userId)
  const fields = [`${column} = COALESCE(${column}, CURRENT_TIMESTAMP)`]
  const values = []
  if (
    eventName === 'ai_tutor_used' ||
    eventName === 'ai_study_report_generated' ||
    eventName === 'value_signal'
  ) {
    fields.push('value_signal_at = COALESCE(value_signal_at, CURRENT_TIMESTAMP)')
  }
  if (eventName === 'founder_offer_sent') {
    const price = Number(payload.price)
    if (Number.isFinite(price) && price > 0) {
      fields.push('founder_offer_price = ?')
      values.push(price)
    }
    const currency = normalizeCurrency(payload.currency)
    if (currency) {
      fields.push('founder_offer_currency = ?')
      values.push(currency)
    }
  }
  if (eventName === 'founder_offer_rejected') {
    fields.push('founder_offer_rejection_reason = ?')
    values.push(String(payload.rejectionReason || '').trim().slice(0, 500) || null)
    fields.push('founder_offer_feedback = ?')
    values.push(String(payload.feedback || '').trim().slice(0, 1000) || null)
  }
  fields.push('updated_at = CURRENT_TIMESTAMP')
  db.prepare(`UPDATE founder_funnel SET ${fields.join(', ')} WHERE user_id = ?`).run(...values, userId)
  return getFounderProfile(db, userId)
}

function normalizeCurrency(value) {
  const currency = String(value || '').trim().toUpperCase()
  if (currency === 'USD' || currency === 'AED') return currency
  return ''
}

export function getFounderProfile(db, userId) {
  const row = db.prepare('SELECT * FROM founder_funnel WHERE user_id = ?').get(userId)
  return row ? normalizeFounderRow(row) : null
}

function normalizeFounderRow(row) {
  return {
    userId: row.user_id,
    source: row.source,
    examWindow: row.exam_window,
    dailyCheckinWilling: Boolean(row.daily_checkin_willing),
    freeTrialFeedbackWilling: Boolean(row.free_trial_feedback_willing),
    activationStartedAt: row.activation_started_at,
    practiceCompletedAt: row.practice_completed_at,
    aiTutorUsedAt: row.ai_tutor_used_at,
    aiStudyReportGeneratedAt: row.ai_study_report_generated_at,
    valueSignalAt: row.value_signal_at,
    founderOfferSentAt: row.founder_offer_sent_at,
    founderOfferPrice: row.founder_offer_price == null ? null : Number(row.founder_offer_price),
    founderOfferCurrency: row.founder_offer_currency,
    founderOfferAcceptedAt: row.founder_offer_accepted_at,
    founderOfferRejectedAt: row.founder_offer_rejected_at,
    founderOfferRejectionReason: row.founder_offer_rejection_reason,
    founderOfferFeedback: row.founder_offer_feedback,
    paidUserAt: row.paid_user_at,
    adminNotes: row.admin_notes,
    stage: founderStage(row),
  }
}

function founderStage(row) {
  if (row.paid_user_at) return 'paid_user'
  if (row.founder_offer_accepted_at) return 'offer_accepted'
  if (row.founder_offer_rejected_at) return 'offer_rejected'
  if (row.founder_offer_sent_at) return 'offer_sent'
  if (row.value_signal_at) return 'value_signal'
  if (row.practice_completed_at) return 'practice_completed'
  if (row.activation_started_at) return 'activation_started'
  if (row.exam_window && row.daily_checkin_willing && row.free_trial_feedback_willing) return 'qualified'
  return 'unqualified'
}

function count(rows, predicate) {
  return rows.filter(predicate).length
}

export function getFounderFunnelSnapshot(db) {
  const rows = db
    .prepare(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,
        f.*
      FROM users u
      LEFT JOIN founder_funnel f ON f.user_id = u.id
      WHERE u.role != 'admin'
      ORDER BY datetime(u.created_at) DESC, u.id DESC
    `,
    )
    .all()

  const candidates = rows.map((row) => {
    const normalized = normalizeFounderRow({
      user_id: row.id,
      source: row.source,
      exam_window: row.exam_window,
      daily_checkin_willing: row.daily_checkin_willing || 0,
      free_trial_feedback_willing: row.free_trial_feedback_willing || 0,
      activation_started_at: row.activation_started_at,
      practice_completed_at: row.practice_completed_at,
      ai_tutor_used_at: row.ai_tutor_used_at,
      ai_study_report_generated_at: row.ai_study_report_generated_at,
      value_signal_at: row.value_signal_at,
      founder_offer_sent_at: row.founder_offer_sent_at,
      founder_offer_price: row.founder_offer_price,
      founder_offer_currency: row.founder_offer_currency,
      founder_offer_accepted_at: row.founder_offer_accepted_at,
      founder_offer_rejected_at: row.founder_offer_rejected_at,
      founder_offer_rejection_reason: row.founder_offer_rejection_reason,
      founder_offer_feedback: row.founder_offer_feedback,
      paid_user_at: row.paid_user_at,
      admin_notes: row.admin_notes,
    })
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
      ...normalized,
    }
  })

  return {
    totals: {
      qualifiedCandidates: count(
        candidates,
        (item) => item.examWindow && item.dailyCheckinWilling && item.freeTrialFeedbackWilling,
      ),
      activationStarted: count(candidates, (item) => item.activationStartedAt),
      practiceCompleted: count(candidates, (item) => item.practiceCompletedAt),
      aiTutorUsed: count(candidates, (item) => item.aiTutorUsedAt),
      aiStudyReportGenerated: count(candidates, (item) => item.aiStudyReportGeneratedAt),
      valueSignal: count(candidates, (item) => item.valueSignalAt),
      founderOfferSent: count(candidates, (item) => item.founderOfferSentAt),
      founderOfferAccepted: count(candidates, (item) => item.founderOfferAcceptedAt),
      founderOfferRejected: count(candidates, (item) => item.founderOfferRejectedAt),
      paidUsers: count(candidates, (item) => item.paidUserAt),
    },
    candidates,
  }
}
