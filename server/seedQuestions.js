export const CFA_L1_TOPICS = [
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

export const seedQuestions = [
  {
    id: 1,
    topic: 'Ethics',
    los: 'I.B',
    examYear: 2026,
    tags: JSON.stringify(['ethics', 'independence']),
    difficulty: 'Medium',
    stem: 'Which action best aligns with CFA Institute Standard I(B) Independence and Objectivity?',
    optionA: 'Accepting expensive gifts from a broker and disclosing them internally.',
    optionB: 'Refusing gifts that could reasonably compromise professional judgment.',
    optionC: 'Using issuer-paid research only when market conditions are volatile.',
    answer: 'B',
    explanation:
      'Members should avoid gifts, benefits, or compensation that could impair independence and objectivity.',
  },
  {
    id: 2,
    topic: 'Fixed Income',
    los: 'FI.5',
    examYear: 2026,
    tags: JSON.stringify(['duration', 'price-yield']),
    difficulty: 'Hard',
    stem: 'When market yields increase, the price sensitivity of a bond is most directly captured by:',
    optionA: 'Modified duration.',
    optionB: 'Current yield.',
    optionC: 'Coupon rate.',
    answer: 'A',
    explanation:
      'Modified duration approximates percentage price change for a change in yield, holding other factors constant.',
  },
  {
    id: 4,
    topic: 'FSA',
    los: 'FSA.3',
    examYear: 2024,
    tags: JSON.stringify(['ifrs', 'cashflow']),
    difficulty: 'Medium',
    stem: 'Under IFRS, interest paid is most commonly classified in the statement of cash flows as:',
    optionA: 'Operating or financing cash flow.',
    optionB: 'Only operating cash flow.',
    optionC: 'Only investing cash flow.',
    answer: 'A',
    explanation:
      'IFRS allows more classification flexibility than US GAAP, including operating or financing for interest paid.',
  },
  {
    id: 5,
    topic: 'Ethics',
    los: 'I.A',
    examYear: 2026,
    tags: JSON.stringify(['ethics', 'misconduct']),
    difficulty: 'Easy',
    stem: 'A member discovers a colleague is misusing client funds. The member should:',
    optionA: 'Ignore it unless the client complains.',
    optionB: 'Follow firm policies and applicable law, including escalation when required.',
    optionC: 'Warn the colleague privately and take no further action.',
    answer: 'B',
    explanation: 'Standard I(A) requires knowledge of the law and prompt compliance with legal and firm requirements.',
  },
  {
    id: 7,
    topic: 'Economics',
    los: 'EC.1',
    examYear: 2026,
    tags: JSON.stringify(['gdp', 'macro']),
    difficulty: 'Easy',
    stem: 'Which component is included in GDP under the expenditure approach?',
    optionA: 'Transfer payments.',
    optionB: 'Gross private domestic investment.',
    optionC: 'Used goods sales.',
    answer: 'B',
    explanation: 'GDP equals C + I + G + (X - M); investment is a core expenditure component.',
  },
  {
    id: 8,
    topic: 'Economics',
    los: 'EC.3',
    examYear: 2025,
    tags: JSON.stringify(['monetary-policy', 'inflation']),
    difficulty: 'Medium',
    stem: 'When a central bank raises policy rates to combat inflation, aggregate demand is most likely to:',
    optionA: 'Increase because borrowing costs fall.',
    optionB: 'Decrease because higher rates reduce consumption and investment.',
    optionC: 'Remain unchanged in the short run.',
    answer: 'B',
    explanation: 'Higher policy rates typically raise borrowing costs and dampen aggregate demand.',
  },
  {
    id: 9,
    topic: 'FSA',
    los: 'FSA.5',
    examYear: 2026,
    tags: JSON.stringify(['ratios', 'liquidity']),
    difficulty: 'Medium',
    stem: 'The current ratio is calculated as:',
    optionA: 'Current assets divided by current liabilities.',
    optionB: 'Cash divided by total assets.',
    optionC: 'Operating cash flow divided by sales.',
    answer: 'A',
    explanation: 'Current ratio measures short-term liquidity: current assets / current liabilities.',
  },
  {
    id: 10,
    topic: 'Corporate Issuers',
    los: 'CI.2',
    examYear: 2026,
    tags: JSON.stringify(['capital-structure', 'leverage']),
    difficulty: 'Medium',
    stem: 'All else equal, increasing financial leverage most likely:',
    optionA: 'Reduces the risk of equity returns.',
    optionB: 'Increases the variability of net income and equity returns.',
    optionC: 'Eliminates business risk.',
    answer: 'B',
    explanation: 'Higher leverage magnifies return volatility because fixed debt obligations remain.',
  },
  {
    id: 11,
    topic: 'Corporate Issuers',
    los: 'CI.4',
    examYear: 2025,
    tags: JSON.stringify(['governance', 'agency']),
    difficulty: 'Easy',
    stem: 'An agency problem between shareholders and managers arises primarily because:',
    optionA: 'Managers always own 100% of the firm.',
    optionB: 'Managers may pursue personal interests that conflict with shareholder wealth maximization.',
    optionC: 'Shareholders cannot sell their shares.',
    answer: 'B',
    explanation: 'Separation of ownership and control creates potential conflicts of interest.',
  },
  {
    id: 12,
    topic: 'Equity Investments',
    los: 'EQ.3',
    examYear: 2026,
    tags: JSON.stringify(['valuation', 'multiples']),
    difficulty: 'Medium',
    stem: 'A higher P/E ratio than peers, holding fundamentals constant, most likely suggests the market expects:',
    optionA: 'Lower future earnings growth.',
    optionB: 'Higher future earnings growth or lower required return.',
    optionC: 'Immediate dividend cuts.',
    answer: 'B',
    explanation: 'Higher multiples often reflect stronger growth expectations or lower discount rates.',
  },
  {
    id: 13,
    topic: 'Equity Investments',
    los: 'EQ.5',
    examYear: 2026,
    tags: JSON.stringify(['indexing', 'efficient-markets']),
    difficulty: 'Easy',
    stem: 'Passive index investing is most consistent with:',
    optionA: 'Frequent tactical asset allocation based on forecasts.',
    optionB: 'Belief that markets are largely informationally efficient.',
    optionC: 'Concentrated stock picking in one sector.',
    answer: 'B',
    explanation: 'Passive strategies accept market prices as informative and seek broad market exposure.',
  },
  {
    id: 14,
    topic: 'Fixed Income',
    los: 'FI.2',
    examYear: 2026,
    tags: JSON.stringify(['yield-curve', 'term-structure']),
    difficulty: 'Medium',
    stem: 'An upward-sloping yield curve most commonly indicates:',
    optionA: 'Short-term rates exceed long-term rates.',
    optionB: 'Investors require a premium for longer maturities.',
    optionC: 'Default risk is zero for all maturities.',
    answer: 'B',
    explanation: 'A normal upward slope often reflects a positive term premium for longer horizons.',
  },
  {
    id: 15,
    topic: 'Derivatives',
    los: 'DR.1',
    examYear: 2026,
    tags: JSON.stringify(['forwards', 'hedging']),
    difficulty: 'Easy',
    stem: 'A forward contract differs from a futures contract primarily because forwards are typically:',
    optionA: 'Standardized and exchange-traded.',
    optionB: 'Customized OTC agreements between two parties.',
    optionC: 'Marked to market daily on an exchange.',
    answer: 'B',
    explanation: 'Forwards are usually customized OTC contracts, while futures are standardized and exchange-traded.',
  },
  {
    id: 16,
    topic: 'Derivatives',
    los: 'DR.3',
    examYear: 2025,
    tags: JSON.stringify(['options', 'payoffs']),
    difficulty: 'Hard',
    stem: 'The maximum loss for a long call option buyer is:',
    optionA: 'Unlimited.',
    optionB: 'Limited to the premium paid.',
    optionC: 'Equal to the strike price.',
    answer: 'B',
    explanation: 'A long call buyer can lose at most the premium; upside is theoretically unlimited.',
  },
  {
    id: 17,
    topic: 'Alternative Investments',
    los: 'AI.1',
    examYear: 2026,
    tags: JSON.stringify(['private-equity', 'liquidity']),
    difficulty: 'Medium',
    stem: 'Private equity funds typically exhibit:',
    optionA: 'Daily liquidity and low fees.',
    optionB: 'Limited liquidity and long lock-up periods.',
    optionC: 'No management fees or carried interest.',
    answer: 'B',
    explanation: 'Private equity investments are illiquid with multi-year capital lock-ups.',
  },
  {
    id: 18,
    topic: 'Alternative Investments',
    los: 'AI.2',
    examYear: 2026,
    tags: JSON.stringify(['real-estate', 'valuation']),
    difficulty: 'Easy',
    stem: 'Direct real estate investment most directly exposes an investor to:',
    optionA: 'Property-specific and market risk.',
    optionB: 'Only currency risk.',
    optionC: 'No operational or maintenance costs.',
    answer: 'A',
    explanation: 'Direct ownership includes property-level and local market risks plus operating costs.',
  },
  {
    id: 19,
    topic: 'Portfolio Management',
    los: 'PM.2',
    examYear: 2026,
    tags: JSON.stringify(['risk-return', 'efficient-frontier']),
    difficulty: 'Medium',
    stem: 'On the Markowitz efficient frontier, a portfolio is characterized by:',
    optionA: 'The lowest possible risk for a given level of expected return.',
    optionB: 'The highest risk for every return level.',
    optionC: 'Zero diversification benefit.',
    answer: 'A',
    explanation: 'Efficient portfolios minimize risk for a target expected return (or maximize return for a risk level).',
  },
  {
    id: 20,
    topic: 'Portfolio Management',
    los: 'PM.4',
    examYear: 2026,
    tags: JSON.stringify(['capm', 'beta']),
    difficulty: 'Hard',
    stem: 'According to CAPM, an asset with a beta of 1.2 is expected to:',
    optionA: 'Move 20% less than the market on average.',
    optionB: 'Move 20% more than the market on average.',
    optionC: 'Have zero systematic risk.',
    answer: 'B',
    explanation: 'Beta measures sensitivity to market moves; beta above 1 implies amplified market exposure.',
  },
  {
    id: 21,
    topic: 'Economics',
    los: 'EC.5',
    examYear: 2026,
    tags: JSON.stringify(['trade', 'comparative-advantage']),
    difficulty: 'Easy',
    stem: 'Comparative advantage suggests countries should specialize in goods where they have:',
    optionA: 'The lowest opportunity cost of production.',
    optionB: 'The highest absolute production volume only.',
    optionC: 'No trade partners.',
    answer: 'A',
    explanation: 'Trade gains arise from specializing where opportunity cost is relatively lower.',
  },
  {
    id: 22,
    topic: 'FSA',
    los: 'FSA.7',
    examYear: 2026,
    tags: JSON.stringify(['inventory', 'lifo-fifo']),
    difficulty: 'Hard',
    stem: 'In a period of rising prices, using LIFO instead of FIFO will most likely result in:',
    optionA: 'Higher reported gross profit and higher taxes.',
    optionB: 'Lower reported gross profit and lower taxes.',
    optionC: 'No effect on cost of goods sold.',
    answer: 'B',
    explanation: 'LIFO assigns recent higher costs to COGS, reducing profit and tax expense in inflationary periods.',
  },
]

export function ensureQuestionBank(db) {
  const importedTopics = db
    .prepare(
      `
      SELECT DISTINCT topic FROM questions
      WHERE tags LIKE '%lanrencfa-import%' OR tags LIKE '%practice-pack%'
    `,
    )
    .all()
    .map((row) => row.topic)

  for (const topic of importedTopics) {
    db.prepare(
      `
      DELETE FROM questions
      WHERE topic = ?
        AND tags NOT LIKE '%lanrencfa-import%'
        AND tags NOT LIKE '%practice-pack%'
    `,
    ).run(topic)
  }

  const rowsToSeed = importedTopics.length
    ? seedQuestions.filter((row) => !importedTopics.includes(row.topic))
    : seedQuestions

  const insertQuestion = db.prepare(`
    INSERT OR IGNORE INTO questions (id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation)
    VALUES (@id, @topic, @los, @examYear, @tags, @difficulty, @stem, @optionA, @optionB, @optionC, @answer, @explanation)
  `)
  const tx = db.transaction((rows) => rows.forEach((row) => insertQuestion.run(row)))
  tx(rowsToSeed)
}

export function buildCurriculumMeta(db, userId) {
  const rows = db
    .prepare('SELECT topic, los, difficulty FROM questions ORDER BY topic ASC, los ASC')
    .all()

  const topicMap = new Map()
  for (const row of rows) {
    if (!topicMap.has(row.topic)) {
      topicMap.set(row.topic, { topic: row.topic, count: 0, los: new Map() })
    }
    const topicEntry = topicMap.get(row.topic)
    topicEntry.count += 1
    topicEntry.los.set(row.los, (topicEntry.los.get(row.los) || 0) + 1)
  }

  let unansweredCount = rows.length
  if (userId) {
    unansweredCount = db
      .prepare(
        `
        SELECT COUNT(*) AS count FROM questions q
        LEFT JOIN submissions s ON s.question_id = q.id AND s.user_id = ?
        WHERE s.id IS NULL
      `,
      )
      .get(userId).count
  }

  const topics = Array.from(topicMap.values())
    .sort((a, b) => a.topic.localeCompare(b.topic))
    .map((item) => ({
      topic: item.topic,
      count: item.count,
      los: Array.from(item.los.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    }))

  return {
    totalQuestions: rows.length,
    unansweredCount,
    topics,
    topicCount: topics.length,
  }
}
