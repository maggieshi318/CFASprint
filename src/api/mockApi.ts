import { apiRequest, getApiBase } from './client'
import type { Answer, MockSession, PricingPlan, Question, User } from '../types'

export type TopicPerformance = {
  topic: string
  label?: string
  total: number
  completed: number
  accuracy: number
  progressPct?: number
}

export type StatsPackSummary = {
  id: string
  title: string
  questionCount: number
  completed: number
  correct: number
  wrong: number
  accuracy: number
  progressPct: number
}

export type StatsExamSummary = {
  date: string | null
  daysRemaining: number | null
}

export type WeakArea = {
  topic: string
  accuracy: number
  completed: number
}

export type StatsResponse = {
  totalQuestions: number
  completed: number
  correct: number
  wrong: number
  accuracy: number
  studyStreak: number
  topicPerformance: TopicPerformance[]
  weakAreas: WeakArea[]
  pack: StatsPackSummary
  exam: StatsExamSummary
}

export type MockHistoryItem = {
  id: number
  score: number
  total: number
  accuracy: number
  durationMinutes: number
  startedAt: string
  submittedAt: string
}

export type CsvImportError = {
  line: number
  reason: string
}

export type CourseItem = {
  id: string
  title: string
  subtitle: string
  plan: string
  planName: string
  isPremium: boolean
  expiresAt: string | null
  studyPath: string
  bankPath: string
  bankLabel: string
  bankSize: number
  totalBankSize: number
}

export type OrderItem = {
  id: number
  planId: string
  planName: string
  amount: string
  status: string
  createdAt: string
  expiresAt: string | null
}

export type UserMessage = {
  id: number
  subject: string
  body: string
  status: string
  adminReply: string | null
  createdAt: string
  repliedAt: string | null
}

export type CurriculumMeta = {
  totalQuestions: number
  unansweredCount: number
  topicCount: number
  bankMode?: 'free' | 'full'
  bankLimit?: number | null
  fullBankSize?: number
  topics: Array<{
    topic: string
    count: number
    los: Array<{ code: string; count: number }>
  }>
}

export type QuestionBankTopic = {
  topic: string
  label: string
  count: number
  completed: number
  accuracy: number
  hasProgress: boolean
  categoryId?: number
  accessible?: boolean
}

export type QuestionBankPack = {
  id: string
  kind: 'practice' | 'mock' | 'past-mock'
  title: string
  accessible: boolean
  locked: boolean
  defaultExpanded: boolean
  questionCount: number
  completed: number
  accuracy: number
  topics: QuestionBankTopic[]
  sessionQuery?: Record<string, string | number>
  actionPath?: string
}

export type QuestionBankMeta = {
  bankMode: 'free' | 'full'
  isPremium: boolean
  totalAccessible: number
  fullBankSize: number
  packs: QuestionBankPack[]
  sidebar: {
    wrongCount: number
    favoriteCount: number
  }
}

export async function fetchQuestions(
  token: string,
  filters: {
    topic?: string
    los?: string
    difficulty?: string
    unanswered?: boolean
    year?: number
    pack?: string
    category?: string
  } = {},
  signal?: AbortSignal,
): Promise<Question[]> {
  const params = new URLSearchParams()
  if (filters.topic) params.set('topic', filters.topic)
  if (filters.los) params.set('los', filters.los)
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.unanswered) params.set('unanswered', '1')
  if (filters.pack) params.set('pack', filters.pack)
  if (filters.category) params.set('category', filters.category)
  const query = params.toString()
  return apiRequest<Question[]>(`/questions${query ? `?${query}` : ''}`, { method: 'GET', signal }, token)
}

export async function fetchCurriculum(token: string): Promise<CurriculumMeta> {
  return apiRequest('/curriculum', { method: 'GET' }, token)
}

export async function fetchQuestionBank(token: string): Promise<QuestionBankMeta> {
  return apiRequest('/question-bank', { method: 'GET' }, token)
}

export async function registerAccount(payload: {
  name: string
  email: string
  password: string
}): Promise<{ token: string; user: User; dev?: { verifyUrl?: string; devToken?: string } }> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function requestPasswordReset(email: string): Promise<{
  message: string
  dev?: { resetUrl?: string; devToken?: string }
}> {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function verifyEmail(token: string): Promise<{ message: string; user?: User }> {
  return apiRequest('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function resendVerification(token: string): Promise<{
  message: string
  dev?: { verifyUrl?: string; devToken?: string }
}> {
  return apiRequest(
    '/auth/resend-verification',
    {
      method: 'POST',
    },
    token,
  )
}

export async function submitQuestionResult(
  token: string,
  questionId: number,
  selected: Answer,
): Promise<{ correct: boolean; correctAnswer: Answer; explanation: string }> {
  return apiRequest<{ correct: boolean; correctAnswer: Answer; explanation: string }>(
    `/questions/${questionId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ selected }),
    },
    token,
  )
}

export async function fetchPricingPlans(): Promise<PricingPlan[]> {
  return apiRequest('/pricing', { method: 'GET' })
}

export async function fetchBillingStatus(token: string): Promise<{
  plan: User['plan']
  subscriptionStatus: User['subscriptionStatus']
  subscriptionExpiresAt: string | null
  isPremium: boolean
  entitlements: User['entitlements']
}> {
  return apiRequest('/billing/status', { method: 'GET' }, token)
}

export async function startCheckout(
  token: string,
  planId: 'paid_lifetime',
): Promise<{
  mode: 'stripe' | 'payment_link' | 'payment_required'
  url?: string
  message?: string
  user?: User
}> {
  return apiRequest(
    '/billing/checkout',
    {
      method: 'POST',
      body: JSON.stringify({ planId }),
    },
    token,
  )
}

export async function fetchStats(token: string): Promise<StatsResponse> {
  return apiRequest<StatsResponse>('/stats', { method: 'GET' }, token)
}

export async function fetchReview(token: string): Promise<{
  wrongIds: number[]
  doneIds: number[]
  favorites: number[]
  wrongQuestions: {
    id: number
    topic: string
    los: string
    pack?: string
    stem: string
  }[]
  favoriteQuestions: {
    id: number
    topic: string
    los: string
    pack?: string
    stem: string
  }[]
}> {
  return apiRequest('/review', { method: 'GET' }, token)
}

export async function toggleFavoriteRequest(
  token: string,
  questionId: number,
): Promise<{ favorites: number[] }> {
  return apiRequest(
    `/favorites/${questionId}/toggle`,
    {
      method: 'POST',
    },
    token,
  )
}

export type MockExamMode = 'specified'

export type { MockExamBankId } from '../constants/mockExamBanks'

export async function startMockSession(
  token: string,
  options: {
    mockBankId: string
    questionCount?: number
    durationMinutes?: number
  },
): Promise<MockSession> {
  return apiRequest(
    '/mock-sessions/start',
    {
      method: 'POST',
      body: JSON.stringify(options),
    },
    token,
  )
}

export async function getCurrentMockSession(token: string): Promise<MockSession | null> {
  return apiRequest('/mock-sessions/current', { method: 'GET' }, token)
}

export async function answerMockQuestion(
  token: string,
  questionId: number,
  selected: Answer,
): Promise<MockSession> {
  return apiRequest(
    '/mock-sessions/current/answer',
    {
      method: 'POST',
      body: JSON.stringify({ questionId, selected }),
    },
    token,
  )
}

export async function submitMockSession(token: string): Promise<
  MockSession & {
    topicBreakdown?: Array<{ topic: string; total: number; correct: number; accuracy: number }>
  }
> {
  return apiRequest('/mock-sessions/current/submit', { method: 'POST' }, token)
}

export async function tickMockSession(token: string): Promise<MockSession> {
  return apiRequest('/mock-sessions/current/tick', { method: 'POST' }, token)
}

export async function fetchMockHistory(token: string): Promise<MockHistoryItem[]> {
  return apiRequest('/mock-sessions/history', { method: 'GET' }, token)
}

export async function upsertQuestion(
  token: string,
  payload: Omit<Question, 'id'> & { id?: number },
): Promise<Question[]> {
  return apiRequest(
    '/admin/questions',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  )
}

export async function deleteQuestion(token: string, questionId: number): Promise<Question[]> {
  return apiRequest(
    `/admin/questions/${questionId}`,
    {
      method: 'DELETE',
    },
    token,
  )
}

export async function importQuestionsCsv(
  token: string,
  csvText: string,
): Promise<{ imported: number; errors: CsvImportError[]; questions: Question[] }> {
  return apiRequest(
    '/admin/questions/import-csv',
    {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    },
    token,
  )
}

export type AdminAnalytics = {
  totals: {
    users: number
    registeredCandidates: number
    verifiedUsers: number
    premiumUsers: number
    freeUsers: number
    questions: number
    submissions: number
    submissionsLast7Days: number
    candidatesWithSubmissions: number
    candidatesCompletedQuestions: number
    mockStarted: number
    mockSubmitted: number
    candidatesWithSubmittedMocks: number
    avgMockScore: number
  }
  rates: {
    premiumConversionPct: number
    mockCompletionPct: number
    emailVerifiedPct: number
    practiceActivationPct: number
    questionCompletionPct: number
  }
  growth: {
    registrationsLast7Days: number
    registrationsLast30Days: number
  }
  planBreakdown: Record<string, number>
  trends: {
    signups: Array<{ day: string; count: number }>
    practice: Array<{ day: string; count: number }>
    mockSubmits: Array<{ day: string; count: number }>
  }
  funnel: Array<{ stage: string; count: number }>
  topicEngagement: Array<{ topic: string; attempts: number; candidates: number; accuracy: number }>
  candidates: Array<{
    id: number
    name: string
    email: string
    plan: string
    isPremium: boolean
    emailVerified: boolean
    createdAt: string
    answeredQuestions: number
    correctAnswers: number
    accuracy: number
    completionPct: number
    lastPracticeAt: string | null
    mockStarted: number
    mockSubmitted: number
    lastMockAt: string | null
    bestMockScore: number | null
    stage: string
  }>
}

export async function fetchAdminAnalytics(token: string): Promise<AdminAnalytics> {
  return apiRequest('/admin/analytics', { method: 'GET' }, token)
}

export async function downloadAdminCsv(token: string, kind: 'csv-template' | 'export-csv') {
  const response = await fetch(`${getApiBase()}/admin/questions/${kind}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || 'Download failed')
  }
  const blob = await response.blob()
  const filename = kind === 'csv-template' ? 'cfa-questions-template.csv' : 'cfa-questions-export.csv'
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function fetchSprintPlan(token: string): Promise<{
  examDate: string | null
  examDaysRemaining: number | null
  weekly: { weeklyGoal: number; completedThisWeek: number; progressPct: number }
  weeks: Array<{
    week: number
    title: string
    focus: string
    topics: string[]
    targetQuestions: number
    completed: number
    progressPct: number
    status: 'complete' | 'on-track' | 'behind'
  }>
}> {
  return apiRequest('/sprint-plan', { method: 'GET' }, token)
}

export async function registerPushToken(token: string, deviceToken: string, platform: string) {
  return apiRequest('/push/register', {
    method: 'POST',
    body: JSON.stringify({ token: deviceToken, platform }),
  }, token)
}

export async function adminPushBroadcast(
  token: string,
  payload: { title: string; body: string },
): Promise<{ mode: string; sent: number; failed?: number; targeted?: number; message?: string }> {
  return apiRequest('/admin/push/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
}

export async function fetchCourses(token: string): Promise<CourseItem[]> {
  return apiRequest('/courses', { method: 'GET' }, token)
}

export async function fetchOrders(token: string): Promise<OrderItem[]> {
  return apiRequest('/orders', { method: 'GET' }, token)
}

export async function fetchMessages(token: string): Promise<UserMessage[]> {
  return apiRequest('/messages', { method: 'GET' }, token)
}

export async function submitMessage(
  token: string,
  payload: { subject: string; body: string },
): Promise<UserMessage> {
  return apiRequest(
    '/messages',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  )
}

export async function fetchMe(token: string): Promise<User> {
  return apiRequest('/auth/me', { method: 'GET' }, token)
}

export async function updateUserSettings(
  token: string,
  payload: {
    locale?: 'en' | 'zh'
    reminderEnabled?: boolean
    reminderTime?: string
    examDate?: string | null
    weeklyGoal?: number
    onboardingCompleted?: boolean
  },
): Promise<User> {
  return apiRequest(
    '/user/settings',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  )
}

export async function fetchMockSessionDetail(
  token: string,
  sessionId: number,
): Promise<
  MockSession & {
    topicBreakdown?: Array<{ topic: string; total: number; correct: number; accuracy: number }>
  }
> {
  return apiRequest(`/mock-sessions/${sessionId}`, { method: 'GET' }, token)
}
