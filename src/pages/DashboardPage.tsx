import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchStats, type StatsResponse } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import { useStudy } from '../store/StudyContext'
import { STUDY_REVIEW_CHANGED } from '../utils/studyReview'

const TOPIC_WEIGHTS: Record<string, string> = {
  Ethics: '15 - 20%',
  'Quantitative Methods': '6 - 9%',
  Economics: '6 - 9%',
  FSA: '11 - 14%',
  'Corporate Issuers': '6 - 9%',
  'Equity Investments': '11 - 14%',
  'Fixed Income': '11 - 14%',
  Derivatives: '5 - 8%',
  'Alternative Investments': '7 - 10%',
  'Portfolio Management': '8 - 12%',
}

const TOPIC_LABELS: Record<string, string> = {
  Ethics: 'Ethical and Professional Standards',
  'Quantitative Methods': 'Quantitative Methods',
  Economics: 'Economics',
  FSA: 'Financial Statement Analysis',
  'Corporate Issuers': 'Corporate Issuers',
  'Equity Investments': 'Equity Investments',
  'Fixed Income': 'Fixed Income',
  Derivatives: 'Derivatives',
  'Alternative Investments': 'Alternative Investments',
  'Portfolio Management': 'Portfolio Management',
}

const TOPIC_ORDER = [
  'Ethics',
  'Quantitative Methods',
  'Economics',
  'FSA',
  'Corporate Issuers',
  'Equity Investments',
  'Fixed Income',
  'Derivatives',
  'Alternative Investments',
  'Portfolio Management',
]

const BENCHMARK = 70
const DEFAULT_EXAM_DATE = '2026-11-11'

function formatExamDate(value: string | null) {
  if (!value) return null
  return value.replace(/-/g, '/')
}

function computeDaysRemaining(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const EMPTY_STATS: StatsResponse = {
  totalQuestions: 0,
  completed: 0,
  correct: 0,
  wrong: 0,
  accuracy: 0,
  studyStreak: 0,
  topicPerformance: [],
  weakAreas: [],
  pack: {
    id: '2026-practice',
    title: '2026 CFA Level I Practice Pack',
    questionCount: 1000,
    completed: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    progressPct: 0,
  },
  exam: {
    date: DEFAULT_EXAM_DATE,
    daysRemaining: computeDaysRemaining(DEFAULT_EXAM_DATE),
  },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse>(EMPTY_STATS)
  const { token } = useAuth()
  const { done, wrong } = useStudy()

  useEffect(() => {
    if (!token) return

    const loadStats = () => {
      fetchStats(token)
        .then(setStats)
        .catch(() => setStats(EMPTY_STATS))
    }

    loadStats()
    window.addEventListener(STUDY_REVIEW_CHANGED, loadStats)
    return () => window.removeEventListener(STUDY_REVIEW_CHANGED, loadStats)
  }, [token, done, wrong])

  const examDate = stats.exam?.date || DEFAULT_EXAM_DATE
  const daysRemaining = stats.exam?.daysRemaining ?? computeDaysRemaining(examDate)
  const formattedExamDate = formatExamDate(examDate)

  const topicBars = useMemo(() => {
    const byTopic = new Map(stats.topicPerformance.map((item) => [item.topic, item]))

    return TOPIC_ORDER.map((topic) => {
      const item = byTopic.get(topic)
      const hasData = (item?.completed ?? 0) > 0
      const accuracy = hasData ? item!.accuracy : null
      const belowBenchmark = hasData && item!.accuracy < BENCHMARK
      return {
        topic,
        label: TOPIC_LABELS[topic] || item?.label || topic,
        weight: TOPIC_WEIGHTS[topic] || '',
        accuracy,
        belowBenchmark,
      }
    })
  }, [stats.topicPerformance])

  return (
    <div className="stats-dashboard stats-dashboard-lanren">
      <div className="stats-summary-row">
        <article className="stats-summary-card blue">
          <strong>{stats.totalQuestions}</strong>
          <span>Total Questions</span>
        </article>
        <article className="stats-summary-card green">
          <strong>{stats.completed}</strong>
          <span>Completed</span>
        </article>
        <article className="stats-summary-card orange">
          <strong>{stats.accuracy}%</strong>
          <span>Overall Accuracy</span>
        </article>
      </div>

      <section className="stats-chart-panel">
        <div className="stats-chart-head">
          <h2>Practice Pack Topic Accuracy</h2>
          <span className="stats-benchmark-label">Benchmark {BENCHMARK}%</span>
        </div>

        <div className="stats-chart-wrap">
          <div className="stats-tracks-row">
            <div className="stats-benchmark-line" aria-hidden="true">
              <span>{BENCHMARK}%</span>
            </div>
            <div className="stats-bar-grid stats-bar-grid-tracks">
              {topicBars.map((item) => (
                <div key={`${item.topic}-track`} className="stats-bar-col-track">
                  <div className="stats-bar-track">
                    {item.accuracy != null ? (
                      <div
                        className={`stats-bar-fill ${item.belowBenchmark ? 'low' : 'ok'}`}
                        style={{ height: `${Math.max(item.accuracy, 6)}%` }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="stats-bar-grid stats-bar-grid-labels">
            {topicBars.map((item) => (
              <div key={item.topic} className="stats-bar-col-labels">
                <p
                  className={`stats-bar-value ${
                    item.accuracy != null ? (item.belowBenchmark ? 'is-low' : 'is-ok') : 'is-empty'
                  }`}
                >
                  {item.accuracy != null ? `${item.accuracy}%` : '-'}
                </p>
                <p className="stats-bar-label" title={item.label}>
                  {item.label}
                </p>
                <p className="stats-bar-weight">{item.weight}</p>
              </div>
            ))}
          </div>
          <p className="stats-weight-title">Topic Weight</p>
        </div>
      </section>

      <section className="stats-exam-panel stats-exam-panel-lanren">
        <div className="stats-exam-top">
          <div className="stats-exam-title-row">
            <span className="stats-exam-icon" aria-hidden="true">
              EX
            </span>
            <span>Days to Exam</span>
          </div>
          <Link to="/user/account" className="stats-exam-edit" title="Edit exam date">
            Edit
          </Link>
        </div>
        {daysRemaining != null && formattedExamDate ? (
          <div className="stats-exam-center">
            <p className="stats-exam-days">
              {Math.max(daysRemaining, 0)}
              <span>days</span>
            </p>
            <p className="stats-exam-date">Exam date: {formattedExamDate}</p>
          </div>
        ) : (
          <p className="stats-exam-empty">
            <Link to="/user/account">Set exam date</Link>
          </p>
        )}
      </section>
    </div>
  )
}
