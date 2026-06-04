import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchQuestions, submitQuestionResult, toggleFavoriteRequest } from '../api/mockApi'
import { topicDisplayCount, topicDisplayName } from '../constants/questionBankDisplay'
import { useStudy } from '../store/StudyContext'
import type { Answer, Question } from '../types'
import { formatLanrenAnalysisLines } from '../utils/optionExplanations'
import { parseQuestionStem } from '../utils/htmlText'
import { readPracticeNote, savePracticeNote } from '../utils/practiceNotes'
import {
  clearPracticeSession,
  countAnswered,
  findResumeIndex,
  hasSavedProgress,
  readPracticeSession,
  savePracticeSession,
  sessionMatchesQuestions,
  type PracticeQuestionState,
  type PracticeSessionSnapshot,
} from '../utils/practiceSession'
import { notifyStudyReviewChanged } from '../utils/studyReview'
import { buildWrongSummary, refreshStudyReview, syncSessionAnswersToServer } from '../utils/studyReviewSync'
import { useAuth } from '../auth/AuthContext'
import UpgradeButton from '../components/UpgradeButton'

type AnswerMode = 'instant' | 'after_submit'

type QuestionState = PracticeQuestionState

const PACK_TITLES: Record<string, string> = {
  '2026-practice': '2026 CFA Level I Practice Pack',
  '2026-mock': '2026 CFA Level I Mock',
  '2025-practice': '2025 CFA Level I Practice Pack',
  '2025-mock': '2025 CFA Level I Mock',
  '2024-practice': '2024 CFA Level I Practice Pack',
  '2024-mock': '2024 CFA Level I Mock',
  'past-mocks': 'Past Mock Exams',
}

const PACK_PP_LABELS: Record<string, string> = {
  '2026-practice': '2026PP',
  '2026-mock': '2026MOCK',
  '2025-practice': '2025PP',
  '2025-mock': '2025MOCK',
  '2024-practice': '2024PP',
  '2024-mock': '2024MOCK',
  'past-mocks': 'PAST',
}

function parseQuestionTags(tags: string[] | string): string[] {
  if (Array.isArray(tags)) return tags.map(String)
  if (typeof tags === 'string') {
    if (tags.startsWith('[')) {
      try {
        return (JSON.parse(tags) as string[]).map(String)
      } catch {
        return []
      }
    }
    return tags
      .split('|')
      .map((tag: string) => tag.trim())
      .filter(Boolean)
  }
  return []
}

function moduleLabel(question: Question) {
  const tags = parseQuestionTags(question.tags)
  const packId = tags.find((tag) => tag.startsWith('pack:'))?.slice(5) || '2026-practice'
  const ppLabel = PACK_PP_LABELS[packId] || 'CFA'
  let los = question.los.replace(new RegExp(`^[（(]${ppLabel}[）)]\\s*`, 'i'), '').trim() || question.los
  if (!los || los === ppLabel || /^20\d{2}PP$/i.test(los)) {
    los = topicDisplayName(question.topic)
  }
  return `(${ppLabel}) ${los}`
}

export default function PracticePage() {
  const [searchParams] = useSearchParams()
  const topic = searchParams.get('topic') || ''
  const packParam = searchParams.get('pack') || ''
  const categoryParam = searchParams.get('category') || ''
  const sessionParam = searchParams.get('session') || ''
  const questionIdParam = searchParams.get('questionId') || ''
  const bookmarksOnly = searchParams.get('bookmarks') === '1'
  const wrongOnly = searchParams.get('wrong') === '1'
  const [loadedQuestions, setLoadedQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [answerMode, setAnswerMode] = useState<AnswerMode>(() => {
    const saved = localStorage.getItem('practice-answer-mode')
    return saved === 'after_submit' ? 'after_submit' : 'instant'
  })
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({})
  const [draftNote, setDraftNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [noteSavedMessage, setNoteSavedMessage] = useState('')
  const [resumePrompt, setResumePrompt] = useState<PracticeSessionSnapshot | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [upgradePrompt, setUpgradePrompt] = useState('')
  const { token, user } = useAuth()
  const {
    favorites,
    wrong,
    markDone,
    removeWrong,
    setFavorites,
    recordWrongQuestion,
    recordFavoriteQuestion,
    removeFavorite,
    setFromServer,
  } = useStudy()

  const effectivePack = packParam || (topic || categoryParam ? '2026-practice' : '')
  const packTitle = PACK_TITLES[effectivePack] || effectivePack

  const questions = useMemo(() => {
    if (wrongOnly) {
      const wrongSet = new Set(wrong)
      return loadedQuestions.filter((question) => wrongSet.has(question.id))
    }
    if (bookmarksOnly) {
      const favoriteSet = new Set(favorites)
      return loadedQuestions.filter((question) => favoriteSet.has(question.id))
    }
    return loadedQuestions
  }, [loadedQuestions, bookmarksOnly, wrongOnly, favorites, wrong])

  const sessionTotal = questions.length > 0 ? questions.length : topicDisplayCount(topic, 0)
  const topicLabel =
    sessionParam ||
    (wrongOnly && topic
      ? `Wrong · ${topicDisplayName(topic)}`
      : bookmarksOnly && topic
        ? `Bookmarked · ${topicDisplayName(topic)}`
        : topic
          ? topicDisplayName(topic)
          : categoryParam
            ? 'Mock Session'
            : 'Practice Session')
  const noteChanged = draftNote !== savedNote

  const sessionScope = useMemo(
    () => ({
      userId: user?.id || '',
      pack: effectivePack,
      topic,
      category: categoryParam,
      session: wrongOnly
        ? 'Wrong Questions'
        : bookmarksOnly
          ? 'Bookmarked Questions'
          : sessionParam || topicLabel,
    }),
    [user?.id, effectivePack, topic, categoryParam, sessionParam, topicLabel, bookmarksOnly, wrongOnly],
  )

  function applySessionSnapshot(snapshot: PracticeSessionSnapshot, resumeIndex: number) {
    setQuestionStates(snapshot.questionStates)
    setIndex(resumeIndex)
    setSessionReady(true)
    setResumePrompt(null)
  }

  function startFreshSession() {
    clearPracticeSession(sessionScope)
    setQuestionStates({})
    setIndex(0)
    setSessionReady(true)
    setResumePrompt(null)
  }

  function handleContinueSession() {
    if (!resumePrompt || !questions.length) return
    const resumeIndex = findResumeIndex(
      questions.map((question) => question.id),
      resumePrompt.questionStates,
      resumePrompt.index,
    )
    applySessionSnapshot(resumePrompt, resumeIndex)
    if (token) {
      void syncSessionAnswersToServer(token, questions, resumePrompt.questionStates).then(() =>
        refreshStudyReview(token, setFromServer),
      )
    }
  }

  function handleRestartSession() {
    startFreshSession()
  }

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setLoading(true)
    setSessionReady(false)
    setResumePrompt(null)
    fetchQuestions(
      token,
      {
        topic: topic || undefined,
        pack: effectivePack || undefined,
        category: categoryParam || undefined,
      },
      controller.signal,
    )
      .then((rows) => {
        setLoadedQuestions(rows)
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setLoadedQuestions([])
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [token, topic, effectivePack, categoryParam])

  useEffect(() => {
    if (!questions.length || !user?.id) return

    const questionIds = questions.map((question) => question.id)
    const saved = readPracticeSession(sessionScope)

    if (questionIdParam) {
      setQuestionStates(saved && sessionMatchesQuestions(saved, questionIds) ? saved.questionStates : {})
      setIndex(0)
      setResumePrompt(null)
      setSessionReady(true)
      return
    }

    if (saved && sessionMatchesQuestions(saved, questionIds) && hasSavedProgress(saved)) {
      setQuestionStates({})
      setIndex(0)
      setResumePrompt(saved)
      setSessionReady(false)
      return
    }

    clearPracticeSession(sessionScope)
    setQuestionStates({})
    setIndex(0)
    setResumePrompt(null)
    setSessionReady(true)
  }, [questions, user?.id, questionIdParam, sessionScope])

  useEffect(() => {
    if (!questions.length || !questionIdParam || !sessionReady) return
    const targetIndex = questions.findIndex((question) => String(question.id) === questionIdParam)
    if (targetIndex >= 0) setIndex(targetIndex)
  }, [questions, questionIdParam, sessionReady])

  useEffect(() => {
    if (!sessionReady || !user?.id || !questions.length || resumePrompt) return
    savePracticeSession(sessionScope, {
      pack: sessionScope.pack,
      topic: sessionScope.topic,
      category: sessionScope.category,
      session: sessionScope.session,
      questionIds: questions.map((question) => question.id),
      index,
      questionStates,
    })
  }, [sessionReady, user?.id, questions, index, questionStates, sessionScope, resumePrompt])

  const current = questions[index]
  const currentState = current ? questionStates[current.id] : undefined
  const selected = currentState?.selected ?? null
  const submitted = currentState?.submitted ?? false

  useEffect(() => {
    if (!user?.id || !current) return
    const stored = readPracticeNote(user.id, current.id)
    setSavedNote(stored)
    setDraftNote(stored)
    setNoteSavedMessage('')
  }, [user?.id, current?.id])

  useEffect(() => {
    localStorage.setItem('practice-answer-mode', answerMode)
  }, [answerMode])

  const stats = useMemo(() => {
    let correct = 0
    let wrong = 0
    let answered = 0
    for (const question of questions) {
      const state = questionStates[question.id]
      if (!state?.submitted) continue
      answered += 1
      if (state.correct) correct += 1
      else wrong += 1
    }
    const unanswered = Math.max(sessionTotal - answered, 0)
    return { correct, wrong, answered, unanswered }
  }, [questions, questionStates, sessionTotal])

  async function persistAnswer(question: Question, choice: Answer) {
    if (!token) return
    try {
      const result = await submitQuestionResult(token, question.id, choice)
      setQuestionStates((prev) => ({
        ...prev,
        [question.id]: {
          selected: choice,
          submitted: true,
          correct: result.correct,
          explanation: result.explanation,
          correctAnswer: result.correctAnswer,
        },
      }))
      markDone(question.id)
      if (!result.correct) {
        recordWrongQuestion(buildWrongSummary(question))
      } else {
        removeWrong(question.id)
      }
      await refreshStudyReview(token, setFromServer)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save answer'
      if (/upgrade|limit|free/i.test(message)) {
        setUpgradePrompt(message)
        return
      }
      window.alert(message)
    }
  }

  async function handleSelect(choice: Answer) {
    if (!current || submitted) return
    if (answerMode === 'instant') {
      await persistAnswer(current, choice)
      return
    }
    setQuestionStates((prev) => ({
      ...prev,
      [current.id]: {
        ...(prev[current.id] || { submitted: false, correct: null }),
        selected: choice,
        submitted: false,
        correct: null,
      },
    }))
  }

  async function handleSubmitAnswer() {
    if (!current || !selected || submitted) return
    await persistAnswer(current, selected)
  }

  async function handleFavoriteToggle() {
    if (!token || !current) return
    const result = await toggleFavoriteRequest(token, current.id)
    setFavorites(result.favorites)
    if (result.favorites.includes(current.id)) {
      recordFavoriteQuestion(buildWrongSummary(current))
    } else {
      removeFavorite(current.id)
    }
    notifyStudyReviewChanged()
  }

  function goToQuestion(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= questions.length) return
    setIndex(nextIndex)
  }

  function handleSaveNote() {
    if (!user?.id || !current || !noteChanged) return
    const trimmed = draftNote.slice(0, 1000)
    savePracticeNote(user.id, {
      questionId: current.id,
      text: trimmed,
      pack: effectivePack || undefined,
      topic: current.topic,
      session: sessionParam || topicLabel || undefined,
    })
    setSavedNote(trimmed)
    setDraftNote(trimmed)
    setNoteSavedMessage('Saved to My Notes')
  }

  function handleCancelNote() {
    setDraftNote(savedNote)
    setNoteSavedMessage('')
  }

  const stemParts = useMemo(
    () => (current ? parseQuestionStem(current.stem) : { text: '', images: [] }),
    [current?.stem],
  )

  const analysisLines = useMemo(() => {
    if (!current || !submitted) return []
    const explanation = currentState?.explanation || current.explanation
    const correctAnswer = (currentState?.correctAnswer || current.answer) as Answer
    return formatLanrenAnalysisLines(explanation, correctAnswer)
  }, [current, currentState, submitted])

  function optionClass(key: Answer) {
    if (!current || !submitted) {
      return selected === key ? 'is-selected' : ''
    }
    const correctAnswer = currentState?.correctAnswer || current.answer
    if (key === correctAnswer) return 'is-correct'
    if (selected === key && key !== correctAnswer) return 'is-wrong'
    return ''
  }

  if (loading) {
    return <section className="practice-loading">Loading questions...</section>
  }

  if (resumePrompt && questions.length > 0) {
    const answeredCount = countAnswered(resumePrompt.questionStates)
    const resumeIndex = findResumeIndex(
      questions.map((question) => question.id),
      resumePrompt.questionStates,
      resumePrompt.index,
    )

    return (
      <section className="practice-resume-panel">
        <Link to="/study/practice" className="study-back-link">
          ← Question Bank
        </Link>
        <h2>{topicLabel}</h2>
        <p className="helper-text">
          Saved progress found: {answeredCount} of {questions.length} questions answered.
        </p>
        <div className="practice-resume-actions">
          <button type="button" className="practice-next-btn" onClick={handleContinueSession}>
            Continue from question {resumeIndex + 1}
          </button>
          <button type="button" className="practice-prev-btn" onClick={handleRestartSession}>
            Start from the beginning
          </button>
        </div>
      </section>
    )
  }

  if (!sessionReady || !current) {
    return (
      <section className="practice-empty">
        <Link to="/study/practice" className="study-back-link">
          ← Question Bank
        </Link>
        <h2>{topicLabel || 'Practice Session'}</h2>
        <p>No questions available for this topic yet.</p>
      </section>
    )
  }

  return (
    <div className="practice-session">
      <div className="practice-main">
        {upgradePrompt ? (
          <section className="practice-upgrade-banner">
            <div>
              <strong>Unlock unlimited practice</strong>
              <p>{upgradePrompt}</p>
            </div>
            <UpgradeButton className="practice-upgrade-btn" planId="trial_monthly" source="/study/practice/session">
              Start AED 9.9 trial
            </UpgradeButton>
          </section>
        ) : null}
        <section className="practice-card">
          <header className="practice-q-head">
            <div>
              {packTitle ? <p className="practice-pack-label">{packTitle}</p> : null}
              <p className="practice-q-count">
                Question {index + 1} of {sessionTotal}
              </p>
              <p className="practice-q-module">{moduleLabel(current)}</p>
            </div>
            <div className="practice-q-resources">
              <span>Knowledge review:</span>
              <button type="button" className="practice-resource-btn" disabled title="Coming soon">
                📄 Handout
              </button>
              <button type="button" className="practice-resource-btn" disabled title="Coming soon">
                ▶ Video
              </button>
            </div>
          </header>

          <div className="practice-q-body">
            <p className="practice-stem">{stemParts.text}</p>
            {stemParts.images.map((src) => (
              <img key={src} src={src} alt="Question figure" className="practice-stem-img" loading="lazy" />
            ))}
            <div className="practice-options">
              {(Object.keys(current.options) as Answer[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`practice-option ${optionClass(key)}`}
                  onClick={() => handleSelect(key)}
                  disabled={submitted && answerMode === 'instant'}
                >
                  <span className="practice-option-key">{key}.</span>
                  <span>{current.options[key]}</span>
                </button>
              ))}
            </div>

            {answerMode === 'after_submit' && !submitted ? (
              <div className="practice-submit-row">
                <button type="button" className="practice-next-btn" disabled={!selected} onClick={handleSubmitAnswer}>
                  Submit answer
                </button>
              </div>
            ) : null}

            {submitted && analysisLines.length > 0 ? (
              <div className="practice-analysis-panel">
                <div className="practice-analysis-answer-bar">
                  <span>
                    Correct answer:{' '}
                    <strong className="practice-analysis-correct-letter">
                      {currentState?.correctAnswer || current.answer}
                    </strong>
                  </span>
                  <button type="button" className="practice-analysis-feedback" disabled title="Coming soon">
                    Report issue
                  </button>
                </div>
                <h4 className="practice-analysis-title">Answer Explanation</h4>
                <div className="practice-analysis-body">
                  {analysisLines.map((line, lineIndex) => (
                    <p key={`${lineIndex}-${line.slice(0, 1)}`} className="practice-analysis-line">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <footer className="practice-q-foot">
            <div className="practice-nav">
              <button type="button" className="practice-prev-btn" disabled={index <= 0} onClick={() => goToQuestion(index - 1)}>
                Previous
              </button>
              <button
                type="button"
                className="practice-next-btn"
                disabled={index >= questions.length - 1}
                onClick={() => goToQuestion(index + 1)}
              >
                Next
              </button>
            </div>
            <button
              type="button"
              className={`practice-fav-btn ${favorites.includes(current.id) ? 'active' : ''}`}
              onClick={handleFavoriteToggle}
            >
              ★ Favorite
            </button>
          </footer>
        </section>

        <section className="practice-notes-card">
          <h3>My Notes</h3>
          <textarea
            value={draftNote}
            onChange={(e) => {
              setDraftNote(e.target.value.slice(0, 1000))
              setNoteSavedMessage('')
            }}
            placeholder="Take notes — capture your thoughts anytime while practicing."
            rows={4}
          />
          <div className="practice-notes-meta">
            <span>
              {noteSavedMessage || `${draftNote.length} / 1000`}
            </span>
            <div className="practice-notes-actions">
              <button
                type="button"
                className="practice-note-save"
                onClick={handleSaveNote}
                disabled={!noteChanged}
              >
                Save
              </button>
              <button
                type="button"
                className="practice-note-cancel"
                onClick={handleCancelNote}
                disabled={!noteChanged}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      </div>

      <aside className="practice-sidebar">
        <section className="practice-side-card">
          <h3>Settings</h3>
          <p className="practice-side-label">Answering mode</p>
          <label className="practice-radio">
            <input
              type="radio"
              name="answer-mode"
              checked={answerMode === 'instant'}
              onChange={() => setAnswerMode('instant')}
            />
            Show answer instantly
          </label>
          <label className="practice-radio">
            <input
              type="radio"
              name="answer-mode"
              checked={answerMode === 'after_submit'}
              onChange={() => setAnswerMode('after_submit')}
            />
            Show answer after submit
          </label>
        </section>

        <section className="practice-side-card">
          <h3>Progress</h3>
          <div className="practice-grid">
            {Array.from({ length: sessionTotal }, (_, slot) => {
              const slotIndex = slot
              const question = questions[slotIndex]
              const state = question ? questionStates[question.id] : undefined
              let cellClass = 'is-empty'
              if (question) {
                if (state?.submitted && state.correct) cellClass = 'is-correct'
                else if (state?.submitted && state.correct === false) cellClass = 'is-wrong'
                else if (slotIndex === index) cellClass = 'is-current'
                else cellClass = 'is-pending'
              }
              return (
                <button
                  key={slot + 1}
                  type="button"
                  className={`practice-grid-cell ${cellClass}`}
                  disabled={!question}
                  onClick={() => question && goToQuestion(slotIndex)}
                  title={question ? `Question ${slot + 1}` : 'Not available yet'}
                >
                  {slot + 1}
                </button>
              )
            })}
          </div>
          <ul className="practice-legend">
            <li>
              <span className="dot correct" /> Correct: {stats.correct}
            </li>
            <li>
              <span className="dot wrong" /> Incorrect: {stats.wrong}
            </li>
            <li>
              <span className="dot current" /> Current: {index + 1}
            </li>
            <li>
              <span className="dot pending" /> Unanswered: {stats.unanswered}
            </li>
          </ul>
        </section>

        {!user?.isPremium ? (
          <section className="practice-side-card trial-upgrade-card">
            <h3>1-month trial</h3>
            <p>
              AED 9.9 unlocks every question and mock exam for 30 days. Continue with AED 99 Full Access after the trial.
            </p>
            <UpgradeButton className="practice-upgrade-btn full-width" planId="trial_monthly" source="/study/practice/session">
              Start trial
            </UpgradeButton>
          </section>
        ) : null}

        <Link to="/study/practice" className="practice-back-link">
          ← Back to Question Bank
        </Link>
      </aside>
    </div>
  )
}
