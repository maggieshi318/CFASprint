import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BookmarkedQuestionSummary, WrongQuestionSummary } from '../utils/studyReview'

type StudyContextType = {
  favorites: number[]
  favoriteQuestions: BookmarkedQuestionSummary[]
  wrong: number[]
  wrongQuestions: WrongQuestionSummary[]
  done: number[]
  setFromServer: (payload: {
    favorites: number[]
    favoriteQuestions?: BookmarkedQuestionSummary[]
    wrongIds: number[]
    wrongQuestions?: WrongQuestionSummary[]
    doneIds: number[]
  }) => void
  markDone: (id: number) => void
  markWrong: (id: number) => void
  recordWrongQuestion: (summary: WrongQuestionSummary) => void
  recordFavoriteQuestion: (summary: BookmarkedQuestionSummary) => void
  removeWrong: (id: number) => void
  removeFavorite: (id: number) => void
  setFavorites: (ids: number[]) => void
}

const StudyContext = createContext<StudyContextType | null>(null)

export function StudyProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([])
  const [favoriteQuestions, setFavoriteQuestions] = useState<BookmarkedQuestionSummary[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionSummary[]>([])
  const [done, setDone] = useState<number[]>([])

  const setFromServer = useCallback((payload: {
    favorites: number[]
    favoriteQuestions?: BookmarkedQuestionSummary[]
    wrongIds: number[]
    wrongQuestions?: WrongQuestionSummary[]
    doneIds: number[]
  }) => {
    setFavorites(payload.favorites)
    setFavoriteQuestions((prev) => {
      const idSet = new Set(payload.favorites)
      const merged = new Map<number, BookmarkedQuestionSummary>()
      for (const entry of prev) {
        if (idSet.has(entry.id)) merged.set(entry.id, entry)
      }
      for (const entry of payload.favoriteQuestions || []) {
        merged.set(entry.id, entry)
      }
      return payload.favorites
        .map((id) => merged.get(id))
        .filter((entry): entry is BookmarkedQuestionSummary => Boolean(entry))
    })
    setWrong(payload.wrongIds)
    setWrongQuestions((prev) => {
      const idSet = new Set(payload.wrongIds)
      const merged = new Map<number, WrongQuestionSummary>()
      for (const entry of prev) {
        if (idSet.has(entry.id)) merged.set(entry.id, entry)
      }
      for (const entry of payload.wrongQuestions || []) {
        merged.set(entry.id, entry)
      }
      return [...merged.values()]
    })
    setDone(payload.doneIds)
  }, [])

  const markDone = useCallback((id: number) => {
    setDone((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const markWrong = useCallback((id: number) => {
    setWrong((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const recordWrongQuestion = useCallback((summary: WrongQuestionSummary) => {
    setWrong((prev) => (prev.includes(summary.id) ? prev : [...prev, summary.id]))
    setWrongQuestions((prev) => [summary, ...prev.filter((entry) => entry.id !== summary.id)])
  }, [])

  const removeWrong = useCallback((id: number) => {
    setWrong((prev) => prev.filter((entry) => entry !== id))
    setWrongQuestions((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const recordFavoriteQuestion = useCallback((summary: BookmarkedQuestionSummary) => {
    setFavorites((prev) => (prev.includes(summary.id) ? prev : [...prev, summary.id]))
    setFavoriteQuestions((prev) => [summary, ...prev.filter((entry) => entry.id !== summary.id)])
  }, [])

  const removeFavorite = useCallback((id: number) => {
    setFavorites((prev) => prev.filter((entry) => entry !== id))
    setFavoriteQuestions((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const setFavoritesList = useCallback((ids: number[]) => {
    setFavorites(ids)
    setFavoriteQuestions((prev) => prev.filter((entry) => ids.includes(entry.id)))
  }, [])

  const value = useMemo(
    () => ({
      favorites,
      favoriteQuestions,
      wrong,
      wrongQuestions,
      done,
      setFromServer,
      markDone,
      markWrong,
      recordWrongQuestion,
      recordFavoriteQuestion,
      removeWrong,
      removeFavorite,
      setFavorites: setFavoritesList,
    }),
    [favorites, favoriteQuestions, wrong, wrongQuestions, done, setFromServer, markDone, markWrong, recordWrongQuestion, recordFavoriteQuestion, removeWrong, removeFavorite, setFavoritesList],
  )

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
}

export function useStudy() {
  const ctx = useContext(StudyContext)
  if (!ctx) throw new Error('useStudy must be used within StudyProvider')
  return ctx
}
