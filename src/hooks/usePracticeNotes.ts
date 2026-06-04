import { useEffect, useState } from 'react'
import { listPracticeNotes, PRACTICE_NOTES_CHANGED, type PracticeNoteRecord } from '../utils/practiceNotes'

export function usePracticeNotes(userId: string | undefined) {
  const [notes, setNotes] = useState<PracticeNoteRecord[]>([])

  useEffect(() => {
    if (!userId) {
      setNotes([])
      return
    }

    const refresh = () => setNotes(listPracticeNotes(userId))
    refresh()

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail
      if (!detail?.userId || detail.userId === userId) refresh()
    }

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes(userId)) refresh()
    }

    window.addEventListener(PRACTICE_NOTES_CHANGED, onChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(PRACTICE_NOTES_CHANGED, onChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [userId])

  return notes
}
