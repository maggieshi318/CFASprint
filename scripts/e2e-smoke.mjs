const BASE_URL = process.env.BASE_URL || 'http://localhost:8787'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, options = {}, token) {
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${body?.message || 'failed'}`)
  }
  return body
}

async function login(email, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  assert(data.token, 'login should return token')
  assert(data.user?.email === email, 'login should return user')
  return data
}

async function run() {
  console.log(`Running smoke tests against ${BASE_URL}`)

  const health = await request('/api/health')
  assert(health.status === 'ok', 'health check failed')
  assert(health.mailer === 'dev' || health.mailer === 'smtp', 'health should report mailer mode')

  const student = await login('candidate@example.com', 'password123')

  const curriculum = await request('/api/curriculum', {}, student.token)
  assert(curriculum.topicCount >= 10, 'curriculum should cover 10 CFA topics')
  assert(curriculum.totalQuestions >= 20, 'question bank should include 20+ questions')

  const ethicsQuestions = await request('/api/questions?topic=Ethics', {}, student.token)
  assert(ethicsQuestions.length >= 2, 'Ethics topic should have multiple questions')

  const questions = await request('/api/questions', {}, student.token)
  assert(Array.isArray(questions) && questions.length > 0, 'questions should be non-empty')

  const first = questions[0]
  const submitResult = await request(
    `/api/questions/${first.id}/submit`,
    { method: 'POST', body: JSON.stringify({ selected: first.answer }) },
    student.token,
  )
  assert(submitResult.correct === true, 'correct answer should be marked correct')

  const stats = await request('/api/stats', {}, student.token)
  assert(typeof stats.totalQuestions === 'number', 'stats should include totals')
  assert(Array.isArray(stats.weakAreas), 'stats should include weakAreas')

  const sprintPlan = await request('/api/sprint-plan', {}, student.token)
  assert(Array.isArray(sprintPlan.weeks) && sprintPlan.weeks.length === 8, 'sprint plan should include 8 weeks')
  assert(typeof sprintPlan.weekly.weeklyGoal === 'number', 'sprint plan should include weekly goal progress')

  const checkout = await request(
    '/api/billing/checkout',
    { method: 'POST', body: JSON.stringify({ planId: 'pro_quarterly' }) },
    student.token,
  )
  assert(checkout.mode === 'dev', 'dev checkout should activate plan without Stripe keys')
  assert(checkout.user?.isPremium === true, 'checkout should upgrade user to premium')

  const billing = await request('/api/billing/status', {}, student.token)
  assert(billing.isPremium === true, 'billing status should reflect premium plan')

  const plans = await request('/api/pricing')
  assert(plans.some((plan) => plan.planId === 'pro_quarterly'), 'pricing should include pro plan')

  const mock = await request(
    '/api/mock-sessions/start',
    {
      method: 'POST',
      body: JSON.stringify({ mockBankId: '2026-mock-exam-1', durationMinutes: 5 }),
    },
    student.token,
  )
  assert(mock.status === 'active', 'mock session should start active')

  const qid = mock.questionIds[0]
  const question = mock.questions.find((item) => item.id === qid)
  await request(
    '/api/mock-sessions/current/answer',
    { method: 'POST', body: JSON.stringify({ questionId: qid, selected: question.answer }) },
    student.token,
  )

  const submitted = await request('/api/mock-sessions/current/submit', { method: 'POST' }, student.token)
  assert(submitted.status === 'submitted', 'mock session should submit')
  assert(Array.isArray(submitted.topicBreakdown), 'mock submit should return topic breakdown')

  const admin = await login('admin@example.com', 'admin123')

  const analytics = await request('/api/admin/analytics', {}, admin.token)
  assert(typeof analytics.totals.users === 'number', 'admin analytics should return totals')
  assert(Array.isArray(analytics.trends.signups), 'admin analytics should include signup trends')

  const templateRes = await fetch(`${BASE_URL}/api/admin/questions/csv-template`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  })
  assert(templateRes.ok, 'csv template download should succeed')
  const templateText = await templateRes.text()
  assert(templateText.includes('topic,los,exam_year'), 'csv template should include standard header')

  const csv = [
    'topic,los,exam_year,tags,difficulty,stem,option_a,option_b,option_c,answer,explanation',
    'Economics,EC.1,2026,macro,Easy,E2E import question?,Wrong A,Correct B,Wrong C,B,Imported by smoke test.',
  ].join('\n')

  const imported = await request(
    '/api/admin/questions/import-csv',
    { method: 'POST', body: JSON.stringify({ csvText: csv }) },
    admin.token,
  )
  assert(imported.imported >= 1, 'csv import should succeed')

  const importedQuestion = imported.questions.find((item) => item.stem === 'E2E import question?')
  assert(importedQuestion, 'imported question should appear in response')
  await request(`/api/admin/questions/${importedQuestion.id}`, { method: 'DELETE' }, admin.token)

  const resetEmail = `e2e-${Date.now()}@example.com`
  const registered = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Reset User',
      email: resetEmail,
      password: 'password12345',
    }),
  })
  assert(registered.dev?.verifyUrl, 'register should return dev verify url')

  const forgot = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: resetEmail }),
  })
  assert(forgot.dev?.devToken, 'forgot password should return dev reset token')

  await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: forgot.dev.devToken, password: 'newpass12345' }),
  })

  const relogin = await login(resetEmail, 'newpass12345')
  assert(relogin.token, 'user should login with reset password')

  await request('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: registered.dev.devToken }),
  })

  const reminderSettings = await request(
    '/api/user/settings',
    {
      method: 'PATCH',
      body: JSON.stringify({
        reminderEnabled: true,
        reminderTime: '09:30',
        examDate: '2026-11-15',
        weeklyGoal: 75,
        onboardingCompleted: true,
      }),
    },
    relogin.token,
  )
  assert(reminderSettings.reminderEnabled === true, 'reminder settings should persist')
  assert(reminderSettings.reminderTime === '09:30', 'reminder time should persist')
  assert(reminderSettings.examDate === '2026-11-15', 'exam date should persist')
  assert(reminderSettings.weeklyGoal === 75, 'weekly goal should persist')
  assert(reminderSettings.onboardingCompleted === true, 'onboarding flag should persist')

  const userSprint = await request('/api/sprint-plan', {}, relogin.token)
  assert(userSprint.examDate === '2026-11-15', 'sprint plan should reflect exam date')
  assert(student.user.examDaysRemaining != null, 'demo user should have exam countdown')

  const courses = await request('/api/courses', {}, student.token)
  assert(Array.isArray(courses) && courses.length >= 1, 'courses should list enrolled product')
  assert(courses[0].bankPath === '/study/practice', 'course should link to practice bank')
  assert(typeof courses[0].bankLabel === 'string', 'course should include bank label')

  const orders = await request('/api/orders', {}, student.token)
  assert(Array.isArray(orders), 'orders list should be an array')

  const message = await request(
    '/api/messages',
    { method: 'POST', body: JSON.stringify({ subject: 'E2E support', body: 'Testing message center.' }) },
    relogin.token,
  )
  assert(message.subject === 'E2E support', 'message should be created')

  const messages = await request('/api/messages', {}, relogin.token)
  assert(messages.some((item) => item.subject === 'E2E support'), 'messages list should include submitted message')

  await request(
    '/api/push/register',
    { method: 'POST', body: JSON.stringify({ token: 'e2e-device-token', platform: 'test' }) },
    relogin.token,
  )

  const broadcast = await request(
    '/api/admin/push/broadcast',
    { method: 'POST', body: JSON.stringify({ title: 'E2E', body: 'Test broadcast' }) },
    admin.token,
  )
  assert(broadcast.mode === 'dev' || broadcast.mode === 'fcm', 'broadcast should return mode')

  console.log('Smoke tests passed.')
}

run().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
