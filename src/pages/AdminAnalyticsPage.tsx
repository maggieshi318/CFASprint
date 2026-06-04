import { useEffect, useState } from 'react'
import { fetchAdminAnalytics, type AdminAnalytics } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'

type AnalyticsWithPush = AdminAnalytics & {
  push?: { configured: boolean; registeredTokens: number; broadcasts: number }
}

const STAGE_LABELS: Record<string, string> = {
  registered: 'Registered only',
  started_practice: 'Started practice',
  needs_trial_payment: 'Needs AED 9.9 trial payment',
  completed_mock: 'Completed mock',
  paid: 'Paid access',
}

function shortDate(value: string | null | undefined) {
  if (!value) return '-'
  return value.slice(0, 10)
}

export default function AdminAnalyticsPage() {
  const { token } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsWithPush | null>(null)

  useEffect(() => {
    if (!token) return
    fetchAdminAnalytics(token).then(setAnalytics)
  }, [token])

  if (!analytics) {
    return <section className="panel">Loading merchant analytics...</section>
  }

  const fullAccessCount =
    (analytics.planBreakdown.paid_lifetime || 0) +
    (analytics.planBreakdown.pro_quarterly || 0) +
    (analytics.planBreakdown.pass_pack || 0)
  const trialCount = analytics.planBreakdown.trial_monthly || 0

  return (
    <section className="panel merchant-dashboard">
      <h2>Data Analytics</h2>
      <p className="meta">
        Live data from registered candidates, practice submissions, payment status, and mock exam records.
      </p>

      <div className="stats merchant-stats">
        <article>
          <h3>{analytics.totals.registeredCandidates ?? analytics.totals.users}</h3>
          <p>Registered candidates</p>
        </article>
        <article>
          <h3>{analytics.totals.candidatesWithSubmissions}</h3>
          <p>Started practice</p>
        </article>
        <article>
          <h3>{fullAccessCount}</h3>
          <p>Paid Full Access</p>
        </article>
        <article>
          <h3>{trialCount}</h3>
          <p>Trial users</p>
        </article>
        <article>
          <h3>{analytics.totals.referralRewards || 0}</h3>
          <p>Referral rewards</p>
        </article>
      </div>

      <div className="stats merchant-stats">
        <article>
          <h3>{analytics.rates.practiceActivationPct}%</h3>
          <p>Practice activation</p>
        </article>
        <article>
          <h3>{analytics.rates.premiumConversionPct}%</h3>
          <p>Paid conversion</p>
        </article>
        <article>
          <h3>{analytics.rates.mockCompletionPct}%</h3>
          <p>Mock completion</p>
        </article>
        <article>
          <h3>{analytics.totals.avgMockScore}%</h3>
          <p>Average mock score</p>
        </article>
      </div>

      <div className="review-grid" style={{ marginTop: '1rem' }}>
        <article>
          <h3>Conversion Funnel</h3>
          <div className="merchant-funnel">
            {analytics.funnel.map((item) => (
              <div key={item.stage} className="merchant-funnel-row">
                <span>{item.stage}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article>
          <h3>Last 7 Days</h3>
          <TrendCard title="Signups" series={analytics.trends.signups} />
          <TrendCard title="Practice submits" series={analytics.trends.practice} />
          <TrendCard title="Mock submits" series={analytics.trends.mockSubmits} />
        </article>
      </div>

      <article className="settings-block">
        <h3>Topic Engagement</h3>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Attempts</th>
                <th>Candidates</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topicEngagement.map((topic) => (
                <tr key={topic.topic}>
                  <td>{topic.topic}</td>
                  <td>{topic.attempts}</td>
                  <td>{topic.candidates}</td>
                  <td>{topic.accuracy}%</td>
                </tr>
              ))}
              {analytics.topicEngagement.length === 0 ? (
                <tr>
                  <td colSpan={4}>No practice attempts yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      <article className="settings-block">
        <h3>Candidate Detail</h3>
        <p className="helper-text">
          Use this table to see where each candidate may drop off: registered only, started practice, hit the free
          limit, completed mocks, or paid.
        </p>
        <div className="data-table-wrap">
          <table className="data-table merchant-candidate-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Stage</th>
                <th>Plan</th>
                <th>Answered</th>
                <th>Accuracy</th>
                <th>Completion</th>
                <th>Mocks</th>
                <th>Best mock</th>
                <th>Last practice</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {analytics.candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>
                    <strong>{candidate.name}</strong>
                    <br />
                    <span className="muted-cell">{candidate.email}</span>
                  </td>
                  <td>{STAGE_LABELS[candidate.stage] || candidate.stage}</td>
                  <td>{candidate.isPremium ? (candidate.plan === 'trial_monthly' ? '1-Month Trial' : 'Full Access') : 'Account Only'}</td>
                  <td>{candidate.answeredQuestions}</td>
                  <td>{candidate.accuracy}%</td>
                  <td>{candidate.completionPct}%</td>
                  <td>
                    {candidate.mockSubmitted}/{candidate.mockStarted}
                  </td>
                  <td>{candidate.bestMockScore == null ? '-' : `${candidate.bestMockScore}%`}</td>
                  <td>{shortDate(candidate.lastPracticeAt)}</td>
                  <td>{shortDate(candidate.createdAt)}</td>
                </tr>
              ))}
              {analytics.candidates.length === 0 ? (
                <tr>
                  <td colSpan={10}>No candidates yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

function TrendCard({ title, series }: { title: string; series: Array<{ day: string; count: number }> }) {
  const max = Math.max(...series.map((item) => item.count), 1)
  return (
    <div className="merchant-trend-card">
      <h4>{title}</h4>
      <div className="trend-list">
        {series.map((item) => (
          <div key={`${title}-${item.day}`} className="trend-row">
            <span className="trend-day">{item.day.slice(5)}</span>
            <div className="trend-bar-wrap">
              <div className="trend-bar" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            <span className="trend-count">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
