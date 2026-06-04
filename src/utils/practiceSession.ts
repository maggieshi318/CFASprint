import type { Answer } from '../types'

export type PracticeQuestionState = {
  selected: Answer | null
  submitted: boolean
  correct: boolean | null
  explanation?: string
  correctAnswer?: Answer
}

export type PracticeSessionSnapshot = {
  pack: string
  topic: string
  category: string
  session: string
  questionIds: number[]
  index: number
  questionStates: Record<number, PracticeQuestionState>
  updatedAt: string
}

export type PracticeSessionScope = {
  userId: string
  pack: string
  topic: string
  category: string
  session: string
}

function sessionStorageKey(scope: PracticeSessionScope) {
  return [
    'practice-session',
    scope.userId,
    scope.pack || 'default',
    scope.topic || 'default',
    scope.category || 'default',
    scope.session || 'default',
  ].join(':')
}

export function readPracticeSession(scope: PracticeSessionScope): PracticeSessionSnapshot | null {
  if (!scope.userId) return null
  const raw = localStorage.getItem(sessionStorageKey(scope))
  if (!raw) return null
  try {
    return JSON.parse(raw) as PracticeSessionSnapshot
  } catch {
    return null
  }
}

export function savePracticeSession(scope: PracticeSessionScope, snapshot: Omit<PracticeSessionSnapshot, 'updatedAt'>) {
  if (!scope.userId) return
  const payload: PracticeSessionSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(sessionStorageKey(scope), JSON.stringify(payload))
}

export function clearPracticeSession(scope: PracticeSessionScope) {
  if (!scope.userId) return
  localStorage.removeItem(sessionStorageKey(scope))
}

export function sessionMatchesQuestions(snapshot: PracticeSessionSnapshot, questionIds: number[]) {
  if (snapshot.questionIds.length !== questionIds.length) return false
  return snapshot.questionIds.every((id, index) => id === questionIds[index])
}

export function findResumeIndex(
  questionIds: number[],
  questionStates: Record<number, PracticeQuestionState>,
  savedIndex: number,
) {
  const firstUnanswered = questionIds.findIndex((id) => !questionStates[id]?.submitted)
  if (firstUnanswered >= 0) return firstUnanswered
  return Math.max(0, Math.min(savedIndex, questionIds.length - 1))
}

export function countAnswered(questionStates: Record<number, PracticeQuestionState>) {
  return Object.values(questionStates).filter((state) => state.submitted).length
}

export function hasSavedProgress(snapshot: PracticeSessionSnapshot | null) {
  if (!snapshot) return false
  return countAnswered(snapshot.questionStates) > 0 || snapshot.index > 0
}
