export function decodeHtmlEntities(value: string) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
}

const STEM_IMAGES_MARKER = /<!--STEM_IMAGES:(\[[\s\S]*?\])-->/

export function parseQuestionStem(stem: string) {
  const match = String(stem || '').match(STEM_IMAGES_MARKER)
  if (!match) {
    return { text: decodeHtmlEntities(stem || ''), images: [] as string[] }
  }
  const text = stem.slice(0, match.index).trim()
  try {
    const images = JSON.parse(match[1]) as string[]
    return { text: decodeHtmlEntities(text), images }
  } catch {
    return { text: decodeHtmlEntities(text), images: [] as string[] }
  }
}

export function formatQuestionStem(stem: string) {
  return parseQuestionStem(stem).text
}
