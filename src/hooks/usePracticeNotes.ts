import { useEffect, useState } from 'react'
import { fetchPracticeNotes, migratePracticeNotesRequest, type PracticeNoteRecord } from '../api/mockApi'
import { listPracticeNotes, PRACTICE_NOTES_CHANGED } from '../utils/practiceNotes'

function migrationKey(userId: string) {
  return `practice-notes-migrated:${userId}`
}

export function usePracticeNotes(token: string | null | undefined, userId: string | undefined) {
  const [notes, setNotes] = useState<PracticeNoteRecord[]>([])

  useEffect(() => {
    if (!userId) return

    const refresh = async () => {
      const legacyNotes = listPracticeNotes(userId)
      setNotes(legacyNotes)
      if (!token) return

      try {
        if (legacyNotes.length > 0 && sessionStorage.getItem(migrationKey(userId)) !== '1') {
          await migratePracticeNotesRequest(token, legacyNotes)
          sessionStorage.setItem(migrationKey(userId), '1')
        }
        const remoteNotes = await fetchPracticeNotes(token)
        setNotes(remoteNotes)
      } catch {
        setNotes(legacyNotes)
      }
    }

    refresh()

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail
      if (!detail?.userId || detail.userId === userId) void refresh()
    }

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes(userId)) void refresh()
    }

    window.addEventListener(PRACTICE_NOTES_CHANGED, onChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(PRACTICE_NOTES_CHANGED, onChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [token, userId])

  return userId ? notes : []
}
