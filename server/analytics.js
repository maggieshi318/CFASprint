import { hasActiveSubscription } from './billing.js'

function dailySeries(db, sql, days = 7) {
  const rows = db.prepare(sql).all(`-${days - 1} days`)
  const map = new Map(rows.map((row) => [row.day, row.count]))
  const series = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = db.prepare(`SELECT date('now', ?) AS day`).get(`-${offset} days`).day
    series.push({ day, count: map.get(day) || 0 })
  }
  return series
}

export function buildAdminAnalytics(db) {
  const users = db
    .prepare(
      'SELECT id, name, email, role, plan, subscription_status, subscription_expires_at, email_verified, created_at, referred_by_user_id FROM users',
    )
    .all()

  const students = users.filter((user) => user.role !== 'admin')
  const premiumUsers = students.filter((user) => hasActiveSubscription(user)).length
  const verifiedUsers = students.filter((user) => user.email_verified).length
  const studentIds = students.map((user) => user.id)

  const planBreakdown = students.reduce(
    (acc, user) => {
      const key = user.plan || 'free'
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    { free: 0, trial_monthly: 0, paid_lifetime: 0, community_sprint: 0 },
  )

  const submissionAgg = db
    .prepare(
      `
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN date(submitted_at) >= date('now', '-7 days') THEN 1 ELSE 0 END) AS last7
      FROM submissions
    `,
    )
    .get()

  const mockAgg = db
    .prepare(
      `
      SELECT
        SUM(CASE WHEN status IN ('active', 'submitted', 'abandoned') THEN 1 ELSE 0 END) AS started,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
        AVG(CASE WHEN status = 'submitted' AND total > 0 THEN (score * 100.0 / total) ELSE NULL END) AS avgScore
      FROM mock_sessions
    `,
    )
    .get()

  const candidatesWithSubmissions = db
    .prepare(
      `
      SELECT COUNT(DISTINCT s.user_id) AS count
      FROM submissions s
      JOIN users u ON u.id = s.user_id
      WHERE u.role = 'student'
    `,
    )
    .get().count

  const candidatesWithSubmittedMocks = db
    .prepare(
      `
      SELECT COUNT(DISTINCT m.user_id) AS count
      FROM mock_sessions m
      JOIN users u ON u.id = m.user_id
      WHERE u.role = 'student' AND m.status = 'submitted'
    `,
    )
    .get().count

  const candidatesCompletedAllAccessible = studentIds.length
    ? db
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM users u
          WHERE u.role = 'student'
            AND (
              SELECT COUNT(DISTINCT s.question_id)
              FROM submissions s
              WHERE s.user_id = u.id
            ) >= CASE
              WHEN u.plan IN ('trial_monthly', 'paid_lifetime', 'community_sprint')
                   AND u.subscription_status = 'active'
                   AND (u.subscription_expires_at IS NULL OR datetime(u.subscription_expires_at) > datetime('now'))
                THEN (SELECT COUNT(*) FROM questions)
              ELSE 40
            END
        `,
        )
        .get().count
    : 0

  const registrations7 = db
    .prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND date(created_at) >= date('now', '-7 days')`)
    .get().count
  const registrations30 = db
    .prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND date(created_at) >= date('now', '-30 days')`)
    .get().count

  const conversionRate = students.length > 0 ? Math.round((premiumUsers / students.length) * 100) : 0
  const mockCompletionRate = mockAgg.started > 0 ? Math.round((mockAgg.submitted / mockAgg.started) * 100) : 0
  const fullBankSize = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count
  const referralRewards = db.prepare('SELECT COUNT(*) AS count FROM referral_rewards').get().count

  const candidateDetails = db
    .prepare(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.plan,
        u.subscription_status AS subscriptionStatus,
        u.subscription_expires_at AS subscriptionExpiresAt,
        u.email_verified AS emailVerified,
        u.referred_by_user_id AS referredByUserId,
        u.created_at AS createdAt,
        (SELECT COUNT(DISTINCT s.question_id) FROM submissions s WHERE s.user_id = u.id) AS answeredQuestions,
        (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id AND s.correct = 1) AS correctAnswers,
        (SELECT MAX(s.submitted_at) FROM submissions s WHERE s.user_id = u.id) AS lastPracticeAt,
        (SELECT COUNT(*) FROM mock_sessions m WHERE m.user_id = u.id AND m.status IN ('active', 'submitted', 'abandoned')) AS mockStarted,
        (SELECT COUNT(*) FROM mock_sessions m WHERE m.user_id = u.id AND m.status = 'submitted') AS mockSubmitted,
        (SELECT MAX(m.submitted_at) FROM mock_sessions m WHERE m.user_id = u.id AND m.status = 'submitted') AS lastMockAt,
        (
          SELECT MAX(ROUND(m.score * 100.0 / m.total))
          FROM mock_sessions m
          WHERE m.user_id = u.id AND m.status = 'submitted' AND m.total > 0
        ) AS bestMockScore
      FROM users u
      WHERE u.role = 'student'
      ORDER BY datetime(u.created_at) DESC, u.id DESC
    `,
    )
    .all()
    .map((row) => {
      const activePaid =
        (row.plan === 'trial_monthly' || row.plan === 'paid_lifetime' || row.plan === 'community_sprint') &&
        row.subscriptionStatus === 'active' &&
        (!row.subscriptionExpiresAt || new Date(row.subscriptionExpiresAt).getTime() > Date.now())
      const answered = Number(row.answeredQuestions || 0)
      const correct = Number(row.correctAnswers || 0)
      const mockSubmitted = Number(row.mockSubmitted || 0)
      const accessibleQuestions = activePaid ? fullBankSize : 40
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
      const completionPct = accessibleQuestions > 0 ? Math.min(100, Math.round((answered / accessibleQuestions) * 100)) : 0
      let stage = 'registered'
      if (answered > 0) stage = 'started_practice'
      if (!activePaid) stage = 'needs_trial_payment'
      if (mockSubmitted > 0) stage = 'completed_mock'
      if (activePaid) stage = 'paid'
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        plan: activePaid ? row.plan : 'free',
        isPremium: activePaid,
        referredByUserId: row.referredByUserId || null,
        emailVerified: Boolean(row.emailVerified),
        createdAt: row.createdAt,
        answeredQuestions: answered,
        correctAnswers: correct,
        accuracy,
        completionPct,
        lastPracticeAt: row.lastPracticeAt,
        mockStarted: Number(row.mockStarted || 0),
        mockSubmitted,
        lastMockAt: row.lastMockAt,
        bestMockScore: row.bestMockScore == null ? null : Number(row.bestMockScore),
        stage,
      }
    })

  const funnel = [
    { stage: 'Registered', count: students.length },
    { stage: 'Verified email', count: verifiedUsers },
    { stage: 'Started practice', count: candidatesWithSubmissions },
    { stage: 'Needs AED 9.9 trial payment', count: candidateDetails.filter((item) => !item.isPremium).length },
    { stage: 'Completed a mock', count: candidatesWithSubmittedMocks },
    { stage: 'Trial or Full Access active', count: premiumUsers },
  ]

  const topicEngagement = db
    .prepare(
      `
      SELECT
        q.topic,
        COUNT(*) AS attempts,
        COUNT(DISTINCT s.user_id) AS candidates,
        ROUND(AVG(CASE WHEN s.correct = 1 THEN 100.0 ELSE 0 END)) AS accuracy
      FROM submissions s
      JOIN questions q ON q.id = s.question_id
      JOIN users u ON u.id = s.user_id
      WHERE u.role = 'student'
      GROUP BY q.topic
      ORDER BY attempts DESC
    `,
    )
    .all()
    .map((row) => ({
      topic: row.topic,
      attempts: Number(row.attempts || 0),
      candidates: Number(row.candidates || 0),
      accuracy: row.accuracy == null ? 0 : Number(row.accuracy),
    }))

  return {
    totals: {
      users: students.length,
      registeredCandidates: students.length,
      verifiedUsers,
      premiumUsers,
      freeUsers: students.length - premiumUsers,
      questions: fullBankSize,
      submissions: submissionAgg.total || 0,
      submissionsLast7Days: submissionAgg.last7 || 0,
      candidatesWithSubmissions,
      candidatesCompletedQuestions: candidatesCompletedAllAccessible,
      mockStarted: mockAgg.started || 0,
      mockSubmitted: mockAgg.submitted || 0,
      candidatesWithSubmittedMocks,
      avgMockScore: mockAgg.avgScore ? Math.round(mockAgg.avgScore) : 0,
      referralRewards,
    },
    rates: {
      premiumConversionPct: conversionRate,
      mockCompletionPct: mockCompletionRate,
      emailVerifiedPct: students.length > 0 ? Math.round((verifiedUsers / students.length) * 100) : 0,
      practiceActivationPct:
        students.length > 0 ? Math.round((candidatesWithSubmissions / students.length) * 100) : 0,
      questionCompletionPct:
        students.length > 0 ? Math.round((candidatesCompletedAllAccessible / students.length) * 100) : 0,
    },
    growth: {
      registrationsLast7Days: registrations7,
      registrationsLast30Days: registrations30,
    },
    planBreakdown,
    trends: {
      signups: dailySeries(
        db,
        `
        SELECT date(created_at) AS day, COUNT(*) AS count
        FROM users
        WHERE role = 'student' AND date(created_at) >= date('now', ?)
        GROUP BY date(created_at)
        ORDER BY day ASC
      `,
      ),
      practice: dailySeries(
        db,
        `
        SELECT date(submitted_at) AS day, COUNT(*) AS count
        FROM submissions
        WHERE date(submitted_at) >= date('now', ?)
        GROUP BY date(submitted_at)
        ORDER BY day ASC
      `,
      ),
      mockSubmits: dailySeries(
        db,
        `
        SELECT date(submitted_at) AS day, COUNT(*) AS count
        FROM mock_sessions
        WHERE status = 'submitted' AND date(submitted_at) >= date('now', ?)
        GROUP BY date(submitted_at)
        ORDER BY day ASC
      `,
      ),
    },
    funnel,
    topicEngagement,
    candidates: candidateDetails,
  }
}
