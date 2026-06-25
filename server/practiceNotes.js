export function ensurePracticeNotesTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      note_text TEXT NOT NULL,
      pack TEXT,
      topic TEXT,
      session TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, question_id)
    );
  `)
}

function normalizeNoteRow(row) {
  return {
    questionId: row.question_id,
    text: row.note_text,
    updatedAt: row.updated_at,
    pack: row.pack || undefined,
    topic: row.topic || undefined,
    session: row.session || undefined,
  }
}

function clampNoteText(value) {
  return String(value || '').slice(0, 1000)
}

export function listPracticeNotes(db, userId) {
  return db
    .prepare(
      `
      SELECT question_id, note_text, pack, topic, session, updated_at
      FROM practice_notes
      WHERE user_id = ? AND trim(note_text) != ''
      ORDER BY datetime(updated_at) DESC, question_id DESC
    `,
    )
    .all(userId)
    .map(normalizeNoteRow)
}

export function readPracticeNote(db, userId, questionId) {
  const row = db
    .prepare(
      `
      SELECT question_id, note_text, pack, topic, session, updated_at
      FROM practice_notes
      WHERE user_id = ? AND question_id = ?
    `,
    )
    .get(userId, questionId)
  return row ? normalizeNoteRow(row) : null
}

export function upsertPracticeNote(db, userId, payload) {
  const questionId = Number(payload.questionId)
  if (!Number.isInteger(questionId)) {
    throw new Error('questionId is required')
  }

  const text = clampNoteText(payload.text)
  if (!text.trim()) {
    db.prepare('DELETE FROM practice_notes WHERE user_id = ? AND question_id = ?').run(userId, questionId)
    return null
  }

  db.prepare(
    `
    INSERT INTO practice_notes (user_id, question_id, note_text, pack, topic, session, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, question_id) DO UPDATE SET
      note_text = excluded.note_text,
      pack = COALESCE(excluded.pack, practice_notes.pack),
      topic = COALESCE(excluded.topic, practice_notes.topic),
      session = COALESCE(excluded.session, practice_notes.session),
      updated_at = CURRENT_TIMESTAMP
  `,
  ).run(
    userId,
    questionId,
    text,
    payload.pack || null,
    payload.topic || null,
    payload.session || null,
  )

  return readPracticeNote(db, userId, questionId)
}

export function migratePracticeNotes(db, userId, notes) {
  if (!Array.isArray(notes)) return { migrated: 0 }

  let migrated = 0
  const seen = new Set()
  const insert = db.transaction((rows) => {
    for (const note of rows) {
      const questionId = Number(note?.questionId)
      const text = clampNoteText(note?.text)
      if (!Number.isInteger(questionId) || !text.trim() || seen.has(questionId)) continue
      seen.add(questionId)
      upsertPracticeNote(db, userId, {
        questionId,
        text,
        pack: note.pack,
        topic: note.topic,
        session: note.session,
      })
      migrated += 1
    }
  })

  insert(notes)
  return { migrated }
}
