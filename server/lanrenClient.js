import CryptoJS from 'crypto-js'
import { htmlToQuestionStem, htmlToQuestionText } from './htmlText.js'
import {
  getLanrenPackConfig,
  inferTopicFromText,
  matchPracticeCategory,
} from './lanrenPacks.js'
import {
  categoryTag,
  packTag,
} from './tagUtils.js'
import {
  getLanrenTopicConfig,
  LANREN_PRACTICE_PACK_TOPICS,
} from './lanrenTopics.js'

export {
  getLanrenTopicConfig,
  LANREN_PRACTICE_PACK_TOPICS,
  LANREN_TOPIC_CONFIG,
} from './lanrenTopics.js'

const LANREN_BASE = 'https://lanrencfa.cn/api'
const LANREN_AES_KEY = 'lanrenshuatixiaozhushoucfa'

export { decodeHtmlEntities, htmlToQuestionText, stripHtml } from './htmlText.js'

export function decryptLanrenPayload(value) {
  if (value == null) return value
  if (typeof value !== 'string') return value
  if (!value.startsWith('U2FsdGVkX1')) return value

  const bytes = CryptoJS.AES.decrypt(value, LANREN_AES_KEY)
  const text = bytes.toString(CryptoJS.enc.Utf8)
  if (!text) {
    throw new Error('Failed to decrypt Lanren API payload')
  }
  return JSON.parse(text)
}

function unwrapLanrenData(payload) {
  const raw = payload?.data ?? payload
  return decryptLanrenPayload(raw)
}

function authHeaders({ token, authorization, language = 'en' }) {
  const headers = { 'Content-Type': 'application/json', 'x-language': language }
  if (token) headers['x-auth-token'] = token
  if (authorization) headers['x-authorization'] = authorization
  return headers
}

export async function lanrenPost(path, body, auth, { retries = 3, retryDelayMs = 1500 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${LANREN_BASE}${path}`, {
        method: 'POST',
        headers: authHeaders(auth),
        body: JSON.stringify(body ?? {}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.code === 401) {
        throw new Error(payload.msg || payload.message || `Lanren API failed (${response.status})`)
      }
      if (payload.code && payload.code !== 0 && payload.code !== 200 && payload.data == null) {
        throw new Error(payload.msg || `Lanren API error code ${payload.code}`)
      }
      return unwrapLanrenData(payload)
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
      }
    }
  }
  throw lastError
}

function normalizeAnswer(raw, options) {
  if (raw == null) return 'A'
  const text = String(raw).trim()
  if (/^[ABC]$/i.test(text)) return text.toUpperCase()
  if (/^[123]$/.test(text)) return ['A', 'B', 'C'][Number(text) - 1] || 'A'

  const lower = text.toLowerCase()
  for (let i = 0; i < options.length; i += 1) {
    if (options[i] && options[i].toLowerCase() === lower) {
      return ['A', 'B', 'C'][i]
    }
  }
  return 'A'
}

function readOptions(question) {
  let rawOptions = question.options

  if (typeof rawOptions === 'string') {
    try {
      rawOptions = JSON.parse(rawOptions)
    } catch {
      rawOptions = null
    }
  }

  if (Array.isArray(rawOptions) && rawOptions.length >= 3) {
    return rawOptions.slice(0, 3).map((item) => htmlToQuestionText(typeof item === 'string' ? item : item.content || item.text || item.label || item))
  }
  if (Array.isArray(question.optionList) && question.optionList.length >= 3) {
    return question.optionList.slice(0, 3).map((item) => htmlToQuestionText(item.content || item.text || item.label || item))
  }
  return [
    htmlToQuestionText(question.optionA || question.a || question.choiceA),
    htmlToQuestionText(question.optionB || question.b || question.choiceB),
    htmlToQuestionText(question.optionC || question.c || question.choiceC),
  ]
}

function stripPackPrefix(value, ppLabel) {
  const escaped = ppLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String(value || '')
    .replace(new RegExp(`^[（(]${escaped}[）)]\\s*`, 'i'), '')
    .replace(/^[（(][^）)]+[）)]\s*/i, '')
    .trim()
}

function resolvePracticeLos(moduleName, packConfig, categoryLabel, topic) {
  const stripped = stripPackPrefix(moduleName, packConfig.ppLabel)
  if (
    !moduleName ||
    !stripped ||
    stripped === packConfig.ppLabel ||
    /^20\d{2}PP$/i.test(stripped)
  ) {
    return categoryLabel || topic
  }
  return stripped
}

export function mapLanrenQuestion(question, context, sortOrder = 0) {
  const { packConfig, topicConfig = null, category = null } = context
  const options = readOptions(question)
  const answer = normalizeAnswer(question.answer ?? question.correctAnswer ?? question.correct, options)
  const categoryLabel = htmlToQuestionText(category?.title || category?.name || '')
  const moduleName = htmlToQuestionText(question.moduleName || question.module || question.los || '')

  let topic = topicConfig?.topic
  let los = ''

  if (packConfig.kind === 'practice') {
    topic = topicConfig.topic
    los = resolvePracticeLos(moduleName, packConfig, categoryLabel, topic)
  } else {
    topic = moduleName ? inferTopicFromText(moduleName) : 'Mock Exam'
    if (topic === 'Ethics' && !/ethic|professional standards/i.test(moduleName)) {
      topic = 'Mock Exam'
    }
    los = categoryLabel || 'Mock Exam'
  }

  const tagParts = [
    packTag(packConfig.id),
    category ? categoryTag(category.id) : null,
    topicConfig?.tagSlug || null,
    'lanrencfa-import',
    packConfig.kind === 'practice' ? 'practice-pack' : 'mock-exam',
  ].filter(Boolean)

  return {
    topic,
    los,
    sortOrder: sortOrder || Number(question.sort || question.sortOrder || question.index || 0),
    examYear: Number(question.examYear || question.year || packConfig.examYear),
    tags: tagParts.join('|'),
    difficulty: question.difficulty && ['Easy', 'Medium', 'Hard'].includes(question.difficulty) ? question.difficulty : 'Medium',
    stem: htmlToQuestionStem(
      question.title || question.content || question.stem || question.question,
    ),
    optionA: options[0] || 'Option A',
    optionB: options[1] || 'Option B',
    optionC: options[2] || 'Option C',
    answer,
    explanation: normalizeAnalysisText(
      question.analysis || question.explanation || question.parse || question.answerAnalysis || 'Imported from Lanren CFA bank.',
    ),
  }
}

function normalizeAnalysisText(value) {
  return htmlToQuestionText(value)
    .replace(/\b([ABC])\s+is\s+(Correct|Incorrect)\b/gi, '$1.$2')
    .replace(/\b([ABC])\s*[.，、,]\s*(Correct|Incorrect)\b/gi, '$1.$2')
}

export async function loadLanrenProject(auth, packId, { groupId = 1 } = {}) {
  const packConfig = getLanrenPackConfig(packId)
  const projects = await lanrenPost('/v2/project', { groupId: Number(groupId) }, auth)
  const projectList = Array.isArray(projects) ? projects : projects?.list || []
  const project = projectList.find((item) => packConfig.matchProject(item))

  if (!project) {
    throw new Error(`Could not find Lanren project for pack "${packId}"`)
  }

  return {
    packConfig,
    project,
    categories: project.category || project.categories || [],
  }
}

/** @deprecated use loadLanrenProject(auth, '2026-practice') */
export async function loadLanrenPracticeProject(auth, options = {}) {
  return loadLanrenProject(auth, '2026-practice', options)
}

async function fetchLanrenCategoryQuestions(auth, { groupId, project, category, packConfig, topicConfig = null }) {
  const payload = await lanrenPost(
    '/v2/questions',
    {
      groupId: Number(groupId),
      projectId: Number(project.projectId || project.id),
      categoryId: Number(category.id),
    },
    auth,
  )

  const rawQuestions = payload?.questions || payload?.questionList || payload?.list || []
  const context = { packConfig, topicConfig, category }
  const mapped = rawQuestions.map((item, index) => mapLanrenQuestion(item, context, index + 1))

  if (mapped.length === 0) {
    const label = category.title || category.name || category.id
    throw new Error(`Lanren returned zero questions for ${label}`)
  }

  return {
    project,
    category,
    questions: mapped,
  }
}

export async function fetchLanrenPackTopicQuestions(
  auth,
  {
    packId = '2026-practice',
    groupId = 1,
    topic = 'Quantitative Methods',
    project = null,
    categories = null,
  } = {},
) {
  const packConfig = getLanrenPackConfig(packId)
  if (packConfig.kind !== 'practice') {
    throw new Error(`Pack "${packId}" is not a practice pack`)
  }

  const topicConfig = getLanrenTopicConfig(topic)
  let resolvedProject = project
  let categoryList = categories
  if (!resolvedProject || !categoryList) {
    const context = await loadLanrenProject(auth, packId, { groupId })
    resolvedProject = context.project
    categoryList = context.categories
  }

  const category = matchPracticeCategory(categoryList, topic, packId)
  if (!category) {
    throw new Error(`Could not find ${topicConfig.topic} category in Lanren project "${packId}"`)
  }

  return fetchLanrenCategoryQuestions(auth, {
    groupId,
    project: resolvedProject,
    category,
    packConfig,
    topicConfig,
  })
}

export async function fetchLanrenPackCategoryQuestions(
  auth,
  {
    packId,
    groupId = 1,
    categoryId,
    project = null,
    categories = null,
  } = {},
) {
  const packConfig = getLanrenPackConfig(packId)
  if (packConfig.kind === 'practice') {
    throw new Error(`Pack "${packId}" is a practice pack — use fetchLanrenPackTopicQuestions`)
  }

  let resolvedProject = project
  let categoryList = categories
  if (!resolvedProject || !categoryList) {
    const context = await loadLanrenProject(auth, packId, { groupId })
    resolvedProject = context.project
    categoryList = context.categories
  }

  const category = categoryList.find((item) => String(item.id) === String(categoryId))
  if (!category) {
    throw new Error(`Could not find category ${categoryId} in Lanren project "${packId}"`)
  }

  return fetchLanrenCategoryQuestions(auth, {
    groupId,
    project: resolvedProject,
    category,
    packConfig,
  })
}

/** @deprecated use fetchLanrenPackTopicQuestions */
export async function fetchLanrenTopicQuestions(auth, options = {}) {
  return fetchLanrenPackTopicQuestions(auth, { ...options, packId: options.packId || '2026-practice' })
}

export async function fetchLanrenQmQuestions(auth, options = {}) {
  return fetchLanrenPackTopicQuestions(auth, { ...options, topic: 'Quantitative Methods' })
}

export async function fetchLanrenEconomicsQuestions(auth, options = {}) {
  return fetchLanrenPackTopicQuestions(auth, { ...options, topic: 'Economics' })
}
