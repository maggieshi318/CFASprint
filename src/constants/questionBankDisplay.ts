/** Display metadata matching lanrencfa question bank UI */
export const TOPIC_LABELS: Record<string, string> = {
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

export const TOPIC_DISPLAY_COUNTS: Record<string, number> = {
  'Quantitative Methods': 79,
  Economics: 75,
  FSA: 126,
  'Corporate Issuers': 75,
  'Equity Investments': 140,
  'Fixed Income': 112,
  Derivatives: 75,
  'Alternative Investments': 70,
  'Portfolio Management': 100,
  Ethics: 148,
}

export function topicDisplayName(topic: string) {
  return TOPIC_LABELS[topic] || topic
}

export function topicDisplayCount(topic: string, fallback = 0) {
  return TOPIC_DISPLAY_COUNTS[topic] ?? fallback
}

export const PACK_BOOKMARK_LABELS: Record<string, string> = {
  '2026-practice': '2026 PP',
  '2026-mock': '2026 MOCK',
  '2025-practice': '2025 PP',
  '2025-mock': '2025 MOCK',
  '2024-practice': '2024 PP',
  '2024-mock': '2024 MOCK',
  'past-mocks': 'Past Mock',
}

export function packBookmarkLabel(packId: string) {
  return PACK_BOOKMARK_LABELS[packId] || packId
}

export function bookmarkGroupTitle(packId: string, topic: string) {
  return `(${packBookmarkLabel(packId)}) ${topicDisplayName(topic)}`
}
