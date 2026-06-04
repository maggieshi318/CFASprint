import { LANREN_PRACTICE_PACK_TOPICS, LANREN_TOPIC_CONFIG } from './lanrenTopics.js'

/** Lanren project + import metadata for each question bank pack */
export const LANREN_PACKS = {
  '2026-practice': {
    id: '2026-practice',
    kind: 'practice',
    examYear: 2026,
    ppLabel: '2026PP',
    displayCount: 1000,
    matchProject: (project) => /2026/i.test(project.name || '') && /practice/i.test(project.name || ''),
  },
  '2026-mock': {
    id: '2026-mock',
    kind: 'mock',
    examYear: 2026,
    ppLabel: '2026MOCK',
    displayCount: 1080,
    matchProject: (project) => /2026/i.test(project.name || '') && /mock/i.test(project.name || ''),
  },
  '2025-practice': {
    id: '2025-practice',
    kind: 'practice',
    examYear: 2025,
    ppLabel: '2025PP',
    displayCount: 1000,
    matchProject: (project) => /2025/i.test(project.name || '') && /practice/i.test(project.name || ''),
  },
  '2025-mock': {
    id: '2025-mock',
    kind: 'mock',
    examYear: 2025,
    ppLabel: '2025MOCK',
    displayCount: 1440,
    matchProject: (project) => /2025/i.test(project.name || '') && /mock/i.test(project.name || ''),
  },
  '2024-practice': {
    id: '2024-practice',
    kind: 'practice',
    examYear: 2024,
    ppLabel: '2024PP',
    displayCount: 1000,
    matchProject: (project) => /2024/i.test(project.name || '') && /practice/i.test(project.name || ''),
  },
  '2024-mock': {
    id: '2024-mock',
    kind: 'mock',
    examYear: 2024,
    ppLabel: '2024MOCK',
    displayCount: 900,
    matchProject: (project) => /2024/i.test(project.name || '') && /mock/i.test(project.name || ''),
  },
  'past-mocks': {
    id: 'past-mocks',
    kind: 'past-mock',
    examYear: 2023,
    ppLabel: 'PAST',
    displayCount: null,
    matchProject: (project) => /历年|past mock/i.test(project.name || project.title || ''),
  },
}

export const LANREN_PACK_ORDER = [
  '2026-practice',
  '2026-mock',
  '2025-practice',
  '2025-mock',
  '2024-practice',
  '2024-mock',
  'past-mocks',
]

export function getLanrenPackConfig(packId) {
  const config = LANREN_PACKS[packId]
  if (!config) {
    throw new Error(`Unsupported Lanren pack "${packId}". Supported: ${LANREN_PACK_ORDER.join(', ')}`)
  }
  return config
}

export function matchPracticeCategory(categories, topic, packId) {
  const topicConfig = LANREN_TOPIC_CONFIG[topic]
  if (!topicConfig) return null

  const byName = categories.find((item) => topicConfig.matchCategory(item))
  if (byName) return byName

  if (packId === '2026-practice') {
    return categories.find((item) => Number(item.total) === topicConfig.expectedCount) || null
  }

  const index = LANREN_PRACTICE_PACK_TOPICS.indexOf(topic)
  if (index >= 0 && categories[index]) {
    return categories[index]
  }

  return null
}

export function inferTopicFromText(text) {
  const value = String(text || '')
  for (const [topic, config] of Object.entries(LANREN_TOPIC_CONFIG)) {
    if (config.matchCategory({ title: value, name: value })) {
      return topic
    }
  }
  if (/ethic/i.test(value)) return 'Ethics'
  if (/quant/i.test(value)) return 'Quantitative Methods'
  if (/econom/i.test(value)) return 'Economics'
  if (/financial statement|fsa/i.test(value)) return 'FSA'
  if (/corporate/i.test(value)) return 'Corporate Issuers'
  if (/equity/i.test(value)) return 'Equity Investments'
  if (/fixed income/i.test(value)) return 'Fixed Income'
  if (/deriv/i.test(value)) return 'Derivatives'
  if (/alternative/i.test(value)) return 'Alternative Investments'
  if (/portfolio/i.test(value)) return 'Portfolio Management'
  return 'Mock Exam'
}
