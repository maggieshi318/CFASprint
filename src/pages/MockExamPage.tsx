import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  answerMockQuestion,
  getCurrentMockSession,
  startMockSession,
  submitMockSession,
  type MockExamBankId,
} from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import MockExamAgreeTerms from '../components/MockExamAgreeTerms'
import MockExamBreakScreen from '../components/MockExamBreakScreen'
import MockExamShell from '../components/MockExamShell'
import MockExamTutorialIntro, { buildCandidateId } from '../components/MockExamTutorialIntro'
import { DEFAULT_MOCK_EXAM_BANK_ID, MOCK_EXAM_BANK_OPTIONS } from '../constants/mockExamBanks'
import {
  MOCK_EXAM_SECTION_SIZE,
  MOCK_EXAM_SECTION_SECONDS,
  MOCK_EXAM_TOTAL_MINUTES,
  MOCK_EXAM_TOTAL_QUESTIONS,
} from '../utils/prometricTimer'
import {
  buildMockExamTutorialUrl,
  clearMockExamSetup,
  readMockExamSetup,
  resolveMockBankFromQuery,
  saveMockExamSetup,
} from '../utils/mockExamSetup'
import type { Answer, MockSession } from '../types'

type MockSetupStep = 'mode' | 'terms' | 'tutorial' | 'exam'

type PendingMockStart = {
  mockBankId: MockExamBankId
}

type MockExamModeFormProps = {
  loading: boolean
  onCancel: () => void
  onConfirm: (mockBankId: MockExamBankId) => void
}

function MockExamModeForm({ loading, onCancel, onConfirm }: MockExamModeFormProps) {
  const [mockBankId, setMockBankId] = useState<MockExamBankId>(DEFAULT_MOCK_EXAM_BANK_ID)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onConfirm(mockBankId)
  }

  return (
    <form className="mock-mode-dialog" onSubmit={handleSubmit}>
      <div className="mock-mode-head">
        <h2 id="mock-mode-title">Select Exam Mode</h2>
        <button type="button" className="mock-mode-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>

      <div className="mock-mode-body">
        <label className="mock-mode-field">
          <span className="mock-mode-label">
            <span className="mock-mode-required">*</span> Exam Method:
          </span>
          <input className="mock-mode-readonly" value="Specify Mock Bank" readOnly aria-readonly="true" />
        </label>

        <label className="mock-mode-field">
          <span className="mock-mode-label">
            <span className="mock-mode-required">*</span> Mock Bank:
          </span>
          <select
            className="mock-mode-bank-select"
            value={mockBankId}
            onChange={(event) => setMockBankId(event.target.value as MockExamBankId)}
            disabled={loading}
          >
            {MOCK_EXAM_BANK_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mock-mode-help">Each mock exam has 180 questions in the same order as the official mock bank.</p>
      </div>

      <div className="mock-mode-actions">
        <button type="button" className="mock-mode-cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="mock-mode-confirm" disabled={loading}>
          {loading ? 'Starting...' : 'OK'}
        </button>
      </div>
    </form>
  )
}

type MockExamModeDialogProps = MockExamModeFormProps & {
  open: boolean
}

function MockExamModeDialog({ open, loading, onCancel, onConfirm }: MockExamModeDialogProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="mock-mode-overlay" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-mode-title"
        onClick={(event) => event.stopPropagation()}
      >
        <MockExamModeForm loading={loading} onCancel={onCancel} onConfirm={onConfirm} />
      </div>
    </div>,
    document.body,
  )
}

type MockExamActiveSessionProps = {
  session: MockSession
  candidateId: string
  token: string
  submitting: boolean
  onSessionUpdate: (session: MockSession) => void
  onSubmit: () => Promise<void>
}

function MockExamActiveSession({
  session,
  candidateId,
  token,
  submitting,
  onSessionUpdate,
  onSubmit,
}: MockExamActiveSessionProps) {
  const [sectionNumber, setSectionNumber] = useState<1 | 2>(1)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [showBreak, setShowBreak] = useState(false)
  const [sectionRemainingSeconds, setSectionRemainingSeconds] = useState(MOCK_EXAM_SECTION_SECONDS)
  const sectionTimeUpRef = useRef(false)

  const section1Questions = useMemo(
    () => session.questions.slice(0, MOCK_EXAM_SECTION_SIZE),
    [session.questions],
  )
  const section2Questions = useMemo(
    () => session.questions.slice(MOCK_EXAM_SECTION_SIZE, MOCK_EXAM_SECTION_SIZE * 2),
    [session.questions],
  )
  const hasSection2 = section2Questions.length > 0
  const sectionQuestions = sectionNumber === 1 ? section1Questions : section2Questions

  useEffect(() => {
    sectionTimeUpRef.current = false
    setSectionRemainingSeconds(MOCK_EXAM_SECTION_SECONDS)
    setQuestionIndex(0)
  }, [sectionNumber])

  useEffect(() => {
    if (showBreak) return undefined
    const timer = window.setInterval(() => {
      setSectionRemainingSeconds((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [showBreak, sectionNumber])

  useEffect(() => {
    if (showBreak || sectionRemainingSeconds > 0 || sectionTimeUpRef.current) return
    sectionTimeUpRef.current = true
    if (sectionNumber === 1 && hasSection2) {
      setShowBreak(true)
      return
    }
    void onSubmit()
  }, [hasSection2, onSubmit, sectionNumber, sectionRemainingSeconds, showBreak])

  async function handleAnswer(questionId: number, selected: Answer) {
    if (session.status !== 'active') return
    const updated = await answerMockQuestion(token, questionId, selected)
    onSessionUpdate(updated)
  }

  async function handleFinishSection() {
    if (sectionNumber === 1 && hasSection2) {
      setShowBreak(true)
      return
    }
    await onSubmit()
  }

  function handleContinueSection2() {
    setShowBreak(false)
    setSectionNumber(2)
  }

  if (showBreak) {
    return (
      <MockExamBreakScreen
        onContinue={handleContinueSection2}
        onFinishTest={onSubmit}
        finishing={submitting}
      />
    )
  }

  return (
    <MockExamShell
      session={session}
      sectionQuestions={sectionQuestions}
      sectionNumber={sectionNumber}
      candidateId={candidateId}
      mockBankLabel={session.mockBankLabel || undefined}
      questionIndex={questionIndex}
      sectionRemainingSeconds={sectionRemainingSeconds}
      finishing={submitting}
      onQuestionIndexChange={setQuestionIndex}
      onAnswer={handleAnswer}
      onFinishSection={handleFinishSection}
    />
  )
}

export default function MockExamPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { token, user } = useAuth()
  const [session, setSession] = useState<MockSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [starting, setStarting] = useState(false)
  const [setupStep, setSetupStep] = useState<MockSetupStep>('mode')
  const [pendingStart, setPendingStart] = useState<PendingMockStart | null>(null)
  const [modePickerDismissed, setModePickerDismissed] = useState(false)
  const [topicBreakdown, setTopicBreakdown] = useState<
    Array<{ topic: string; total: number; correct: number; accuracy: number }>
  >([])
  const [submitting, setSubmitting] = useState(false)
  const candidateId = useMemo(
    () => buildCandidateId(user?.email || user?.id || 'candidate'),
    [user?.email, user?.id],
  )

  useEffect(() => {
    if (!token) return
    setLoadingSession(true)

    const tutorialBankId = resolveMockBankFromQuery(searchParams.get('bank'))
    const wantsTutorial = searchParams.get('step') === 'tutorial'
    const storedSetup = readMockExamSetup()
    const setupBankId = tutorialBankId || storedSetup?.mockBankId || null

    getCurrentMockSession(token)
      .then((current) => {
        if (current?.status === 'active') {
          setSession(current)
          setSetupStep('exam')
          return
        }
        setSession(null)
        if (wantsTutorial && setupBankId) {
          setPendingStart({ mockBankId: setupBankId })
          setSetupStep('tutorial')
          saveMockExamSetup({ mockBankId: setupBankId })
          return
        }
        setSetupStep('mode')
        setPendingStart(null)
        setModePickerDismissed(false)
      })
      .catch(() => {
        setSession(null)
        if (wantsTutorial && setupBankId) {
          setPendingStart({ mockBankId: setupBankId })
          setSetupStep('tutorial')
          saveMockExamSetup({ mockBankId: setupBankId })
          return
        }
        setSetupStep('mode')
        setPendingStart(null)
        setModePickerDismissed(false)
      })
      .finally(() => setLoadingSession(false))
  }, [token, searchParams])

  function handleBankSelected(mockBankId: MockExamBankId) {
    setModePickerDismissed(false)
    setPendingStart({ mockBankId })
    saveMockExamSetup({ mockBankId })
    setSetupStep('terms')
  }

  function handleModeCancel() {
    setModePickerDismissed(true)
  }

  function handleTermsContinue() {
    if (!pendingStart) return
    saveMockExamSetup(pendingStart)
    const tutorialUrl = `${window.location.origin}${buildMockExamTutorialUrl(pendingStart.mockBankId)}`
    const opened = window.open(tutorialUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      setSetupStep('tutorial')
      return
    }
    setPendingStart(null)
    navigate('/study/practice')
  }

  async function handleTutorialStart() {
    if (!token || !pendingStart) return
    setStarting(true)
    try {
      const created = await startMockSession(token, {
        mockBankId: pendingStart.mockBankId,
        questionCount: MOCK_EXAM_TOTAL_QUESTIONS,
        durationMinutes: MOCK_EXAM_TOTAL_MINUTES,
      })
      setSession(created)
      setSetupStep('exam')
      setPendingStart(null)
      clearMockExamSetup()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not start mock exam')
    } finally {
      setStarting(false)
    }
  }

  function handleTutorialExit() {
    setPendingStart(null)
    clearMockExamSetup()
    setSetupStep('mode')
    navigate('/study/practice')
  }

  function handleTermsExit() {
    setPendingStart(null)
    clearMockExamSetup()
    setSetupStep('mode')
    navigate('/study/practice')
  }

  const handleSubmitSession = useCallback(async () => {
    if (!token || !session || session.status !== 'active') return
    setSubmitting(true)
    try {
      const submitted = await submitMockSession(token)
      setSession(submitted)
      setTopicBreakdown(submitted.topicBreakdown || [])
    } finally {
      setSubmitting(false)
    }
  }, [session, token])

  if (loadingSession) {
    return <section className="panel mock-exam-page">Loading mock exam...</section>
  }

  const showModePicker = !loadingSession && setupStep === 'mode' && !session && !modePickerDismissed

  if (setupStep === 'terms' && pendingStart) {
    return (
      <MockExamAgreeTerms
        loading={starting}
        onContinue={handleTermsContinue}
        onExit={handleTermsExit}
      />
    )
  }

  if (setupStep === 'tutorial' && pendingStart) {
    return (
      <MockExamTutorialIntro
        candidateId={candidateId}
        loading={starting}
        onExit={handleTutorialExit}
        onStartTest={handleTutorialStart}
      />
    )
  }

  if (session?.status === 'active' && token) {
    return (
      <MockExamActiveSession
        session={session}
        candidateId={candidateId}
        token={token}
        submitting={submitting}
        onSessionUpdate={setSession}
        onSubmit={handleSubmitSession}
      />
    )
  }

  return (
    <>
      <MockExamModeDialog
        open={showModePicker}
        loading={starting}
        onCancel={handleModeCancel}
        onConfirm={handleBankSelected}
      />

      <section className="panel mock-exam-page">
        {setupStep === 'mode' && !session ? (
          <div className="mock-exam-placeholder">
            <h2>Full Mock Exam</h2>
            <p>Choose an exam mode to begin your timed mock session.</p>
            <button type="button" onClick={() => setModePickerDismissed(false)}>
              Select Exam Mode
            </button>
          </div>
        ) : !session ? (
          <div className="mock-exam-placeholder">
            <h2>Full Mock Exam</h2>
            <p>Unable to load mock exam session.</p>
          </div>
        ) : session?.status === 'submitted' ? (
          <>
            <h2>Mock Exam Results</h2>
            {session.mockBankLabel ? (
              <p className="meta">Mock bank: {session.mockBankLabel}</p>
            ) : null}
            <p className="meta">
              Score: {session.score}/{session.total}
            </p>
            <div className="result ok">
              Final score: {session.score}/{session.total}
            </div>
            {topicBreakdown.length > 0 && (
              <div className="topic-list">
                {topicBreakdown.map((item) => (
                  <div key={item.topic} className="topic-row">
                    <div>
                      <strong>{item.topic}</strong>
                      <p>
                        {item.correct}/{item.total} correct
                      </p>
                    </div>
                    <span>{item.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
            <div className="actions">
              <button type="button" onClick={() => navigate('/study/practice')}>
                Back to Practice
              </button>
            </div>
          </>
        ) : (
          <div className="mock-exam-placeholder">
            <h2>Full Mock Exam</h2>
            <p>Unable to load mock exam session.</p>
          </div>
        )}
      </section>
    </>
  )
}
