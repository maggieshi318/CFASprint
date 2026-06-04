export function decodeHtmlEntities(value) {
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

/** Convert Lanren HTML question content to readable plain text (keeps table rows). */
export function htmlToQuestionText(value) {
  let html = decodeHtmlEntities(String(value || ''))
  html = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/th>/gi, '\t')
    .replace(/<[^>]+>/g, '')

  return html
    .replace(/\t+/g, '\t')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

const STEM_IMAGES_MARKER = /<!--STEM_IMAGES:(\[[\s\S]*?\])-->/

/** Plain-text stem plus optional embedded image URLs from Lanren `<img>` tags. */
export function htmlToQuestionStem(value) {
  const images = []
  let html = decodeHtmlEntities(String(value || ''))
  html = html.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
    images.push(src)
    return '\n\n'
  })

  const text = htmlToQuestionText(html)
  if (images.length === 0) return text
  return `${text}\n<!--STEM_IMAGES:${JSON.stringify(images)}-->`
}

export function parseQuestionStem(stem) {
  const match = String(stem || '').match(STEM_IMAGES_MARKER)
  if (!match) {
    return { text: decodeHtmlEntities(stem || ''), images: [] }
  }
  const text = stem.slice(0, match.index).trim()
  let images = []
  try {
    images = JSON.parse(match[1])
  } catch {
    images = []
  }
  return { text: decodeHtmlEntities(text), images }
}

/** @deprecated use htmlToQuestionText */
export function stripHtml(value) {
  return htmlToQuestionText(value)
}
