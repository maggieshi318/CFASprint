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
const STEM_TABLE_MARKER = /<!--STEM_TABLE:(\{[\s\S]*?\})-->/g

export type QuestionStemBlock =
  | { type: 'text'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

function parseTablePayload(value: string): QuestionStemBlock | null {
  try {
    const table = JSON.parse(value) as { headers?: unknown; rows?: unknown }
    if (!Array.isArray(table.headers) || !Array.isArray(table.rows)) return null
    const headers = table.headers.map(String)
    const rows = table.rows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => row.map(String))
    if (headers.length === 0 || rows.length === 0) return null
    return { type: 'table', headers, rows }
  } catch {
    return null
  }
}

function parseStemBlocks(value: string): QuestionStemBlock[] {
  const blocks: QuestionStemBlock[] = []
  let cursor = 0
  for (const match of value.matchAll(STEM_TABLE_MARKER)) {
    const text = value.slice(cursor, match.index).trim()
    if (text) blocks.push({ type: 'text', text: decodeHtmlEntities(text) })
    const table = parseTablePayload(match[1])
    if (table) blocks.push(table)
    cursor = (match.index || 0) + match[0].length
  }
  const tail = value.slice(cursor).trim()
  if (tail) blocks.push({ type: 'text', text: decodeHtmlEntities(tail) })
  return blocks
}

export function parseQuestionStem(stem: string) {
  const match = String(stem || '').match(STEM_IMAGES_MARKER)
  if (!match) {
    const text = decodeHtmlEntities(String(stem || '').replace(STEM_TABLE_MARKER, '').trim())
    return { text, images: [] as string[], blocks: parseStemBlocks(stem || '') }
  }
  const text = stem.slice(0, match.index).trim()
  try {
    const images = JSON.parse(match[1]) as string[]
    return { text: decodeHtmlEntities(text.replace(STEM_TABLE_MARKER, '').trim()), images, blocks: parseStemBlocks(text) }
  } catch {
    return { text: decodeHtmlEntities(text.replace(STEM_TABLE_MARKER, '').trim()), images: [] as string[], blocks: parseStemBlocks(text) }
  }
}

export function formatQuestionStem(stem: string) {
  return parseQuestionStem(stem).text
}
