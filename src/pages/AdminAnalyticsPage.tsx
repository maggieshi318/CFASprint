import { useEffect, useState } from 'react'
import {
  adminExtendSubscription,
  adminMarkFounderEvent,
  createInviteCode,
  fetchAdminAnalytics,
  fetchAdminUserStudyReports,
  fetchInviteCodes,
  type AdminAnalytics,
  type AdminStudyReport,
  type InviteCode,
} from '../api/mockApi'
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

const FOUNDER_STAGE_LABELS: Record<string, string> = {
  unqualified: 'Not qualified',
  qualified: 'Qualified',
  activation_started: 'Activation started',
  practice_completed: 'Practice completed',
  value_signal: 'Value signal',
  offer_sent: 'Offer sent',
  offer_accepted: 'Offer accepted',
  offer_rejected: 'Offer rejected',
  paid_user: 'paid_user',
}

const FOUNDER_OFFERS = {
  usd49: { label: 'USD 49', price: 49, currency: 'USD' as const },
  aed179: { label: 'AED 179', price: 179, currency: 'AED' as const },
}

function shortDate(value: string | null | undefined) {
  if (!value) return '-'
  return value.slice(0, 10)
}

export default function AdminAnalyticsPage() {
  const { token } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsWithPush | null>(null)
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [inviteNote, setInviteNote] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [updatingFounderUserId, setUpdatingFounderUserId] = useState<number | null>(null)
  const [founderOfferKey, setFounderOfferKey] = useState<'usd49' | 'aed179'>('usd49')
  const [extendingUserId, setExtendingUserId] = useState<number | null>(null)
  const [extendDays, setExtendDays] = useState<Record<number, number>>({})
  const [extendResult, setExtendResult] = useState<string | null>(null)
  const [reportModal, setReportModal] = useState<{ name: string; reports: AdminStudyReport[] } | null>(null)
  const [loadingReportUserId, setLoadingReportUserId] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    fetchAdminAnalytics(token).then(setAnalytics)
    fetchInviteCodes(token).then(setInviteCodes).catch(() => setInviteCodes([]))
  }, [token])

  async function handleCreateInviteCode() {
    if (!token) return
    setCreatingInvite(true)
    try {
      const result = await createInviteCode(token, { note: inviteNote, trialDays: 7 })
      setInviteCodes(result.inviteCodes)
      setInviteNote('')
      await navigator.clipboard?.writeText(result.code)
    } finally {
      setCreatingInvite(false)
    }
  }

  async function handleMarkFounderEvent(
    userId: number,
    event: 'founder_offer_sent' | 'founder_offer_accepted' | 'founder_offer_rejected' | 'paid_user',
  ) {
    if (!token) return
    setUpdatingFounderUserId(userId)
    try {
      if (event === 'founder_offer_sent') {
        await adminMarkFounderEvent(token, userId, { event, ...FOUNDER_OFFERS[founderOfferKey] })
      } else if (event === 'founder_offer_rejected') {
        await adminMarkFounderEvent(token, userId, {
          event,
          rejectionReason: 'Needs follow-up',
          feedback: 'Capture price or benefits feedback in daily review notes.',
        })
      } else {
        await adminMarkFounderEvent(token, userId, { event })
      }
      setAnalytics(await fetchAdminAnalytics(token))
    } finally {
      setUpdatingFounderUserId(null)
    }
  }

  async function handleExtend(userId: number, name: string) {
    if (!token) return
    const days = extendDays[userId] ?? 7
    setExtendingUserId(userId)
    setExtendResult(null)
    try {
      const result = await adminExtendSubscription(token, userId, days)
      setExtendResult(`✅ ${name}: extended ${days}d → expires ${result.newExpiresAt.slice(0, 10)}`)
      setAnalytics(await fetchAdminAnalytics(token))
    } catch (err) {
      setExtendResult(`❌ Failed to extend ${name}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setExtendingUserId(null)
    }
  }

  async function handleViewReports(userId: number, name: string) {
    if (!token) return
    setLoadingReportUserId(userId)
    try {
      const reports = await fetchAdminUserStudyReports(token, userId)
      setReportModal({ name, reports })
    } finally {
      setLoadingReportUserId(null)
    }
  }

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
      {reportModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '2rem 1rem', overflowY: 'auto',
          }}
          onClick={() => setReportModal(null)}
        >
          <div
            style={{
              background: 'var(--color-surface, #fff)', borderRadius: '10px',
              padding: '1.5rem', maxWidth: '720px', width: '100%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>AI Study Reports — {reportModal.name}</h3>
              <button type="button" className="link-button" onClick={() => setReportModal(null)}>✕ Close</button>
            </div>
            {reportModal.reports.length === 0 ? (
              <p className="helper-text">No reports generated yet.</p>
            ) : (
              reportModal.reports.map((r, i) => (
                <details key={r.id} open={i === 0} style={{ marginBottom: '1rem', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '6px', padding: '0.75rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                    Report #{reportModal.reports.length - i} — {r.createdAt.slice(0, 10)} ({r.notesCount} notes)
                  </summary>
                  {r.report ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      {r.report.topics.map((topic) => (
                        <div key={topic.topic} style={{ marginBottom: '0.75rem' }}>
                          <strong>{topic.topic}</strong>
                          {topic.knowledgePoints.length > 0 && (
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                              <em>Key points:</em> {topic.knowledgePoints.join(' · ')}
                            </p>
                          )}
                          {topic.reviewActions.length > 0 && (
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
                              <em>Actions:</em> {topic.reviewActions.join(' · ')}
                            </p>
                          )}
                        </div>
                      ))}
                      {r.report.overallReviewPlan.length > 0 && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--color-bg, #f9fafb)', borderRadius: '4px', fontSize: '0.875rem' }}>
                          <strong>Overall plan:</strong> {r.report.overallReviewPlan.join(' → ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="helper-text" style={{ marginTop: '0.5rem' }}>Report data unavailable.</p>
                  )}
                </details>
              ))
            )}
          </div>
        </div>
      )}
      <h2>Data Analytics</h2>
      <p className="meta">
        Live data from registered candidates, practice submissions, payment status, and mock exam records.
      </p>

      <article className="settings-block">
        <h3>Internal Test Registration Codes</h3>
        <p className="helper-text">
          New candidates must enter one active code to register. Each code opens a free 7-day full-access beta trial and
          can only be used once.
        </p>
        <div className="admin-invite-actions">
          <input
            value={inviteNote}
            onChange={(event) => setInviteNote(event.target.value)}
            placeholder="Optional note, e.g. WhatsApp beta group"
          />
          <button type="button" className="primary-btn" disabled={creatingInvite} onClick={handleCreateInviteCode}>
            {creatingInvite ? 'Generating...' : 'Generate code'}
          </button>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>Trial</th>
                <th>Note</th>
                <th>Redeemed by</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {inviteCodes.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => void navigator.clipboard?.writeText(item.code)}
                      title="Copy code"
                    >
                      {item.code}
                    </button>
                  </td>
                  <td>{item.status}</td>
                  <td>{item.trialDays} days</td>
                  <td>{item.note || '-'}</td>
                  <td>{item.redeemedByEmail || '-'}</td>
                  <td>{shortDate(item.createdAt)}</td>
                </tr>
              ))}
              {inviteCodes.length === 0 ? (
                <tr>
                  <td colSpan={6}>No invite codes yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

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

      <div className="stats merchant-stats">
        <article>
          <h3>{analytics.totals.founderQualified || 0}</h3>
          <p>Founder qualified</p>
        </article>
        <article>
          <h3>{analytics.totals.aiTutorUsed || 0}</h3>
          <p>AI Tutor used</p>
        </article>
        <article>
          <h3>{analytics.totals.aiStudyReportGenerated || 0}</h3>
          <p>AI reports</p>
        </article>
        <article>
          <h3>{analytics.totals.valueSignal || 0}</h3>
          <p>Value signal</p>
        </article>
        <article>
          <h3>{analytics.totals.paidUsers || 0}</h3>
          <p>paid_user</p>
        </article>
      </div>

      <article className="settings-block">
        <h3>Founder Program Private Offer</h3>
        <p className="helper-text">
          Private Founder offer only. Keep public Pricing unchanged until the founder explicitly approves a public
          pricing change.
        </p>
        <label>
          Private offer price
          <select value={founderOfferKey} onChange={(event) => setFounderOfferKey(event.target.value as 'usd49' | 'aed179')}>
            <option value="usd49">USD 49</option>
            <option value="aed179">AED 179</option>
          </select>
        </label>
      </article>

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
        {extendResult && (
          <p
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              background: extendResult.startsWith('✅') ? 'var(--color-success-bg, #ecfdf5)' : 'var(--color-error-bg, #fef2f2)',
              color: extendResult.startsWith('✅') ? 'var(--color-success, #065f46)' : 'var(--color-error, #991b1b)',
              fontSize: '0.875rem',
              marginBottom: '0.75rem',
            }}
          >
            {extendResult}
          </p>
        )}
        <div className="data-table-wrap">
          <table className="data-table merchant-candidate-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Stage</th>
                <th>Founder</th>
                <th>AI value</th>
                <th>Plan</th>
                <th>Extend Access</th>
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
                  <td>
                    {FOUNDER_STAGE_LABELS[candidate.founderStage] || candidate.founderStage}
                    <br />
                    <span className="muted-cell">
                      {candidate.examWindow || '-'} ·{' '}
                      {candidate.founderOfferCurrency && candidate.founderOfferPrice
                        ? `${candidate.founderOfferCurrency} ${candidate.founderOfferPrice}`
                        : 'no offer'}
                    </span>
                    <br />
                    <button
                      type="button"
                      className="link-button"
                      disabled={updatingFounderUserId === candidate.id}
                      onClick={() => void handleMarkFounderEvent(candidate.id, 'founder_offer_sent')}
                    >
                      Mark offer
                    </button>
                    {' / '}
                    <button
                      type="button"
                      className="link-button"
                      disabled={updatingFounderUserId === candidate.id}
                      onClick={() => void handleMarkFounderEvent(candidate.id, 'founder_offer_accepted')}
                    >
                      Accepted
                    </button>
                    {' / '}
                    <button
                      type="button"
                      className="link-button"
                      disabled={updatingFounderUserId === candidate.id}
                      onClick={() => void handleMarkFounderEvent(candidate.id, 'founder_offer_rejected')}
                    >
                      Rejected
                    </button>
                    {' / '}
                    <button
                      type="button"
                      className="link-button"
                      disabled={updatingFounderUserId === candidate.id}
                      onClick={() => void handleMarkFounderEvent(candidate.id, 'paid_user')}
                    >
                      Mark paid_user
                    </button>
                  </td>
                  <td>
                    Tutor: {shortDate(candidate.aiTutorUsedAt)}
                    <br />
                    Report: {shortDate(candidate.aiStudyReportGeneratedAt)}
                    {candidate.aiStudyReportGeneratedAt && (
                      <>
                        <br />
                        <button
                          type="button"
                          className="link-button"
                          disabled={loadingReportUserId === candidate.id}
                          onClick={() => void handleViewReports(candidate.id, candidate.name)}
                        >
                          {loadingReportUserId === candidate.id ? '...' : 'View reports'}
                        </button>
                      </>
                    )}
                  </td>
                  <td>
                    {candidate.isPremium
                      ? candidate.plan === 'trial_monthly'
                        ? '7-Day Trial'
                        : candidate.plan === 'community_sprint'
                          ? 'Sprint Community Plan'
                          : 'Early Bird Full Access'
                      : 'Account Only'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={extendDays[candidate.id] ?? 7}
                      onChange={(e) =>
                        setExtendDays((prev) => ({ ...prev, [candidate.id]: Number(e.target.value) }))
                      }
                      style={{ width: '3.5rem', marginRight: '0.4rem' }}
                    />
                    <span style={{ marginRight: '0.3rem', fontSize: '0.8em', color: 'var(--color-muted)' }}>days</span>
                    <button
                      type="button"
                      className="link-button"
                      disabled={extendingUserId === candidate.id}
                      onClick={() => void handleExtend(candidate.id, candidate.name)}
                    >
                      {extendingUserId === candidate.id ? '...' : 'Extend'}
                    </button>
                  </td>
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
                  <td colSpan={12}>No candidates yet.</td>
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
