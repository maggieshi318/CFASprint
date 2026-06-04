export function parseQuestionTags(tags) {
  if (Array.isArray(tags)) return tags.map(String)
  if (typeof tags === 'string') {
    if (tags.startsWith('[')) {
      try {
        return JSON.parse(tags).map(String)
      } catch {
        return []
      }
    }
    return tags
      .split('|')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return []
}

export function packTag(packId) {
  return `pack:${packId}`
}

export function categoryTag(categoryId) {
  return `category:${categoryId}`
}

export function questionHasPack(tags, packId) {
  return parseQuestionTags(tags).includes(packTag(packId))
}

export function extractCategoryId(tags) {
  const match = parseQuestionTags(tags).find((tag) => tag.startsWith('category:'))
  return match ? match.slice('category:'.length) : null
}

export function extractPackId(tags) {
  const match = parseQuestionTags(tags).find((tag) => tag.startsWith('pack:'))
  return match ? match.slice('pack:'.length) : null
}

export function normalizeTags(tags) {
  if (Array.isArray(tags)) return JSON.stringify(tags)
  if (typeof tags === 'string' && tags.startsWith('[')) return tags
  return JSON.stringify(
    String(tags || '')
      .split('|')
      .map((tag) => tag.trim())
      .filter(Boolean),
  )
}
