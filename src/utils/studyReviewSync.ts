import type { Answer, Question } from '../types'
import { submitQuestionResult, fetchReview } from '../api/mockApi'
import type { PracticeQuestionState } from './practiceSession'
import { notifyStudyReviewChanged } from './studyReview'

export function extractQuestionPack(question: Question) {
  const rawTags: unknown = question.tags
  const tags = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string' && rawTags.startsWith('[')
      ? (JSON.parse(rawTags) as string[])
      : []
  return tags.find((tag) => tag.startsWith('pack:'))?.slice(5) || '2026-practice'
}

export function buildWrongSummary(question: Question) {
  return {
    id: question.id,
    topic: question.topic,
    los: question.los,
    pack: extractQuestionPack(question),
    stem: String(question.stem || '')
      .replace(/<!--STEM_IMAGES:\[[\s\S]*?\]-->/g, '')
      .slice(0, 160),
  }
}

export async function syncSessionAnswersToServer(
  token: string,
  questions: Question[],
  states: Record<number, PracticeQuestionState>,
) {
  for (const question of questions) {
    const state = states[question.id]
    if (!state?.submitted || !state.selected) continue
    try {
      await submitQuestionResult(token, question.id, state.selected as Answer)
    } catch {
      // Continue syncing remaining answers.
    }
  }
}

export async function refreshStudyReview(token: string, setFromServer: (payload: Awaited<ReturnType<typeof fetchReview>>) => void) {
  const review = await fetchReview(token)
  setFromServer(review)
  notifyStudyReviewChanged()
  return review
}
