export type WrongQuestionSummary = {
  id: number
  topic: string
  los: string
  pack?: string
  stem: string
}

export type BookmarkedQuestionSummary = WrongQuestionSummary

export const STUDY_REVIEW_CHANGED = 'study-review-changed'

export function notifyStudyReviewChanged() {
  window.dispatchEvent(new CustomEvent(STUDY_REVIEW_CHANGED))
}

export function buildWrongSessionPath(question: { id: number; topic: string; pack?: string }) {
  const params = new URLSearchParams()
  params.set('pack', question.pack || '2026-practice')
  params.set('topic', question.topic)
  params.set('questionId', String(question.id))
  return `/study/practice/session?${params.toString()}`
}

export function buildBookmarkSessionPath(question: { id: number; topic: string; pack?: string }) {
  return buildWrongSessionPath(question)
}

export function buildWrongGroupSessionPath(pack: string, topic: string) {
  const params = new URLSearchParams()
  params.set('pack', pack)
  params.set('topic', topic)
  params.set('wrong', '1')
  return `/study/practice/session?${params.toString()}`
}

export function buildBookmarkGroupSessionPath(pack: string, topic: string) {
  const params = new URLSearchParams()
  params.set('pack', pack)
  params.set('topic', topic)
  params.set('bookmarks', '1')
  return `/study/practice/session?${params.toString()}`
}
