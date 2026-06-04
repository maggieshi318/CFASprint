import type { Answer } from '../types'

export type OptionExplanationPart = {
  verdict: 'Correct' | 'Incorrect' | null
  body: string
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeOptionMarkers(value: string) {
  return value
    .replace(/\b(Incorrrect|Incorrec\s+t)\b/gi, 'Incorrect')
    .replace(/\b([ABC])\s+is\s+(Correct|Incorrect)\b/gi, '$1. $2')
    .replace(/\b([ABC])\s*(?:[.,:;，。、-]\s*)?(?:Based on your answer\s+)?(Correct|Incorrect)\b/gi, '$1. $2')
    .replace(/\s+/g, ' ')
    .trim()
}

const OPTION_VERDICT_MARKER = /\b([ABC])\.\s*(Correct|Incorrect)\s*/gi

export function parseOptionExplanations(explanation: string): Partial<Record<Answer, OptionExplanationPart>> {
  const clean = normalizeOptionMarkers(stripHtml(explanation))
  const markers = [...clean.matchAll(OPTION_VERDICT_MARKER)]
  if (markers.length < 2) return {}

  const result: Partial<Record<Answer, OptionExplanationPart>> = {}
  for (let i = 0; i < markers.length; i += 1) {
    const letter = markers[i][1].toUpperCase() as Answer
    if (!['A', 'B', 'C'].includes(letter)) continue

    const verdict = markers[i][2]?.toLowerCase()
    const start = (markers[i].index ?? 0) + markers[i][0].length
    const end = i + 1 < markers.length ? (markers[i + 1].index ?? clean.length) : clean.length
    const body = clean.slice(start, end).trim()
    if (!body) continue

    const part: OptionExplanationPart = {
      verdict: verdict === 'correct' ? 'Correct' : verdict === 'incorrect' ? 'Incorrect' : null,
      body,
    }

    if (result[letter]) {
      result[letter] = {
        verdict: result[letter]!.verdict || part.verdict,
        body: `${result[letter]!.body} ${part.body}`.replace(/\s+/g, ' ').trim(),
      }
    } else {
      result[letter] = part
    }
  }

  return result
}

export function buildOptionExplanations(
  explanation: string,
  correctAnswer: Answer,
): Record<Answer, OptionExplanationPart> {
  const parsed = parseOptionExplanations(explanation)
  const letters: Answer[] = ['A', 'B', 'C']

  return letters.reduce(
    (acc, letter) => {
      if (parsed[letter]) {
        acc[letter] = parsed[letter]!
        return acc
      }

      if (letter === correctAnswer) {
        acc[letter] = {
          verdict: 'Correct',
          body: explanation.trim() || 'This is the correct answer.',
        }
      } else {
        acc[letter] = {
          verdict: 'Incorrect',
          body: 'This option is incorrect.',
        }
      }
      return acc
    },
    {} as Record<Answer, OptionExplanationPart>,
  )
}

function formatOptionSegment(letter: Answer, part: OptionExplanationPart) {
  const verdict = part.verdict || 'Incorrect'
  const body = part.body.trim()
  return `${letter}. ${verdict}${body ? ` ${body}` : ''}`.replace(/\s+/g, ' ').trim()
}

export function formatLanrenAnalysisLines(explanation: string, correctAnswer: Answer): string[] {
  const cleaned = normalizeOptionMarkers(stripHtml(explanation)).trim()
  const parsed = parseOptionExplanations(explanation)
  const letters: Answer[] = ['A', 'B', 'C']
  const segments = letters
    .map((letter) => {
      const part = parsed[letter]
      if (!part?.body) return null
      return formatOptionSegment(letter, {
        verdict: part.verdict || (letter === correctAnswer ? 'Correct' : 'Incorrect'),
        body: part.body,
      })
    })
    .filter(Boolean) as string[]

  if (segments.length >= 2) return segments
  if (cleaned) return [cleaned]
  return [buildOptionExplanations(explanation, correctAnswer).A.body]
}

export function formatLanrenAnalysisText(explanation: string, correctAnswer: Answer): string {
  return formatLanrenAnalysisLines(explanation, correctAnswer).join('\n')
}
