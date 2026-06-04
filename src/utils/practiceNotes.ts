export type PracticeNoteRecord = {
  questionId: number
  text: string
  updatedAt: string
  pack?: string
  topic?: string
  session?: string
}

export const PRACTICE_NOTES_CHANGED = 'practice-notes-changed'

const NOTE_PREFIX = 'practice-note'
const INDEX_PREFIX = 'practice-notes-index'

export function noteStorageKey(userId: string, questionId: number) {
  return `${NOTE_PREFIX}:${userId}:${questionId}`
}

function indexStorageKey(userId: string) {
  return `${INDEX_PREFIX}:${userId}`
}

export function readPracticeNote(userId: string, questionId: number): string {
  if (!userId) return ''
  return localStorage.getItem(noteStorageKey(userId, questionId)) || ''
}

function rebuildIndexFromStorage(userId: string): PracticeNoteRecord[] {
  const prefix = `${NOTE_PREFIX}:${userId}:`
  const entries: PracticeNoteRecord[] = []

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith(prefix)) continue
    const questionId = Number(key.slice(prefix.length))
    if (!Number.isFinite(questionId)) continue
    const text = localStorage.getItem(key) || ''
    if (!text.trim()) continue
    entries.push({
      questionId,
      text,
      updatedAt: new Date(0).toISOString(),
    })
  }

  entries.sort((a, b) => b.questionId - a.questionId)
  localStorage.setItem(indexStorageKey(userId), JSON.stringify(entries))
  return entries
}

export function listPracticeNotes(userId: string): PracticeNoteRecord[] {
  if (!userId) return []

  const raw = localStorage.getItem(indexStorageKey(userId))
  if (!raw) return rebuildIndexFromStorage(userId)

  try {
    const entries = (JSON.parse(raw) as PracticeNoteRecord[]).filter((entry) => entry.text?.trim())
    if (entries.length === 0) {
      const rebuilt = rebuildIndexFromStorage(userId)
      if (rebuilt.length > 0) return rebuilt
    }
    return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return rebuildIndexFromStorage(userId)
  }
}

export function getPracticeNoteCount(userId: string): number {
  return listPracticeNotes(userId).length
}

function notifyNotesChanged(userId: string) {
  window.dispatchEvent(new CustomEvent(PRACTICE_NOTES_CHANGED, { detail: { userId } }))
}

export function savePracticeNote(
  userId: string,
  payload: {
    questionId: number
    text: string
    pack?: string
    topic?: string
    session?: string
  },
): PracticeNoteRecord | null {
  if (!userId) return null

  const trimmed = payload.text.slice(0, 1000)
  const key = noteStorageKey(userId, payload.questionId)
  const existingNotes = listPracticeNotes(userId)

  if (trimmed) localStorage.setItem(key, trimmed)
  else localStorage.removeItem(key)

  const notes = existingNotes.filter((entry) => entry.questionId !== payload.questionId)
  let record: PracticeNoteRecord | null = null

  if (trimmed) {
    const existing = notes.find((entry) => entry.questionId === payload.questionId)
    record = {
      questionId: payload.questionId,
      text: trimmed,
      updatedAt: new Date().toISOString(),
      pack: payload.pack ?? existing?.pack,
      topic: payload.topic ?? existing?.topic,
      session: payload.session ?? existing?.session,
    }
    notes.unshift(record)
  }

  localStorage.setItem(indexStorageKey(userId), JSON.stringify(notes))
  notifyNotesChanged(userId)
  return record
}

export function buildNoteSessionPath(note: PracticeNoteRecord) {
  const params = new URLSearchParams()
  if (note.pack) params.set('pack', note.pack)
  if (note.topic) params.set('topic', note.topic)
  if (note.session) params.set('session', note.session)
  params.set('questionId', String(note.questionId))
  return `/study/practice/session?${params.toString()}`
}
