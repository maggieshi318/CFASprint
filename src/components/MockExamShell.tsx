import { useMemo, useState } from 'react'
import type { Answer, MockSession, Question } from '../types'
import { decodeHtmlEntities, formatQuestionStem } from '../utils/htmlText'
import { formatPrometricTimer } from '../utils/prometricTimer'

type MockExamShellProps = {
  session: MockSession
  sectionQuestions: Question[]
  sectionNumber: number
  candidateId: string
  mockBankLabel?: string
  testName?: string
  questionIndex: number
  sectionRemainingSeconds: number
  finishing?: boolean
  onQuestionIndexChange: (index: number) => void
  onAnswer: (questionId: number, selected: Answer) => void | Promise<void>
  onFinishSection: () => void | Promise<void>
}

function getQuestionAnswer(session: MockSession, questionId: number): Answer | undefined {
  return session.answers[String(questionId)]
}

export default function MockExamShell({
  session,
  sectionQuestions,
  sectionNumber,
  candidateId,
  mockBankLabel,
  testName = 'CFA Level I',
  questionIndex,
  sectionRemainingSeconds,
  finishing = false,
  onQuestionIndexChange,
  onAnswer,
  onFinishSection,
}: MockExamShellProps) {
  const [flaggedIds, setFlaggedIds] = useState<number[]>([])
  const [strikeouts, setStrikeouts] = useState<Record<number, Answer[]>>({})
  const [finishPromptOpen, setFinishPromptOpen] = useState(false)

  const currentQuestion = sectionQuestions[questionIndex]
  const sectionTotal = sectionQuestions.length
  const answeredInSection = sectionQuestions.filter((question) =>
    Boolean(getQuestionAnswer(session, question.id)),
  ).length
  const progressPct = sectionTotal ? Math.round((answeredInSection / sectionTotal) * 100) : 0

  const currentStrikeouts = useMemo(() => {
    if (!currentQuestion) return [] as Answer[]
    return strikeouts[currentQuestion.id] ?? []
  }, [currentQuestion, strikeouts])

  function toggleFlag(questionId: number) {
    setFlaggedIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    )
  }

  function toggleStrikeout(questionId: number, option: Answer) {
    setStrikeouts((prev) => {
      const existing = prev[questionId] ?? []
      const next = existing.includes(option)
        ? existing.filter((key) => key !== option)
        : [...existing, option]
      return { ...prev, [questionId]: next }
    })
  }

  function handleSelect(option: Answer) {
    if (!currentQuestion || session.status !== 'active') return
    void onAnswer(currentQuestion.id, option)
  }

  function getFinishWarning() {
    const unattempted = sectionQuestions.some((question) => !getQuestionAnswer(session, question.id))
    const flaggedInSection = sectionQuestions.some((question) => flaggedIds.includes(question.id))
    if (unattempted && flaggedInSection) {
      return (
        'You have not attempted all of the questions in this test, and some have been flagged. Are you sure you would like to finish the test?'
      )
    } else if (unattempted) {
      return 'You have not attempted all of the questions in this test. Are you sure you would like to finish the test?'
    } else if (flaggedInSection) {
      return 'Some of the questions in this test have been flagged. Are you sure you would like to finish the test?'
    }
    return 'Are you sure you would like to finish the test?'
  }

  async function confirmFinish() {
    setFinishPromptOpen(false)
    await onFinishSection()
  }

  if (!currentQuestion) {
    return (
      <div className="mock-exam-shell">
        <div className="mock-exam-empty">No questions available in this section.</div>
      </div>
    )
  }

  const selectedAnswer = getQuestionAnswer(session, currentQuestion.id)
  const isFlagged = flaggedIds.includes(currentQuestion.id)
  const finishWarning = getFinishWarning()

  return (
    <div className="mock-exam-shell">
      <header className="mock-tutorial-topbar mock-exam-topbar">
        <div className="mock-tutorial-topbar-left mock-exam-topbar-left">
          <span>Question: {questionIndex + 1}</span>
          <span>Section: {sectionNumber}</span>
        </div>
        <div className="mock-tutorial-topbar-center mock-exam-topbar-center">
          <span className="mock-exam-clock" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Z" />
              <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67Z" />
            </svg>
          </span>
          <span className="mock-tutorial-time-label">Section Time Remaining</span>
          <strong className="mock-exam-time-value">{formatPrometricTimer(sectionRemainingSeconds)}</strong>
        </div>
        <div className="mock-tutorial-topbar-right mock-exam-topbar-right">
          <div className="mock-tutorial-progress-wrap mock-exam-progress-wrap">
            <span>Progress {progressPct}%</span>
            <div className="mock-tutorial-progress-track mock-exam-progress-track">
              <div className="mock-tutorial-progress-fill mock-exam-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <button
            type="button"
            className="mock-tutorial-finish mock-exam-finish-btn"
            onClick={() => setFinishPromptOpen(true)}
            disabled={session.status !== 'active' || finishing}
          >
            Finish Test
          </button>
        </div>
      </header>

      <div className="mock-tutorial-banner mock-exam-banner">
        <span>
          Test: {testName}
          {mockBankLabel ? ` — ${mockBankLabel}` : ''}
        </span>
        <span>Candidate: {candidateId}</span>
      </div>

      <div className="mock-tutorial-layout mock-exam-layout">
        <aside className="mock-tutorial-sidebar mock-exam-sidebar" aria-label="Exam questions">
          {sectionQuestions.map((question, index) => {
            const active = index === questionIndex
            const attempted = Boolean(getQuestionAnswer(session, question.id))
            const flagged = flaggedIds.includes(question.id)
            return (
              <button
                key={question.id}
                type="button"
                className={[
                  'mock-tutorial-page-btn',
                  active ? 'active' : '',
                  attempted ? 'attempted' : '',
                  flagged ? 'flagged' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onQuestionIndexChange(index)}
                disabled={session.status !== 'active' || finishing}
              >
                {active ? <span className="mock-tutorial-page-arrow" aria-hidden="true" /> : null}
                {index + 1}
                {flagged ? <span className="mock-exam-sidebar-flag">⚑</span> : null}
              </button>
            )
          })}
        </aside>

        <main className="mock-tutorial-content mock-exam-content">
          <div className="mock-exam-stem-box">{formatQuestionStem(currentQuestion.stem)}</div>
          <div className="mock-tutorial-mcq-options mock-exam-mcq-options" role="radiogroup" aria-label="Answer options">
            {(Object.keys(currentQuestion.options) as Answer[]).map((optionKey) => {
              const selected = selectedAnswer === optionKey
              const struckOut = currentStrikeouts.includes(optionKey)
              return (
                <div key={optionKey} className="mock-tutorial-mcq-row">
                  <span className="mock-tutorial-mcq-label">{optionKey}</span>
                  <button
                    type="button"
                    className={[
                      'mock-tutorial-mcq-option',
                      selected ? 'selected' : '',
                      struckOut && !selected ? 'struck-out' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="radio"
                    aria-checked={selected}
                    disabled={session.status !== 'active' || finishing}
                    onClick={() => handleSelect(optionKey)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      toggleStrikeout(currentQuestion.id, optionKey)
                    }}
                  >
                    {decodeHtmlEntities(currentQuestion.options[optionKey])}
                  </button>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      <footer className="mock-exam-footer">
        <button
          type="button"
          className={`mock-exam-flag-btn ${isFlagged ? 'active' : ''}`}
          onClick={() => toggleFlag(currentQuestion.id)}
          disabled={session.status !== 'active' || finishing}
        >
          ⚑ Flag
        </button>
        <div className="mock-tutorial-footer-actions">
          <button
            type="button"
            className="mock-tutorial-nav-btn"
            onClick={() => onQuestionIndexChange(Math.max(0, questionIndex - 1))}
            disabled={questionIndex <= 0 || finishing}
          >
            &lt; Back
          </button>
          <button
            type="button"
            className="mock-tutorial-nav-btn primary"
            onClick={() => onQuestionIndexChange(Math.min(sectionTotal - 1, questionIndex + 1))}
            disabled={questionIndex >= sectionTotal - 1 || finishing}
          >
          Next &gt;
          </button>
        </div>
      </footer>

      {finishPromptOpen ? (
        <div className="mock-exam-confirm-backdrop" role="presentation">
          <div
            className="mock-exam-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mock-finish-title"
          >
            <h2 id="mock-finish-title">Finish Test?</h2>
            <p>{finishWarning}</p>
            <p>If you select Finish, your answers will be submitted and you will not be able to return to the exam.</p>
            <div className="mock-exam-confirm-actions">
              <button
                type="button"
                className="mock-exam-confirm-secondary"
                onClick={() => setFinishPromptOpen(false)}
                disabled={finishing}
              >
                Continue Exam
              </button>
              <button
                type="button"
                className="mock-exam-confirm-primary"
                onClick={() => void confirmFinish()}
                disabled={finishing}
              >
                {finishing ? 'Finishing...' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
