import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAiTutorRequest,
  buildAiNotesSummaryRequest,
  buildDeepSeekTutorRequest,
  buildDeepSeekNotesSummaryRequest,
  getAiTutorHealth,
  getAiTutorProviderConfig,
  normalizeAiNotesStudyReport,
  parseDeepSeekTutorResponse,
} from './aiTutor.js'

const question = {
  id: 42,
  topic: 'FSA',
  los: 'Reading 10',
  difficulty: 'Medium',
  stem: 'A company capitalizes an expense. Which ratio is most likely overstated in the current period?',
  option_a: 'Asset turnover',
  option_b: 'Return on assets',
  option_c: 'Debt-to-assets',
  answer: 'B',
  explanation: 'Capitalizing expenses increases assets and profit in the current period.',
}

test('builds a structured CFA tutor request with question context', () => {
  const request = buildAiTutorRequest({
    model: 'test-model',
    question,
    selected: 'A',
    userQuestion: 'Why is B correct?',
  })

  assert.equal(request.model, 'test-model')
  assert.match(request.instructions, /CFA Level I/)
  assert.match(request.instructions, /do not reproduce or distribute real CFA exam questions/i)
  assert.match(request.input, /Selected answer: A/)
  assert.match(request.input, /Correct answer: B/)
  assert.match(request.input, /Why is B correct\?/)
  assert.equal(request.text.format.type, 'json_schema')
  assert.equal(request.text.format.strict, true)
})

test('truncates long free-form user questions before sending to the model', () => {
  const request = buildAiTutorRequest({
    model: 'test-model',
    question,
    selected: 'A',
    userQuestion: 'x'.repeat(1200),
  })

  const studentQuestion = request.input.split('Student question: ')[1]
  assert.equal(studentQuestion.length, 500)
})

test('builds a DeepSeek chat completion request with JSON instructions', () => {
  const request = buildDeepSeekTutorRequest({
    model: 'deepseek-chat',
    question,
    selected: 'C',
    userQuestion: 'Explain this with a quick rule.',
  })

  assert.equal(request.model, 'deepseek-chat')
  assert.equal(request.response_format.type, 'json_object')
  assert.equal(request.messages[0].role, 'system')
  assert.match(request.messages[0].content, /valid JSON object/)
  assert.match(request.messages[0].content, /do not reproduce or distribute real CFA exam questions/i)
  assert.equal(request.messages[1].role, 'user')
  assert.match(request.messages[1].content, /Selected answer: C/)
  assert.match(request.messages[1].content, /Explain this with a quick rule\./)
})

test('parses a DeepSeek JSON response from chat completions', () => {
  const parsed = parseDeepSeekTutorResponse({
    choices: [
      {
        message: {
          content: JSON.stringify({
            summary: 'Capitalizing expenses changes current-period profit.',
            coreConcept: 'Expense capitalization',
            whyCorrect: 'Profit is higher in the current period.',
            whySelectedWrong: 'The selected ratio moves the other way.',
            examTrap: 'Mixing balance sheet and income statement effects.',
            similarPracticeQuestion: {
              stem: 'Which metric increases when an expense is capitalized?',
              options: { A: 'Current profit', B: 'Current expense', C: 'Asset turnover' },
              answer: 'A',
              explanation: 'Capitalization defers expense recognition.',
            },
            reviewPrompt: 'State the first-year effect on assets and profit.',
          }),
        },
      },
    ],
  })

  assert.equal(parsed.similarPracticeQuestion.answer, 'A')
})

test('selects DeepSeek provider config when requested', () => {
  const provider = getAiTutorProviderConfig({
    aiProvider: 'deepseek',
    openaiApiKey: '',
    openaiModel: 'gpt-test',
    deepseekApiKey: 'test-key',
    deepseekModel: 'deepseek-chat',
    deepseekBaseUrl: 'https://api.deepseek.com',
  })

  assert.equal(provider.name, 'deepseek')
  assert.equal(provider.apiKey, 'test-key')
  assert.equal(provider.model, 'deepseek-chat')
  assert.equal(provider.baseUrl, 'https://api.deepseek.com')
})

test('reports AI Tutor configured state without exposing provider keys', () => {
  assert.deepEqual(
    getAiTutorHealth({
      aiProvider: 'openai',
      openaiApiKey: '',
      deepseekApiKey: '',
    }),
    { provider: 'openai', configured: false },
  )

  assert.deepEqual(
    getAiTutorHealth({
      aiProvider: 'deepseek',
      openaiApiKey: '',
      deepseekApiKey: 'secret-value',
    }),
    { provider: 'deepseek', configured: true },
  )
})

test('builds a structured notes summary request grouped by CFA topic', () => {
  const request = buildAiNotesSummaryRequest({
    model: 'test-model',
    notes: [
      {
        questionId: 42,
        topic: 'FSA',
        session: 'Financial Statement Analysis',
        text: 'Capitalized expenses increase current assets and profit.',
      },
      {
        questionId: 77,
        topic: 'Fixed Income',
        session: 'Fixed Income',
        text: 'Duration estimates price sensitivity to yield changes.',
      },
    ],
  })

  assert.equal(request.model, 'test-model')
  assert.match(request.instructions, /CFA Level I study notes/i)
  assert.match(request.input, /Question #42/)
  assert.match(request.input, /Capitalized expenses/)
  assert.equal(request.text.format.type, 'json_schema')
  assert.equal(request.text.format.strict, true)
  assert.deepEqual(request.text.format.schema.required, ['topics', 'overallReviewPlan'])
})

test('builds a DeepSeek notes summary request that asks for valid JSON', () => {
  const request = buildDeepSeekNotesSummaryRequest({
    model: 'deepseek-chat',
    notes: [
      {
        questionId: 42,
        topic: 'FSA',
        text: 'Inventory write-downs reduce assets and profit.',
      },
    ],
  })

  assert.equal(request.response_format.type, 'json_object')
  assert.match(request.messages[0].content, /valid JSON object/i)
  assert.match(request.messages[0].content, /topics/)
  assert.match(request.messages[1].content, /Inventory write-downs/)
})

test('normalizes notes study report plans returned as a string', () => {
  const report = normalizeAiNotesStudyReport({
    topics: [
      {
        topic: 'FSA',
        knowledgePoints: ['Auditor opinions include unqualified, qualified, adverse, and disclaimer.'],
        commonMistakes: ['Confusing qualified and adverse opinions.'],
        keyFormulas: [],
        memoryHooks: ['UQAD'],
        relatedQuestionIds: [42],
        reviewActions: ['Review opinion examples.'],
      },
    ],
    overallReviewPlan: 'Review FSA auditor opinions, then redo related questions.',
  })

  assert.deepEqual(report.overallReviewPlan, ['Review FSA auditor opinions, then redo related questions.'])
})
