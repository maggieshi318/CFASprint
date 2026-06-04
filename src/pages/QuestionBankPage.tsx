import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchQuestionBank, type QuestionBankMeta, type QuestionBankPack } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import UpgradeButton from '../components/UpgradeButton'
import { STUDY_REVIEW_CHANGED } from '../utils/studyReview'

/** Sub-topics under 2026 Practice Pack — matches lanrencfa screenshot */
const PRACTICE_2026_TOPICS = [
  { topic: 'Quantitative Methods', label: 'Quantitative Methods', count: 79 },
  { topic: 'Economics', label: 'Economics', count: 75 },
  { topic: 'FSA', label: 'Financial Statement Analysis', count: 126 },
  { topic: 'Corporate Issuers', label: 'Corporate Issuers', count: 75 },
  { topic: 'Equity Investments', label: 'Equity Investments', count: 140 },
  { topic: 'Fixed Income', label: 'Fixed Income', count: 112 },
  { topic: 'Derivatives', label: 'Derivatives', count: 75 },
  { topic: 'Alternative Investments', label: 'Alternative Investments', count: 70 },
  { topic: 'Portfolio Management', label: 'Portfolio Management', count: 100 },
  { topic: 'Ethics', label: 'Ethical and Professional Standards', count: 148 },
]

function buildFallbackMeta(isPremium: boolean): QuestionBankMeta {
  return {
    bankMode: isPremium ? 'full' : 'free',
    isPremium,
    totalAccessible: isPremium ? 42 : 0,
    fullBankSize: 42,
    packs: [
      {
        id: '2026-practice',
        kind: 'practice',
        title: '2026 CFA Level I Practice Pack 1000 Questions',
        accessible: true,
        locked: false,
        defaultExpanded: true,
        questionCount: 1000,
        completed: 0,
        accuracy: 0,
        topics: PRACTICE_2026_TOPICS.map((item) => ({
          ...item,
          completed: 0,
          accuracy: 0,
          hasProgress: false,
          accessible: true,
        })),
        sessionQuery: { pack: '2026-practice' },
      },
      {
        id: '2026-mock',
        kind: 'mock',
        title: '2026 CFA Level I Mock 1080 Questions',
        accessible: isPremium,
        locked: !isPremium,
        defaultExpanded: false,
        questionCount: 1080,
        completed: 0,
        accuracy: 0,
        topics: [],
        actionPath: '/study/mock-exam',
      },
      {
        id: '2025-practice',
        kind: 'practice',
        title: '2025 CFA Level I Practice Pack 1000 Questions',
        accessible: isPremium,
        locked: !isPremium,
        defaultExpanded: false,
        questionCount: 1000,
        completed: 0,
        accuracy: 0,
        topics: [],
        sessionQuery: { pack: '2025-practice' },
      },
      {
        id: '2025-mock',
        kind: 'mock',
        title: '2025 CFA Level I Mock 1440 Questions',
        accessible: isPremium,
        locked: !isPremium,
        defaultExpanded: false,
        questionCount: 1440,
        completed: 0,
        accuracy: 0,
        topics: [],
        actionPath: '/study/mock-exam',
      },
      {
        id: '2024-practice',
        kind: 'practice',
        title: '2024 CFA Level I Practice Pack 1000 Questions',
        accessible: isPremium,
        locked: !isPremium,
        defaultExpanded: false,
        questionCount: 1000,
        completed: 0,
        accuracy: 0,
        topics: [],
        sessionQuery: { pack: '2024-practice' },
      },
      {
        id: '2024-mock',
        kind: 'mock',
        title: '2024 CFA Level I Mock 900 Questions',
        accessible: isPremium,
        locked: !isPremium,
        defaultExpanded: false,
        questionCount: 900,
        completed: 0,
        accuracy: 0,
        topics: [],
        actionPath: '/study/mock-exam',
      },
      {
        id: 'past-mocks',
        kind: 'past-mock',
        title: 'Past Mock Exams',
        accessible: isPremium,
        locked: !isPremium,
        defaultExpanded: false,
        questionCount: 0,
        completed: 0,
        accuracy: 0,
        topics: [],
        actionPath: '/study/mock-exam',
      },
    ],
    sidebar: { wrongCount: 0, favoriteCount: 0 },
  }
}

function buildSessionPath(pack: QuestionBankPack, item: QuestionBankPack['topics'][number]) {
  const params = new URLSearchParams()
  params.set('pack', String(pack.sessionQuery?.pack || pack.id))
  if (item.categoryId != null) params.set('category', String(item.categoryId))
  else if (item.topic && !item.topic.startsWith('session-')) params.set('topic', item.topic)
  if (item.label) params.set('session', item.label)
  return `/study/practice/session?${params.toString()}`
}

function packProgressLabel(pack: QuestionBankPack) {
  if (pack.completed <= 0) return null
  return `Progress: ${pack.completed}/${pack.questionCount} (Success rate: ${pack.accuracy}%)`
}

function topicProgressLabel(topic: QuestionBankPack['topics'][number]) {
  if (!topic.hasProgress) return null
  return `Progress: ${topic.completed}/${topic.count} (Accuracy: ${topic.accuracy}%)`
}

export default function QuestionBankPage() {
  const { token, user } = useAuth()
  const fallbackMeta = useMemo(() => buildFallbackMeta(user?.isPremium ?? false), [user?.isPremium])
  const [meta, setMeta] = useState<QuestionBankMeta>(fallbackMeta)
  const [expandedPacks, setExpandedPacks] = useState<Record<string, boolean>>({ '2026-practice': true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMeta(fallbackMeta)
    const initial: Record<string, boolean> = { '2026-practice': true }
    for (const pack of fallbackMeta.packs) {
      if (pack.defaultExpanded) initial[pack.id] = true
    }
    setExpandedPacks(initial)
  }, [fallbackMeta])

  useEffect(() => {
    if (!token) return

    const loadMeta = () => {
      setLoading(true)
      fetchQuestionBank(token)
        .then((data) => {
          setMeta(data)
          const initial: Record<string, boolean> = { '2026-practice': true }
          for (const pack of data.packs) {
            if (pack.defaultExpanded) initial[pack.id] = true
          }
          setExpandedPacks(initial)
        })
        .catch(() => {
          setMeta(fallbackMeta)
        })
        .finally(() => setLoading(false))
    }

    loadMeta()
    window.addEventListener(STUDY_REVIEW_CHANGED, loadMeta)
    return () => window.removeEventListener(STUDY_REVIEW_CHANGED, loadMeta)
  }, [token, user?.plan, fallbackMeta])

  const freeNotice = useMemo(() => {
    if (!meta.isPremium) {
      return `Start the AED 9.9 trial to unlock all ${meta.fullBankSize} questions for 7 days. Continue with AED 99 Early Bird Full Access after the trial.`
    }
    return null
  }, [meta])

  if (loading) {
    return <section className="qb-loading">Loading question bank...</section>
  }

  return (
    <div className="qb-page">
      <div className="qb-main">
        {freeNotice ? (
          <div className="free-bank-notice free-bank-notice-action">
            <span>{freeNotice}</span>
            <UpgradeButton className="upgrade-inline-btn" planId="trial_monthly" source="/study/practice">
              Start trial - AED 9.9
            </UpgradeButton>
          </div>
        ) : null}

        <section className="qb-board" aria-label="Question bank packs">
          {meta.packs.map((pack) => {
            const expanded = Boolean(expandedPacks[pack.id])
            const progress = packProgressLabel(pack)

            return (
              <div key={pack.id} className={`qb-pack-group ${expanded ? 'is-expanded' : ''}`}>
                <button
                  type="button"
                  className="qb-row qb-pack-row"
                  onClick={() =>
                    setExpandedPacks((prev) => ({
                      ...prev,
                      [pack.id]: !prev[pack.id],
                    }))
                  }
                  aria-expanded={expanded}
                >
                  <span className={`qb-chevron ${expanded ? 'open' : ''}`} aria-hidden="true" />
                  <span className="qb-pack-title">{pack.title}</span>
                  {expanded && progress ? <span className="qb-pack-progress">{progress}</span> : null}
                </button>

                {expanded && pack.locked ? (
                  <div className="qb-row qb-locked-row">
                    <span className="qb-doc-icon" aria-hidden="true" />
                    <span className="qb-topic-title">This pack unlocks during the AED 9.9 trial week</span>
                    <UpgradeButton className="qb-action-btn qb-upgrade-btn" planId="trial_monthly" source="/study/practice">
                      Start trial
                    </UpgradeButton>
                  </div>
                ) : null}

                {expanded && !pack.locked && pack.kind === 'practice'
                  ? pack.topics.map((topic) => {
                      const topicProgress = topicProgressLabel(topic)
                      const sessionPath = buildSessionPath(pack, topic)

                      if (topic.accessible === false) {
                        return (
                          <div key={topic.topic} className="qb-row qb-topic-row is-disabled">
                            <span className="qb-doc-icon" aria-hidden="true" />
                            <span className="qb-topic-title">
                              {topic.label} ({topic.count} questions)
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div key={topic.topic} className="qb-row qb-topic-row">
                          <span className="qb-doc-icon" aria-hidden="true" />
                          <Link to={sessionPath} className="qb-topic-title qb-topic-link">
                            {topic.label} ({topic.count} questions)
                          </Link>
                          <div className="qb-topic-actions">
                            {topicProgress ? (
                              <span className="qb-topic-progress">{topicProgress}</span>
                            ) : null}
                            <Link to={sessionPath} className="qb-action-btn">
                              {topic.hasProgress ? 'Continue answering' : 'Start answering'}
                            </Link>
                          </div>
                        </div>
                      )
                    })
                  : null}

                {expanded && !pack.locked && pack.kind !== 'practice' && pack.topics.length > 0
                  ? pack.topics.map((session) => {
                      const topicProgress = topicProgressLabel(session)
                      const sessionPath = buildSessionPath(pack, session)

                      if (session.accessible === false) {
                        return (
                          <div key={session.topic} className="qb-row qb-topic-row is-disabled">
                            <span className="qb-doc-icon" aria-hidden="true" />
                            <span className="qb-topic-title">
                              {session.label} ({session.count} questions)
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div key={session.topic} className="qb-row qb-topic-row">
                          <span className="qb-doc-icon" aria-hidden="true" />
                          <Link to={sessionPath} className="qb-topic-title qb-topic-link">
                            {session.label} ({session.count} questions)
                          </Link>
                          <div className="qb-topic-actions">
                            {topicProgress ? (
                              <span className="qb-topic-progress">{topicProgress}</span>
                            ) : null}
                            <Link to={sessionPath} className="qb-action-btn">
                              {session.hasProgress ? 'Continue answering' : 'Start answering'}
                            </Link>
                          </div>
                        </div>
                      )
                    })
                  : null}

                {expanded && !pack.locked && pack.kind !== 'practice' && pack.topics.length === 0 ? (
                  <div className="qb-row qb-topic-row">
                    <span className="qb-doc-icon" aria-hidden="true" />
                    <span className="qb-topic-title">{pack.title}</span>
                    <div className="qb-topic-actions">
                      <Link to={pack.actionPath || '/study/mock-exam'} className="qb-action-btn">
                        Start exam
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
