import { parseQuestionStem } from './htmlText.js'

const AI_TUTOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'coreConcept',
    'whyCorrect',
    'whySelectedWrong',
    'examTrap',
    'similarPracticeQuestion',
    'reviewPrompt',
  ],
  properties: {
    summary: { type: 'string' },
    coreConcept: { type: 'string' },
    whyCorrect: { type: 'string' },
    whySelectedWrong: { type: 'string' },
    examTrap: { type: 'string' },
    similarPracticeQuestion: {
      type: 'object',
      additionalProperties: false,
      required: ['stem', 'options', 'answer', 'explanation'],
      properties: {
        stem: { type: 'string' },
        options: {
          type: 'object',
          additionalProperties: false,
          required: ['A', 'B', 'C'],
          properties: {
            A: { type: 'string' },
            B: { type: 'string' },
            C: { type: 'string' },
          },
        },
        answer: { type: 'string', enum: ['A', 'B', 'C'] },
        explanation: { type: 'string' },
      },
    },
    reviewPrompt: { type: 'string' },
  },
}

const AI_NOTES_SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['topics', 'overallReviewPlan'],
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['topic', 'knowledgePoints', 'commonMistakes', 'keyFormulas', 'memoryHooks', 'relatedQuestionIds', 'reviewActions'],
        properties: {
          topic: { type: 'string' },
          knowledgePoints: { type: 'array', items: { type: 'string' } },
          commonMistakes: { type: 'array', items: { type: 'string' } },
          keyFormulas: { type: 'array', items: { type: 'string' } },
          memoryHooks: { type: 'array', items: { type: 'string' } },
          relatedQuestionIds: { type: 'array', items: { type: 'number' } },
          reviewActions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    overallReviewPlan: { type: 'array', items: { type: 'string' } },
  },
}

function truncate(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function questionText(question) {
  const stem = parseQuestionStem(question.stem || '').text
  return [
    `Question ID: ${question.id}`,
    `Topic: ${question.topic}`,
    `LOS: ${question.los || 'Not specified'}`,
    `Difficulty: ${question.difficulty || 'Not specified'}`,
    `Stem: ${truncate(stem, 1800)}`,
    `A. ${truncate(question.option_a, 600)}`,
    `B. ${truncate(question.option_b, 600)}`,
    `C. ${truncate(question.option_c, 600)}`,
    `Correct answer: ${question.answer}`,
    `Existing explanation: ${truncate(question.explanation, 1800)}`,
  ].join('\n')
}

function tutorOutputContract() {
  return [
    'Return one valid JSON object only. Do not include markdown fences or extra commentary.',
    'The JSON object must contain these keys:',
    'summary, coreConcept, whyCorrect, whySelectedWrong, examTrap, similarPracticeQuestion, reviewPrompt.',
    'similarPracticeQuestion must contain stem, options, answer, and explanation.',
    'similarPracticeQuestion.options must contain A, B, and C. answer must be A, B, or C.',
  ].join('\n')
}

function notesOutputContract() {
  return [
    'Return one valid JSON object only. Do not include markdown fences or extra commentary.',
    'The JSON object must contain topics and overallReviewPlan.',
    'Each topic item must contain topic, knowledgePoints, commonMistakes, keyFormulas, memoryHooks, relatedQuestionIds, and reviewActions.',
    'Group notes under CFA Level I major topics. If a note topic is unclear, infer the best CFA Level I topic from the note text.',
    'Do not invent formulas when the notes do not support one; return an empty keyFormulas array for that topic instead.',
  ].join('\n')
}

function tutorInstructions() {
  return [
    'You are CFA Sprint AI Tutor for CFA Level I candidates.',
    'Explain the underlying concept in clear exam-prep language.',
    'Use only the provided question context. If uncertain, say what assumption you are making.',
    'Do not reproduce or distribute real CFA exam questions, leaked exam content, or paid question-bank originals.',
    'If the user asks about real exam content, explain the concept and create an original substitute practice question instead.',
    'Return concise English suitable for an international CFA Level I candidate.',
  ].join('\n')
}

function notesSummaryInstructions() {
  return [
    'You are CFA Sprint AI Tutor summarizing CFA Level I study notes.',
    'Turn a candidate\'s saved question notes into a structured study report.',
    'Organize by CFA Level I major topic, then extract knowledge points, formulas, common mistakes, memory hooks, and review actions.',
    'Use concise exam-prep language. Preserve uncertainty instead of inventing unsupported facts.',
    'Do not reproduce or distribute real CFA exam questions, leaked exam content, or paid question-bank originals.',
  ].join('\n')
}

function tutorInput({ question, selected, userQuestion }) {
  return [
    questionText(question),
    `Selected answer: ${selected}`,
    `Student question: ${truncate(userQuestion, 500) || 'Explain why the answer is correct and why my choice is wrong.'}`,
  ].join('\n\n')
}

function notesSummaryInput(notes) {
  return notes
    .slice(0, 80)
    .map((note, index) =>
      [
        `Note ${index + 1}`,
        `Question #${Number(note.questionId) || 0}`,
        `Topic: ${truncate(note.topic, 120) || 'Unknown'}`,
        `Session: ${truncate(note.session, 160) || 'Not specified'}`,
        `Text: ${truncate(note.text, 1000)}`,
      ].join('\n'),
    )
    .join('\n\n')
}

export function buildAiTutorRequest({ model, question, selected, userQuestion = '' }) {
  return {
    model,
    max_output_tokens: 900,
    instructions: tutorInstructions(),
    input: tutorInput({ question, selected, userQuestion }),
    text: {
      format: {
        type: 'json_schema',
        name: 'cfa_tutor_explanation',
        strict: true,
        schema: AI_TUTOR_SCHEMA,
      },
    },
  }
}

export function buildAiNotesSummaryRequest({ model, notes }) {
  return {
    model,
    max_output_tokens: 1800,
    instructions: notesSummaryInstructions(),
    input: notesSummaryInput(notes),
    text: {
      format: {
        type: 'json_schema',
        name: 'cfa_notes_study_report',
        strict: true,
        schema: AI_NOTES_SUMMARY_SCHEMA,
      },
    },
  }
}

export function buildDeepSeekTutorRequest({ model, question, selected, userQuestion = '' }) {
  return {
    model,
    temperature: 0.2,
    max_tokens: 900,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${tutorInstructions()}\n\n${tutorOutputContract()}`,
      },
      {
        role: 'user',
        content: tutorInput({ question, selected, userQuestion }),
      },
    ],
  }
}

export function buildDeepSeekNotesSummaryRequest({ model, notes }) {
  return {
    model,
    temperature: 0.2,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${notesSummaryInstructions()}\n\n${notesOutputContract()}`,
      },
      {
        role: 'user',
        content: notesSummaryInput(notes),
      },
    ],
  }
}

export function parseAiTutorResponse(body) {
  if (typeof body?.output_text === 'string') return JSON.parse(body.output_text)

  const text = body?.output
    ?.flatMap((item) => item?.content || [])
    ?.find((content) => content?.type === 'output_text' && typeof content?.text === 'string')
    ?.text

  if (!text) {
    throw new Error('AI response did not include output text')
  }
  return JSON.parse(text)
}

export function parseDeepSeekTutorResponse(body) {
  const text = body?.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('DeepSeek response did not include message content')
  }
  return JSON.parse(text)
}

export function getAiTutorProviderConfig(config) {
  const providerName = String(config.aiProvider || 'openai').trim().toLowerCase()
  if (providerName === 'deepseek') {
    return {
      name: 'deepseek',
      apiKey: config.deepseekApiKey,
      model: config.deepseekModel,
      baseUrl: String(config.deepseekBaseUrl || 'https://api.deepseek.com').replace(/\/$/, ''),
    }
  }
  return {
    name: 'openai',
    apiKey: config.openaiApiKey,
    model: config.openaiModel,
    baseUrl: 'https://api.openai.com/v1',
  }
}

async function requestOpenAiTutorExplanation({ apiKey, model, question, selected, userQuestion, baseUrl }) {
  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildAiTutorRequest({ model, question, selected, userQuestion })),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error?.message || 'OpenAI request failed')
  }
  return parseAiTutorResponse(body)
}

async function requestOpenAiNotesSummary({ apiKey, model, notes, baseUrl }) {
  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildAiNotesSummaryRequest({ model, notes })),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error?.message || 'OpenAI request failed')
  }
  return parseAiTutorResponse(body)
}

async function requestDeepSeekTutorExplanation({ apiKey, model, question, selected, userQuestion, baseUrl }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildDeepSeekTutorRequest({ model, question, selected, userQuestion })),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error?.message || 'DeepSeek request failed')
  }
  return parseDeepSeekTutorResponse(body)
}

async function requestDeepSeekNotesSummary({ apiKey, model, notes, baseUrl }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildDeepSeekNotesSummaryRequest({ model, notes })),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error?.message || 'DeepSeek request failed')
  }
  return parseDeepSeekTutorResponse(body)
}

export async function requestAiTutorExplanation({ provider, question, selected, userQuestion }) {
  if (provider.name === 'deepseek') {
    return requestDeepSeekTutorExplanation({
      apiKey: provider.apiKey,
      model: provider.model,
      baseUrl: provider.baseUrl,
      question,
      selected,
      userQuestion,
    })
  }

  return requestOpenAiTutorExplanation({
    apiKey: provider.apiKey,
    model: provider.model,
    baseUrl: provider.baseUrl,
    question,
    selected,
    userQuestion,
  })
}

export async function requestAiNotesSummary({ provider, notes }) {
  if (provider.name === 'deepseek') {
    return requestDeepSeekNotesSummary({
      apiKey: provider.apiKey,
      model: provider.model,
      baseUrl: provider.baseUrl,
      notes,
    })
  }

  return requestOpenAiNotesSummary({
    apiKey: provider.apiKey,
    model: provider.model,
    baseUrl: provider.baseUrl,
    notes,
  })
}
