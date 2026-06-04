export const SPRINT_WEEKS = [
  {
    week: 1,
    title: 'Ethics & Quant Foundations',
    topics: ['Ethics', 'Quantitative Methods'],
    focus: 'Build ethics framework and quant basics first — high exam weight.',
  },
  {
    week: 2,
    title: 'Economics',
    topics: ['Economics'],
    focus: 'Micro/macro concepts, supply-demand, monetary & fiscal policy.',
  },
  {
    week: 3,
    title: 'Financial Reporting I',
    topics: ['FSA'],
    focus: 'Income statement, balance sheet, cash flow statement mechanics.',
  },
  {
    week: 4,
    title: 'Corporate Issuers',
    topics: ['Corporate Issuers', 'FSA'],
    focus: 'Capital structure, governance, and remaining FSA ratios.',
  },
  {
    week: 5,
    title: 'Equity & Fixed Income',
    topics: ['Equity Investments', 'Fixed Income'],
    focus: 'Valuation methods, yield curves, duration, and credit basics.',
  },
  {
    week: 6,
    title: 'Derivatives & Alternatives',
    topics: ['Derivatives', 'Alternative Investments'],
    focus: 'Options payoffs, swaps, PE/real estate/commodities overview.',
  },
  {
    week: 7,
    title: 'Portfolio Management',
    topics: ['Portfolio Management'],
    focus: 'IPS, CAPM, efficient frontier, and risk/return integration.',
  },
  {
    week: 8,
    title: 'Mock & Weak-Area Sprint',
    topics: [
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
    ],
    focus: 'Full mocks, wrong-book review, and targeted topic drills.',
  },
]

export const SPRINT_WEEKS_ZH = [
  {
    week: 1,
    title: '伦理与数量基础',
    topics: ['Ethics', 'Quantitative Methods'],
    focus: '优先攻克伦理框架与数量方法——考试权重高。',
  },
  {
    week: 2,
    title: '经济学',
    topics: ['Economics'],
    focus: '微观/宏观概念、供需、货币与财政政策。',
  },
  {
    week: 3,
    title: '财务报表 I',
    topics: ['FSA'],
    focus: '利润表、资产负债表、现金流量表核心机制。',
  },
  {
    week: 4,
    title: '公司发行人',
    topics: ['Corporate Issuers', 'FSA'],
    focus: '资本结构、公司治理及剩余 FSA 比率分析。',
  },
  {
    week: 5,
    title: '权益与固定收益',
    topics: ['Equity Investments', 'Fixed Income'],
    focus: '估值方法、收益率曲线、久期与信用基础。',
  },
  {
    week: 6,
    title: '衍生品与另类投资',
    topics: ['Derivatives', 'Alternative Investments'],
    focus: '期权 payoff、互换及 PE/房地产/大宗商品概览。',
  },
  {
    week: 7,
    title: '投资组合管理',
    topics: ['Portfolio Management'],
    focus: 'IPS、CAPM、有效前沿及风险收益整合。',
  },
  {
    week: 8,
    title: '模考与薄弱项冲刺',
    topics: [
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
    ],
    focus: '全真模考、错题复习与针对性刷题。',
  },
]

export function buildSprintPlan(db, userId, weeklyGoal = 50, locale = 'en') {
  const template = locale === 'zh' ? SPRINT_WEEKS_ZH : SPRINT_WEEKS
  const targetPerWeek = Math.max(20, weeklyGoal)

  return template.map((week) => {
    const placeholders = week.topics.map(() => '?').join(', ')
    const completed = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM submissions s
        JOIN questions q ON q.id = s.question_id
        WHERE s.user_id = ? AND q.topic IN (${placeholders})
      `,
      )
      .get(userId, ...week.topics).count

    const progressPct = targetPerWeek > 0 ? Math.min(100, Math.round((completed / targetPerWeek) * 100)) : 0

    return {
      week: week.week,
      title: week.title,
      focus: week.focus,
      topics: week.topics,
      targetQuestions: targetPerWeek,
      completed,
      progressPct,
      status: progressPct >= 100 ? 'complete' : progressPct >= 50 ? 'on-track' : 'behind',
    }
  })
}

export function getWeeklyGoalProgress(db, userId, weeklyGoal = 50) {
  const completed = db
    .prepare(
      `
      SELECT COUNT(*) AS count FROM submissions
      WHERE user_id = ? AND date(submitted_at) >= date('now', 'weekday 0', '-7 days')
    `,
    )
    .get(userId).count

  return {
    weeklyGoal,
    completedThisWeek: completed,
    progressPct: weeklyGoal > 0 ? Math.min(100, Math.round((completed / weeklyGoal) * 100)) : 0,
  }
}

export function getExamCountdown(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${examDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const diffMs = target.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
