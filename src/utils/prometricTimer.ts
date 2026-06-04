export function formatPrometricTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Total mock exam length (two sections). */
export const MOCK_EXAM_TOTAL_QUESTIONS = 180
/** Questions shown per section/page. */
export const MOCK_EXAM_SECTION_SIZE = 90
/** Minutes per section — matches lanrencfa realExam. */
export const MOCK_EXAM_SECTION_MINUTES = 135
export const MOCK_EXAM_SECTION_SECONDS = MOCK_EXAM_SECTION_MINUTES * 60
/** Optional break between sections — matches lanrencfa realExam. */
export const MOCK_EXAM_BREAK_MINUTES = 30
export const MOCK_EXAM_BREAK_SECONDS = MOCK_EXAM_BREAK_MINUTES * 60
export const MOCK_EXAM_TOTAL_MINUTES = MOCK_EXAM_SECTION_MINUTES * 2

/** @deprecated Use MOCK_EXAM_TOTAL_QUESTIONS */
export const MOCK_EXAM_QUESTION_COUNT = MOCK_EXAM_TOTAL_QUESTIONS
