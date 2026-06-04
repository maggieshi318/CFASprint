export const LANREN_TOPIC_CONFIG = {
  'Quantitative Methods': {
    topic: 'Quantitative Methods',
    tagSlug: 'quantitative-methods',
    matchCategory: (item) => /quantitative/i.test(item.title || item.name || ''),
    expectedCount: 79,
  },
  Economics: {
    topic: 'Economics',
    tagSlug: 'economics',
    matchCategory: (item) => /economics/i.test(item.title || item.name || ''),
    expectedCount: 75,
  },
  FSA: {
    topic: 'FSA',
    tagSlug: 'fsa',
    matchCategory: (item) => /financial statement analysis/i.test(item.title || item.name || ''),
    expectedCount: 126,
  },
  'Corporate Issuers': {
    topic: 'Corporate Issuers',
    tagSlug: 'corporate-issuers',
    matchCategory: (item) => /corporate issuers/i.test(item.title || item.name || ''),
    expectedCount: 75,
  },
  'Equity Investments': {
    topic: 'Equity Investments',
    tagSlug: 'equity-investments',
    matchCategory: (item) => /equity investments/i.test(item.title || item.name || ''),
    expectedCount: 140,
  },
  'Fixed Income': {
    topic: 'Fixed Income',
    tagSlug: 'fixed-income',
    matchCategory: (item) => /fixed income/i.test(item.title || item.name || ''),
    expectedCount: 112,
  },
  Derivatives: {
    topic: 'Derivatives',
    tagSlug: 'derivatives',
    matchCategory: (item) => /derivatives/i.test(item.title || item.name || ''),
    expectedCount: 75,
  },
  'Alternative Investments': {
    topic: 'Alternative Investments',
    tagSlug: 'alternative-investments',
    matchCategory: (item) => /alternative investments/i.test(item.title || item.name || ''),
    expectedCount: 70,
  },
  'Portfolio Management': {
    topic: 'Portfolio Management',
    tagSlug: 'portfolio-management',
    matchCategory: (item) => /portfolio management/i.test(item.title || item.name || ''),
    expectedCount: 100,
  },
  Ethics: {
    topic: 'Ethics',
    tagSlug: 'ethics',
    matchCategory: (item) => /ethical and professional standards|ethic/i.test(item.title || item.name || ''),
    expectedCount: 148,
  },
}

/** 2026 Practice Pack topic order (matches lanrencfa + local question bank UI) */
export const LANREN_PRACTICE_PACK_TOPICS = [
  'Quantitative Methods',
  'Economics',
  'FSA',
  'Corporate Issuers',
  'Equity Investments',
  'Fixed Income',
  'Derivatives',
  'Alternative Investments',
  'Portfolio Management',
  'Ethics',
]

export function getLanrenTopicConfig(topicName) {
  const config = LANREN_TOPIC_CONFIG[topicName]
  if (!config) {
    throw new Error(`Unsupported Lanren topic "${topicName}". Supported: ${Object.keys(LANREN_TOPIC_CONFIG).join(', ')}`)
  }
  return config
}
