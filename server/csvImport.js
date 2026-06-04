export function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function parseCsvText(csvText) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function escapeCsvValue(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const CSV_HEADERS = [
  'topic',
  'los',
  'exam_year',
  'tags',
  'difficulty',
  'stem',
  'option_a',
  'option_b',
  'option_c',
  'answer',
  'explanation',
]

export function buildCsvTemplate() {
  const sample = [
    'Ethics',
    'I.A',
    '2026',
    'ethics|misconduct',
    'Easy',
    'Sample question stem goes here?',
    'Wrong option A',
    'Correct option B',
    'Wrong option C',
    'B',
    'Sample explanation for the correct answer.',
  ].map(escapeCsvValue)

  return `${CSV_HEADERS.join(',')}\n${sample.join(',')}\n`
}

export function importQuestionsFromCsv(db, csvText, serializeQuestion) {
  const lines = parseCsvText(csvText)
  if (lines.length <= 1) {
    throw new Error('CSV must contain header and rows')
  }

  const header = parseCsvLine(lines[0]).map((item) => item.toLowerCase())
  const expected = CSV_HEADERS
  const headerOk = expected.every((col, index) => header[index] === col)
  if (!headerOk) {
    throw new Error(`CSV header must be: ${expected.join(',')}`)
  }

  const insert = db.prepare(
    `
    INSERT INTO questions (id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  )

  const errors = []
  let importedCount = 0

  const tx = db.transaction(() => {
    lines.slice(1).forEach((line, index) => {
      const parts = parseCsvLine(line)
      if (parts.length < 11) {
        errors.push({ line: index + 2, reason: 'Expected 11 columns' })
        return
      }

      const [
        topic,
        los,
        examYearRaw,
        tagsRaw,
        difficulty,
        stem,
        optionA,
        optionB,
        optionC,
        answer,
        explanation,
      ] = parts

      if (!topic || !los || !examYearRaw || !difficulty || !stem || !optionA || !optionB || !optionC) {
        errors.push({ line: index + 2, reason: 'Missing required fields' })
        return
      }
      if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
        errors.push({ line: index + 2, reason: 'Difficulty must be Easy, Medium, or Hard' })
        return
      }
      if (!['A', 'B', 'C'].includes(answer)) {
        errors.push({ line: index + 2, reason: 'Answer must be A/B/C' })
        return
      }

      const nextId = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM questions').get().nextId || 1
      insert.run(
        nextId,
        topic,
        los,
        Number(examYearRaw) || 2026,
        JSON.stringify(
          (tagsRaw || '')
            .split('|')
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
        difficulty,
        stem,
        optionA,
        optionB,
        optionC,
        answer,
        explanation || 'Imported from CSV.',
      )
      importedCount += 1
    })
  })
  tx()

  const updatedQuestions = db
    .prepare(
      'SELECT id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation FROM questions ORDER BY id ASC',
    )
    .all()
    .map((row) => serializeQuestion(row))

  return { imported: importedCount, errors, questions: updatedQuestions }
}

export function exportQuestionsToCsv(db) {
  const rows = db
    .prepare(
      'SELECT topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation FROM questions ORDER BY id ASC',
    )
    .all()

  const lines = [CSV_HEADERS.join(',')]
  for (const row of rows) {
    const tags = JSON.parse(row.tags || '[]').join('|')
    lines.push(
      [
        row.topic,
        row.los,
        row.exam_year,
        tags,
        row.difficulty,
        row.stem,
        row.option_a,
        row.option_b,
        row.option_c,
        row.answer,
        row.explanation,
      ]
        .map(escapeCsvValue)
        .join(','),
    )
  }
  return `${lines.join('\n')}\n`
}
