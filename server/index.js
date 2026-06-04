import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import {
  activatePlan,
  createCheckoutSession,
  getPricingPlans,
  getPlanEntitlements,
  getSubscriptionSnapshot,
  handleStripeWebhook,
  hasActiveSubscription,
} from './billing.js'
import { consumeAuthToken, issueAuthAction } from './authTokens.js'
import { buildCurriculumMeta, ensureQuestionBank } from './seedQuestions.js'
import { getMailerStatus, isSmtpConfigured, sendAuthEmail } from './mailer.js'
import { buildAdminAnalytics } from './analytics.js'
import { buildCsvTemplate, exportQuestionsToCsv, importQuestionsFromCsv } from './csvImport.js'
import { buildQuestionBankMeta, buildPracticePackStudyStats } from './questionBank.js'
import { migrateLegacyLanrenTags, MOCK_EXAM_BANKS, pickMockExamQuestionIdsByBank } from './qmBank.js'
import {
  computeStudyStreak,
  getPushStatus,
  registerDeviceToken,
  sendPushBroadcast,
} from './push.js'
import { buildSprintPlan, getExamCountdown, getWeeklyGoalProgress } from './sprintPlan.js'
import { getWeakAreas } from './weakAreas.js'
import { ensureDemoOrder, listOrders, recordOrder } from './orders.js'
import { createMessage, listMessages } from './messages.js'
import {
  filterQuestionsForUser,
  FREE_BANK_QUESTION_LIMIT,
  getBankAccessMeta,
  getFreeBankQuestionIds,
  resolveQuestionsPack,
} from './bankAccess.js'
import { extractPackId } from './tagUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.dirname(config.dbPath)
const JWT_SECRET = config.jwtSecret

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(config.dbPath)
const app = express()

const corsOptions = config.corsOrigin
  ? { origin: config.corsOrigin.split(',').map((item) => item.trim()) }
  : undefined
app.use(cors(corsOptions))

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const eventType = handleStripeWebhook(db, req.body, req.headers['stripe-signature'])
    return res.json({ received: true, type: eventType })
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Webhook failed' })
  }
})

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: config.nodeEnv,
    mailer: getMailerStatus(),
    stripe: config.stripeSecretKey ? (config.stripeSecretKey.startsWith('sk_live_') ? 'live' : 'test') : 'dev',
    push: getPushStatus(db),
  })
})

app.get(['/sw.js', '/registerSW.js'], (_req, res, next) => {
  if (!config.isProduction || !fs.existsSync(config.staticDir)) return next()
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  return res.sendFile(path.join(config.staticDir, _req.path.slice(1)))
})

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  locale TEXT NOT NULL DEFAULT 'en',
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  topic TEXT NOT NULL,
  los TEXT NOT NULL DEFAULT '',
  exam_year INTEGER NOT NULL DEFAULT 2026,
  tags TEXT NOT NULL DEFAULT '[]',
  difficulty TEXT NOT NULL,
  stem TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected TEXT NOT NULL,
  correct INTEGER NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS mock_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  question_ids TEXT NOT NULL,
  answers_json TEXT NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  remaining_seconds INTEGER NOT NULL DEFAULT 3600,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS device_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TEXT NOT NULL,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS user_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  created_at TEXT NOT NULL,
  replied_at TEXT
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL,
  referred_user_id INTEGER NOT NULL,
  benefit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'earned',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referrer_user_id, referred_user_id)
);
`)

function ensureColumn(tableName, columnName, columnSql) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  const hasColumn = columns.some((col) => col.name === columnName)
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`)
  }
}

ensureColumn('questions', 'los', "TEXT NOT NULL DEFAULT ''")
ensureColumn('questions', 'exam_year', 'INTEGER NOT NULL DEFAULT 2026')
ensureColumn('questions', 'tags', "TEXT NOT NULL DEFAULT '[]'")
ensureColumn('questions', 'sort_order', 'INTEGER NOT NULL DEFAULT 0')
ensureColumn('mock_sessions', 'duration_minutes', 'INTEGER NOT NULL DEFAULT 60')
ensureColumn('mock_sessions', 'remaining_seconds', 'INTEGER NOT NULL DEFAULT 3600')
ensureColumn('mock_sessions', 'mock_bank_id', 'TEXT')
ensureColumn('mock_sessions', 'mock_bank_label', 'TEXT')
ensureColumn('mock_sessions', 'mock_session_label', 'TEXT')
ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'student'")
ensureColumn('users', 'locale', "TEXT NOT NULL DEFAULT 'en'")
ensureColumn('users', 'plan', "TEXT NOT NULL DEFAULT 'free'")
ensureColumn('users', 'subscription_status', "TEXT NOT NULL DEFAULT 'inactive'")
ensureColumn('users', 'subscription_expires_at', 'TEXT')
ensureColumn('users', 'stripe_customer_id', 'TEXT')
ensureColumn('users', 'stripe_subscription_id', 'TEXT')
ensureColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0')
ensureColumn('users', 'created_at', 'TEXT')
ensureColumn('users', 'reminder_enabled', 'INTEGER DEFAULT 0')
ensureColumn('users', 'reminder_time', "TEXT DEFAULT '20:00'")

db.prepare('UPDATE users SET reminder_enabled = 0 WHERE reminder_enabled IS NULL').run()
db.prepare("UPDATE users SET reminder_time = '20:00' WHERE reminder_time IS NULL OR reminder_time = ''").run()
ensureColumn('users', 'exam_date', 'TEXT')
ensureColumn('users', 'weekly_goal', 'INTEGER DEFAULT 50')
ensureColumn('users', 'onboarding_completed', 'INTEGER DEFAULT 0')
ensureColumn('users', 'referral_code', 'TEXT')
ensureColumn('users', 'referred_by_user_id', 'INTEGER')

db.prepare('UPDATE users SET weekly_goal = 50 WHERE weekly_goal IS NULL').run()
db.prepare('UPDATE users SET onboarding_completed = 1 WHERE email IN (?, ?)').run(
  'candidate@example.com',
  'admin@example.com',
)
db.prepare("UPDATE users SET exam_date = '2026-11-11' WHERE email IN (?, ?)").run(
  'candidate@example.com',
  'admin@example.com',
)
db.prepare("UPDATE users SET exam_date = '2026-11-11' WHERE exam_date IS NULL OR exam_date = ''").run()
db.prepare(
  "UPDATE users SET referral_code = lower(hex(randomblob(4))) WHERE referral_code IS NULL OR referral_code = ''",
).run()

db.prepare('UPDATE users SET email_verified = 1 WHERE email IN (?, ?)').run(
  'candidate@example.com',
  'admin@example.com',
)
db.prepare("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL OR created_at = ''").run()

ensureQuestionBank(db)
migrateLegacyLanrenTags(db)

const defaultUser = db.prepare('SELECT id FROM users WHERE email = ?').get('candidate@example.com')
if (!defaultUser) {
  const passwordHash = bcrypt.hashSync('password123', 10)
  db.prepare('INSERT INTO users (name, email, role, locale, password_hash) VALUES (?, ?, ?, ?, ?)').run(
    'Global Candidate',
    'candidate@example.com',
    'student',
    'en',
    passwordHash,
  )
}

const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.com')
if (!adminUser) {
  const passwordHash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO users (name, email, role, locale, password_hash) VALUES (?, ?, ?, ?, ?)').run(
    'Ops Admin',
    'admin@example.com',
    'admin',
    'zh',
    passwordHash,
  )
}

for (const email of ['candidate@example.com', 'admin@example.com']) {
  const row = db.prepare('SELECT id, plan, subscription_expires_at FROM users WHERE email = ?').get(email)
  if (row && row.plan !== 'free') {
    ensureDemoOrder(db, row.id, row.plan, row.subscription_expires_at)
  }
}

db.prepare(
  "UPDATE users SET referral_code = lower(hex(randomblob(4))) WHERE referral_code IS NULL OR referral_code = ''",
).run()

db.prepare('UPDATE users SET locale = ? WHERE locale NOT IN (?, ?)').run('en', 'en', 'zh')

function getUserRow(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
}

function serializeUser(userRow) {
  if (!userRow) return null
  return {
    id: String(userRow.id),
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    locale: userRow.locale || 'en',
    emailVerified: Boolean(userRow.email_verified),
    reminderEnabled: Boolean(userRow.reminder_enabled),
    reminderTime: userRow.reminder_time || '20:00',
    examDate: userRow.exam_date || null,
    weeklyGoal: userRow.weekly_goal || 50,
    onboardingCompleted: Boolean(userRow.onboarding_completed),
    examDaysRemaining: getExamCountdown(userRow.exam_date),
    referralCode: userRow.referral_code || null,
    ...getSubscriptionSnapshot(userRow),
  }
}

function createReferralCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = crypto.randomBytes(4).toString('hex')
    const exists = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code)
    if (!exists) return code
  }
  return `${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`
}

async function deliverAuthEmail(userRow, subject, actionUrl, actionLabel) {
  try {
    await sendAuthEmail({
      to: userRow.email,
      subject,
      actionUrl,
      actionLabel,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[mailer]', error.message || error)
  }
}

function devAuthPayload(payload) {
  if (isSmtpConfigured()) return undefined
  if (config.isProduction) return undefined
  return payload
}

function getPlanLimitBlockReason(userId, action, payload = {}) {
  const userRow = getUserRow(userId)
  const entitlements = getPlanEntitlements(userRow)

  if (action === 'submit') {
    if (entitlements.dailyQuestionLimit == null) return null
    const todayCount = db
      .prepare(
        `
        SELECT COUNT(*) AS count FROM submissions
        WHERE user_id = ? AND date(submitted_at) = date('now')
      `,
      )
      .get(userId).count
    if (todayCount >= entitlements.dailyQuestionLimit) {
      return 'Start the AED 9.9 trial to unlock the full question bank for one month.'
    }
  }

  if (action === 'mock_start') {
    const requestedQuestionCount = Number(payload.questionCount) || 0
    const submittedMocks = db
      .prepare(
        `
        SELECT COUNT(*) AS count FROM mock_sessions
        WHERE user_id = ? AND status = 'submitted'
      `,
      )
      .get(userId).count
    if (
      entitlements.mockSubmissionLimit != null &&
      submittedMocks >= entitlements.mockSubmissionLimit
    ) {
      return 'Start the AED 9.9 trial to unlock mock exams.'
    }
    if (
      entitlements.mockQuestionLimit != null &&
      requestedQuestionCount > entitlements.mockQuestionLimit
    ) {
      return 'Start the AED 9.9 trial to unlock full mock exams.'
    }
  }

  return null
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const token = auth.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin role required' })
  }
  return next()
}

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, locale: user.locale || 'en' }, JWT_SECRET, { expiresIn: '7d' })
}

function serializeQuestion(row) {
  return {
    id: row.id,
    topic: row.topic,
    los: row.los,
    examYear: row.exam_year,
    tags: JSON.parse(row.tags || '[]'),
    difficulty: row.difficulty,
    stem: row.stem,
    options: { A: row.option_a, B: row.option_b, C: row.option_c },
    answer: row.answer,
    explanation: row.explanation,
  }
}

function getQuestionsByIds(ids) {
  if (!ids.length) return []
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `
      SELECT id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation
      FROM questions
      WHERE id IN (${placeholders})
    `,
    )
    .all(...ids)
  const map = new Map(rows.map((row) => [row.id, serializeQuestion(row)]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

function getActiveMockSession(userId) {
  return db
    .prepare('SELECT * FROM mock_sessions WHERE user_id = ? AND status = ? ORDER BY id DESC LIMIT 1')
    .get(userId, 'active')
}

function formatMockSession(sessionRow) {
  if (!sessionRow) return null
  const questionIds = JSON.parse(sessionRow.question_ids || '[]')
  const answers = JSON.parse(sessionRow.answers_json || '{}')
  return {
    id: sessionRow.id,
    status: sessionRow.status,
    score: sessionRow.score,
    total: sessionRow.total,
    durationMinutes: sessionRow.duration_minutes,
    remainingSeconds: sessionRow.remaining_seconds,
    startedAt: sessionRow.started_at,
    submittedAt: sessionRow.submitted_at,
    questionIds,
    answers,
    questions: getQuestionsByIds(questionIds),
    mockBankId: sessionRow.mock_bank_id || null,
    mockBankLabel: sessionRow.mock_bank_label || null,
    mockSessionLabel: sessionRow.mock_session_label || null,
  }
}

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ message: 'Missing credentials' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(401).json({ message: 'Invalid email or password' })
  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

  const token = issueToken(user)
  return res.json({
    token,
    user: serializeUser(user),
  })
})

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, referralCode } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' })
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ message: 'Email is already registered' })

  const normalizedReferral = String(referralCode || '').trim().toLowerCase()
  const referrer = normalizedReferral
    ? db.prepare('SELECT id FROM users WHERE lower(referral_code) = ? OR lower(email) = ?').get(
        normalizedReferral,
        normalizedReferral,
      )
    : null
  const passwordHash = bcrypt.hashSync(password, 10)
  const newReferralCode = createReferralCode()
  const result = db
    .prepare(
      `
      INSERT INTO users
        (name, email, role, locale, password_hash, referral_code, referred_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(name, email, 'student', 'en', passwordHash, newReferralCode, referrer?.id || null)
  const user = getUserRow(result.lastInsertRowid)
  const token = issueToken(user)
  const verification = issueAuthAction(db, user, 'verify', config.appUrl, '/verify-email')
  await deliverAuthEmail(user, 'Verify your CFA Sprint email', verification.actionUrl, 'Verify email')
  return res.status(201).json({
    token,
    user: serializeUser(user),
    dev: devAuthPayload({ verifyUrl: verification.actionUrl, devToken: verification.devToken }),
  })
})

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ message: 'Email is required' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  let dev
  if (user) {
    const reset = issueAuthAction(db, user, 'reset', config.appUrl, '/reset-password')
    await deliverAuthEmail(user, 'Reset your CFA Sprint password', reset.actionUrl, 'Reset password')
    dev = devAuthPayload({ resetUrl: reset.actionUrl, devToken: reset.devToken })
  }

  return res.json({
    message: 'If the email exists, a reset link has been sent.',
    dev,
  })
})

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body || {}
  if (!token || !password || String(password).length < 8) {
    return res.status(400).json({ message: 'Valid token and password (min 8 chars) required' })
  }

  const row = consumeAuthToken(db, token, 'reset')
  if (!row) return res.status(400).json({ message: 'Invalid or expired reset token' })

  const passwordHash = bcrypt.hashSync(password, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, row.user_id)
  return res.json({ message: 'Password updated. You can sign in now.' })
})

app.post('/api/auth/verify-email', (req, res) => {
  const token = req.body?.token
  if (!token) return res.status(400).json({ message: 'Token is required' })

  const row = consumeAuthToken(db, token, 'verify')
  if (!row) return res.status(400).json({ message: 'Invalid or expired verification token' })

  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(row.user_id)
  const user = getUserRow(row.user_id)
  return res.json({ message: 'Email verified.', user: serializeUser(user) })
})

app.post('/api/auth/resend-verification', authMiddleware, async (req, res) => {
  const user = getUserRow(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  if (user.email_verified) return res.json({ message: 'Email already verified.' })

  const verification = issueAuthAction(db, user, 'verify', config.appUrl, '/verify-email')
  await deliverAuthEmail(user, 'Verify your CFA Sprint email', verification.actionUrl, 'Verify email')
  return res.json({
    message: 'Verification email sent.',
    dev: devAuthPayload({ verifyUrl: verification.actionUrl, devToken: verification.devToken }),
  })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = getUserRow(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  return res.json(serializeUser(user))
})

app.patch('/api/user/settings', authMiddleware, (req, res) => {
  const { locale, reminderEnabled, reminderTime, examDate, weeklyGoal, onboardingCompleted } = req.body || {}
  const user = getUserRow(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })

  if (locale !== undefined) {
    if (!['en', 'zh'].includes(locale)) {
      return res.status(400).json({ message: 'Invalid locale' })
    }
    db.prepare('UPDATE users SET locale = ? WHERE id = ?').run(locale, req.user.id)
  }

  if (reminderEnabled !== undefined) {
    db.prepare('UPDATE users SET reminder_enabled = ? WHERE id = ?').run(reminderEnabled ? 1 : 0, req.user.id)
  }

  if (reminderTime !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
      return res.status(400).json({ message: 'Invalid reminderTime (HH:MM)' })
    }
    const [hour, minute] = reminderTime.split(':').map(Number)
    if (hour > 23 || minute > 59) {
      return res.status(400).json({ message: 'Invalid reminderTime' })
    }
    db.prepare('UPDATE users SET reminder_time = ? WHERE id = ?').run(reminderTime, req.user.id)
  }

  if (examDate !== undefined) {
    if (examDate === null || examDate === '') {
      db.prepare('UPDATE users SET exam_date = NULL WHERE id = ?').run(req.user.id)
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return res.status(400).json({ message: 'Invalid examDate (YYYY-MM-DD)' })
    } else {
      db.prepare('UPDATE users SET exam_date = ? WHERE id = ?').run(examDate, req.user.id)
    }
  }

  if (weeklyGoal !== undefined) {
    const goal = Number(weeklyGoal)
    if (!Number.isFinite(goal) || goal < 10 || goal > 500) {
      return res.status(400).json({ message: 'weeklyGoal must be between 10 and 500' })
    }
    db.prepare('UPDATE users SET weekly_goal = ? WHERE id = ?').run(goal, req.user.id)
  }

  if (onboardingCompleted !== undefined) {
    db.prepare('UPDATE users SET onboarding_completed = ? WHERE id = ?').run(
      onboardingCompleted ? 1 : 0,
      req.user.id,
    )
  }

  const updated = getUserRow(req.user.id)
  return res.json(serializeUser(updated))
})

app.get('/api/sprint-plan', authMiddleware, (req, res) => {
  const user = getUserRow(req.user.id)
  const weeklyGoal = user.weekly_goal || 50
  return res.json({
    examDate: user.exam_date || null,
    examDaysRemaining: getExamCountdown(user.exam_date),
    weekly: getWeeklyGoalProgress(db, req.user.id, weeklyGoal),
    weeks: buildSprintPlan(db, req.user.id, weeklyGoal, user.locale || 'en'),
  })
})

app.get('/api/curriculum', authMiddleware, (req, res) => {
  const user = getUserRow(req.user.id)
  const meta = buildCurriculumMeta(db, req.user.id)
  const bank = getBankAccessMeta(db, user)

  if (!bank.isPremium) {
    const allowedIds = getFreeBankQuestionIds(db)
    const allowed = new Set(allowedIds)
    const filteredTopics = meta.topics
      .map((topic) => {
        const topicRows = db
          .prepare('SELECT id, los FROM questions WHERE topic = ? ORDER BY id ASC')
          .all(topic.topic)
          .filter((row) => allowed.has(row.id))
        if (topicRows.length === 0) return null
        const losMap = new Map()
        for (const row of topicRows) {
          losMap.set(row.los, (losMap.get(row.los) || 0) + 1)
        }
        return {
          topic: topic.topic,
          count: topicRows.length,
          los: Array.from(losMap.entries()).map(([code, count]) => ({ code, count })),
        }
      })
      .filter(Boolean)

    const unansweredCount =
      allowedIds.length === 0
        ? 0
        : db
            .prepare(
              `
              SELECT COUNT(*) AS count FROM questions q
              LEFT JOIN submissions s ON s.question_id = q.id AND s.user_id = ?
              WHERE s.id IS NULL AND q.id IN (${allowedIds.map(() => '?').join(', ')})
            `,
            )
            .get(req.user.id, ...allowedIds).count

    return res.json({
      ...meta,
      totalQuestions: bank.accessibleCount,
      unansweredCount,
      topics: filteredTopics,
      topicCount: filteredTopics.length,
      bankMode: 'free',
      bankLimit: FREE_BANK_QUESTION_LIMIT,
      fullBankSize: bank.totalQuestions,
    })
  }

  return res.json({
    ...meta,
    bankMode: 'full',
    bankLimit: null,
    fullBankSize: bank.totalQuestions,
  })
})

app.get('/api/question-bank', authMiddleware, (req, res) => {
  const user = getUserRow(req.user.id)
  return res.json(buildQuestionBankMeta(db, user))
})

app.get('/api/questions', authMiddleware, (req, res) => {
  const { topic, los, difficulty, unanswered, year, pack, category } = req.query
  const conditions = []
  const params = [req.user.id]
  const effectivePack = resolveQuestionsPack({ pack, topic })

  if (topic) {
    conditions.push('q.topic = ?')
    params.push(String(topic))
  }
  if (los) {
    conditions.push('q.los = ?')
    params.push(String(los))
  }
  if (difficulty) {
    conditions.push('q.difficulty = ?')
    params.push(String(difficulty))
  }
  if (unanswered === '1' || unanswered === 'true') {
    conditions.push('s.id IS NULL')
  }
  if (effectivePack) {
    conditions.push('q.tags LIKE ?')
    params.push(`%pack:${effectivePack}%`)
  } else if (year) {
    conditions.push('q.exam_year = ?')
    params.push(Number(year))
  }
  if (category) {
    conditions.push('q.tags LIKE ?')
    params.push(`%category:${String(category)}%`)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `
      SELECT q.id, q.topic, q.los, q.exam_year, q.tags, q.difficulty, q.stem,
             q.option_a, q.option_b, q.option_c, q.answer, q.explanation, q.sort_order
      FROM questions q
      LEFT JOIN submissions s ON s.question_id = q.id AND s.user_id = ?
      ${whereClause}
      ORDER BY CASE WHEN q.sort_order > 0 THEN q.sort_order ELSE q.id END ASC, q.id ASC
    `,
    )
    .all(...params)
    .map((row) => serializeQuestion(row))

  const user = getUserRow(req.user.id)
  return res.json(filterQuestionsForUser(db, user, rows, { pack: effectivePack || '2026-practice' }))
})

app.post('/api/admin/questions', authMiddleware, adminMiddleware, (req, res) => {
  const payload = req.body || {}
  const {
    id,
    topic,
    los,
    examYear,
    tags,
    difficulty,
    stem,
    options,
    answer,
    explanation,
  } = payload
  if (
    !topic ||
    !los ||
    !examYear ||
    !difficulty ||
    !stem ||
    !options?.A ||
    !options?.B ||
    !options?.C ||
    !['A', 'B', 'C'].includes(answer) ||
    !explanation
  ) {
    return res.status(400).json({ message: 'Missing required question fields' })
  }

  const tagsText = JSON.stringify(Array.isArray(tags) ? tags : [])

  if (id) {
    db.prepare(
      `
      UPDATE questions
      SET topic = ?, los = ?, exam_year = ?, tags = ?, difficulty = ?, stem = ?, option_a = ?, option_b = ?, option_c = ?, answer = ?, explanation = ?
      WHERE id = ?
    `,
    ).run(
      topic,
      los,
      examYear,
      tagsText,
      difficulty,
      stem,
      options.A,
      options.B,
      options.C,
      answer,
      explanation,
      id,
    )
  } else {
    const nextId =
      db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM questions').get().nextId || 1
    db.prepare(
      `
      INSERT INTO questions (id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      nextId,
      topic,
      los,
      examYear,
      tagsText,
      difficulty,
      stem,
      options.A,
      options.B,
      options.C,
      answer,
      explanation,
    )
  }

  const rows = db
    .prepare(
      'SELECT id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation FROM questions ORDER BY id ASC',
    )
    .all()
    .map((row) => serializeQuestion(row))
  return res.json(rows)
})

app.delete('/api/admin/questions/:id', authMiddleware, adminMiddleware, (req, res) => {
  const questionId = Number(req.params.id)
  if (!questionId) return res.status(400).json({ message: 'Invalid question id' })
  db.prepare('DELETE FROM submissions WHERE question_id = ?').run(questionId)
  db.prepare('DELETE FROM favorites WHERE question_id = ?').run(questionId)
  db.prepare('DELETE FROM questions WHERE id = ?').run(questionId)

  const rows = db
    .prepare(
      'SELECT id, topic, los, exam_year, tags, difficulty, stem, option_a, option_b, option_c, answer, explanation FROM questions ORDER BY id ASC',
    )
    .all()
    .map((row) => serializeQuestion(row))
  return res.json(rows)
})

app.post('/api/admin/questions/import-csv', authMiddleware, adminMiddleware, (req, res) => {
  const csvText = req.body?.csvText
  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ message: 'csvText is required' })
  }

  try {
    const result = importQuestionsFromCsv(db, csvText, serializeQuestion)
    return res.json(result)
  } catch (error) {
    return res.status(400).json({ message: error.message || 'CSV import failed' })
  }
})

app.get('/api/admin/questions/csv-template', authMiddleware, adminMiddleware, (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="cfa-questions-template.csv"')
  return res.send(buildCsvTemplate())
})

app.get('/api/admin/questions/export-csv', authMiddleware, adminMiddleware, (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="cfa-questions-export.csv"')
  return res.send(exportQuestionsToCsv(db))
})

app.get('/api/admin/analytics', authMiddleware, adminMiddleware, (_req, res) => {
  return res.json({ ...buildAdminAnalytics(db), push: getPushStatus(db) })
})

app.post('/api/admin/push/broadcast', authMiddleware, adminMiddleware, async (req, res) => {
  const title = String(req.body?.title || '').trim()
  const body = String(req.body?.body || '').trim()
  if (!title || !body) {
    return res.status(400).json({ message: 'title and body are required' })
  }
  try {
    const result = await sendPushBroadcast(db, title, body)
    return res.json(result)
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Broadcast failed' })
  }
})

app.post('/api/push/register', authMiddleware, (req, res) => {
  const token = String(req.body?.token || '').trim()
  const platform = String(req.body?.platform || 'unknown').trim()
  if (!token) return res.status(400).json({ message: 'token is required' })
  registerDeviceToken(db, req.user.id, token, platform)
  return res.json({ registered: true, push: getPushStatus(db) })
})

app.post('/api/questions/:id/submit', authMiddleware, (req, res) => {
  const blockReason = getPlanLimitBlockReason(req.user.id, 'submit')
  if (blockReason) return res.status(402).json({ message: blockReason, code: 'PLAN_LIMIT' })

  const questionId = Number(req.params.id)
  const { selected } = req.body || {}
  if (!['A', 'B', 'C'].includes(selected)) {
    return res.status(400).json({ message: 'Invalid answer option' })
  }
  const question = db
    .prepare('SELECT id, answer, explanation FROM questions WHERE id = ?')
    .get(questionId)
  if (!question) return res.status(404).json({ message: 'Question not found' })

  const correct = selected === question.answer ? 1 : 0
  db.prepare(
    `
    INSERT INTO submissions (user_id, question_id, selected, correct)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, question_id)
    DO UPDATE SET selected = excluded.selected, correct = excluded.correct, submitted_at = CURRENT_TIMESTAMP
  `,
  ).run(req.user.id, questionId, selected, correct)

  return res.json({
    correct: Boolean(correct),
    correctAnswer: question.answer,
    explanation: question.explanation,
  })
})

app.get('/api/stats', authMiddleware, (req, res) => {
  const userRow = getUserRow(req.user.id)
  const { pack, topicPerformance } = buildPracticePackStudyStats(db, userRow, '2026-practice')
  const bankMeta = buildQuestionBankMeta(db, userRow)

  const examDate = userRow.exam_date || '2026-11-11'

  return res.json({
    totalQuestions: bankMeta.fullBankSize || pack.questionCount,
    completed: pack.completed,
    correct: pack.correct,
    wrong: pack.wrong,
    accuracy: pack.accuracy,
    studyStreak: computeStudyStreak(db, req.user.id),
    topicPerformance,
    weakAreas: getWeakAreas(topicPerformance),
    pack,
    exam: {
      date: examDate,
      daysRemaining: getExamCountdown(examDate),
    },
  })
})

app.get('/api/mock-sessions/history', authMiddleware, (req, res) => {
  const rows = db
    .prepare(
      `
      SELECT id, score, total, duration_minutes, started_at, submitted_at, mock_bank_id, mock_bank_label
      FROM mock_sessions
      WHERE user_id = ? AND status = 'submitted'
      ORDER BY id DESC
      LIMIT 8
    `,
    )
    .all(req.user.id)
    .map((row) => ({
      id: row.id,
      score: row.score,
      total: row.total,
      accuracy: row.total > 0 ? Math.round((row.score / row.total) * 100) : 0,
      durationMinutes: row.duration_minutes,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      mockBankId: row.mock_bank_id || null,
      mockBankLabel: row.mock_bank_label || null,
    }))
  return res.json(rows)
})

app.get('/api/mock-sessions/current', authMiddleware, (req, res) => {
  const session = getActiveMockSession(req.user.id)
  if (session && !session.mock_bank_id) {
    db.prepare('UPDATE mock_sessions SET status = ? WHERE id = ?').run('abandoned', session.id)
    return res.json(null)
  }
  return res.json(formatMockSession(session))
})

app.get('/api/mock-sessions/:id', authMiddleware, (req, res) => {
  const sessionId = Number(req.params.id)
  const session = db.prepare('SELECT * FROM mock_sessions WHERE id = ? AND user_id = ?').get(sessionId, req.user.id)
  if (!session) return res.status(404).json({ message: 'Mock session not found' })

  const formatted = formatMockSession(session)
  const answers = formatted.answers || {}
  const topicMap = new Map()
  for (const q of formatted.questions) {
    const selected = answers[String(q.id)]
    if (!selected || !['A', 'B', 'C'].includes(selected)) continue
    if (!topicMap.has(q.topic)) {
      topicMap.set(q.topic, { topic: q.topic, total: 0, correct: 0 })
    }
    const entry = topicMap.get(q.topic)
    entry.total += 1
    if (selected === q.answer) entry.correct += 1
  }
  const topicBreakdown = Array.from(topicMap.values()).map((entry) => ({
    ...entry,
    accuracy: entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0,
  }))
  return res.json({ ...formatted, topicBreakdown })
})

app.get('/api/review', authMiddleware, (req, res) => {
  const wrongIds = db
    .prepare('SELECT question_id FROM submissions WHERE user_id = ? AND correct = 0')
    .all(req.user.id)
    .map((row) => row.question_id)
  const doneIds = db
    .prepare('SELECT question_id FROM submissions WHERE user_id = ?')
    .all(req.user.id)
    .map((row) => row.question_id)
  const favorites = db
    .prepare('SELECT question_id FROM favorites WHERE user_id = ?')
    .all(req.user.id)
    .map((row) => row.question_id)

  const wrongQuestions = getQuestionsByIds(wrongIds).map((question) => ({
    id: question.id,
    topic: question.topic,
    los: question.los,
    pack: extractPackId(question.tags) || '2026-practice',
    stem: String(question.stem || '')
      .replace(/<!--STEM_IMAGES:\[[\s\S]*?\]-->/g, '')
      .slice(0, 160),
  }))

  const favoriteQuestions = getQuestionsByIds(favorites).map((question) => ({
    id: question.id,
    topic: question.topic,
    los: question.los,
    pack: extractPackId(question.tags) || '2026-practice',
    stem: String(question.stem || '')
      .replace(/<!--STEM_IMAGES:\[[\s\S]*?\]-->/g, '')
      .slice(0, 160),
  }))

  return res.json({ wrongIds, doneIds, favorites, wrongQuestions, favoriteQuestions })
})

app.post('/api/favorites/:id/toggle', authMiddleware, (req, res) => {
  const questionId = Number(req.params.id)
  const existing = db
    .prepare('SELECT id FROM favorites WHERE user_id = ? AND question_id = ?')
    .get(req.user.id, questionId)

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND question_id = ?').run(
      req.user.id,
      questionId,
    )
  } else {
    db.prepare('INSERT INTO favorites (user_id, question_id) VALUES (?, ?)').run(
      req.user.id,
      questionId,
    )
  }

  const favorites = db
    .prepare('SELECT question_id FROM favorites WHERE user_id = ?')
    .all(req.user.id)
    .map((row) => row.question_id)
  return res.json({ favorites })
})

app.get('/api/pricing', (_req, res) => {
  return res.json(getPricingPlans())
})

app.get('/api/billing/status', authMiddleware, (req, res) => {
  const user = getUserRow(req.user.id)
  return res.json(getSubscriptionSnapshot(user))
})

app.get('/api/courses', authMiddleware, (req, res) => {
  const user = getUserRow(req.user.id)
  const snapshot = getSubscriptionSnapshot(user)
  const bank = getBankAccessMeta(db, user)
  const planNames = {
    free: 'Account Only',
    trial_monthly: '1-Month Trial',
    paid_lifetime: 'Full Access',
    pro_quarterly: 'Full Access',
    pass_pack: 'Full Access',
  }
  return res.json([
    {
      id: 'cfa-l1-2026',
      title: 'CFA Level I Question Bank 2026',
      subtitle: 'Practice bank | timed mocks | sprint plan | review center',
      plan: snapshot.plan,
      planName: planNames[snapshot.plan] || snapshot.plan,
      isPremium: snapshot.isPremium,
      expiresAt: snapshot.subscriptionExpiresAt,
      studyPath: '/study/statistics',
      bankPath: bank.bankPath,
      bankLabel: bank.bankLabel,
      bankSize: bank.accessibleCount,
      totalBankSize: bank.totalQuestions,
    },
  ])
})

app.get('/api/orders', authMiddleware, (req, res) => {
  return res.json(listOrders(db, req.user.id))
})

app.get('/api/messages', authMiddleware, (req, res) => {
  return res.json(listMessages(db, req.user.id))
})

app.post('/api/messages', authMiddleware, (req, res) => {
  const { subject, body } = req.body || {}
  try {
    const message = createMessage(db, req.user.id, subject, body)
    return res.status(201).json(message)
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Could not submit message' })
  }
})

app.post('/api/billing/checkout', authMiddleware, async (req, res) => {
  const planId = req.body?.planId
  if (!planId || planId === 'free') {
    return res.status(400).json({ message: 'Invalid planId' })
  }

  const user = getUserRow(req.user.id)
  try {
    const result = await createCheckoutSession(db, user, planId)
    return res.json(result)
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Checkout failed' })
  }
})


app.get('/api/mock-exam/banks', authMiddleware, (_req, res) => {
  return res.json(
    Object.entries(MOCK_EXAM_BANKS).map(([id, bank]) => ({
      id,
      label: bank.label,
      packId: bank.packId,
    })),
  )
})

app.post('/api/mock-sessions/start', authMiddleware, (req, res) => {
  const mockBankId = typeof req.body?.mockBankId === 'string' ? req.body.mockBankId.trim() : ''
  const requestedCount = Number(req.body?.questionCount) || 0
  const blockReason = getPlanLimitBlockReason(req.user.id, 'mock_start', {
    questionCount: requestedCount || 180,
  })
  if (blockReason) return res.status(402).json({ message: blockReason, code: 'PLAN_LIMIT' })

  const requestedDuration = Number(req.body?.durationMinutes) || 0
  const userRow = getUserRow(req.user.id)
  const entitlements = getPlanEntitlements(userRow)
  const picked = pickMockExamQuestionIdsByBank(db, mockBankId)
  let questionIds = picked.questionIds
  if (!questionIds.length) {
    return res.status(400).json({ message: 'No mock questions available for the selected bank' })
  }

  if (entitlements.mockQuestionLimit != null) {
    questionIds = questionIds.slice(0, entitlements.mockQuestionLimit)
  } else if (requestedCount > 0) {
    questionIds = questionIds.slice(0, Math.min(requestedCount, questionIds.length))
  }

  const durationSafe = requestedDuration
    ? Math.min(Math.max(requestedDuration, 10), 180)
    : Math.min(180, Math.max(60, Math.ceil(questionIds.length * 1.2)))

  db.prepare('UPDATE mock_sessions SET status = ? WHERE user_id = ? AND status = ?').run(
    'abandoned',
    req.user.id,
    'active',
  )
  db.prepare(
    `
    INSERT INTO mock_sessions (
      user_id, status, question_ids, answers_json, total, duration_minutes, remaining_seconds,
      mock_bank_id, mock_bank_label, mock_session_label
    )
    VALUES (?, 'active', ?, '{}', ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    req.user.id,
    JSON.stringify(questionIds),
    questionIds.length,
    durationSafe,
    durationSafe * 60,
    picked.bankId,
    picked.bankLabel,
    picked.sessionLabel,
  )

  const session = getActiveMockSession(req.user.id)
  return res.status(201).json(formatMockSession(session))
})

app.post('/api/mock-sessions/current/answer', authMiddleware, (req, res) => {
  const session = getActiveMockSession(req.user.id)
  if (!session) return res.status(404).json({ message: 'No active mock session' })
  const { questionId, selected } = req.body || {}
  if (!['A', 'B', 'C'].includes(selected)) {
    return res.status(400).json({ message: 'Invalid answer option' })
  }

  const questionIds = JSON.parse(session.question_ids || '[]')
  if (!questionIds.includes(questionId)) {
    return res.status(400).json({ message: 'Question not part of active mock session' })
  }

  const answers = JSON.parse(session.answers_json || '{}')
  answers[questionId] = selected
  db.prepare('UPDATE mock_sessions SET answers_json = ? WHERE id = ?').run(
    JSON.stringify(answers),
    session.id,
  )

  const refreshed = getActiveMockSession(req.user.id)
  return res.json(formatMockSession(refreshed))
})

app.post('/api/mock-sessions/current/tick', authMiddleware, (req, res) => {
  const session = getActiveMockSession(req.user.id)
  if (!session) return res.status(404).json({ message: 'No active mock session' })

  const currentRemaining = Number(session.remaining_seconds || 0)
  const nextRemaining = Math.max(currentRemaining - 1, 0)

  if (nextRemaining === 0) {
    db.prepare(
      `
      UPDATE mock_sessions
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, remaining_seconds = 0
      WHERE id = ?
    `,
    ).run(session.id)
    const submitted = db.prepare('SELECT * FROM mock_sessions WHERE id = ?').get(session.id)
    return res.json(formatMockSession(submitted))
  }

  db.prepare('UPDATE mock_sessions SET remaining_seconds = ? WHERE id = ?').run(nextRemaining, session.id)
  const refreshed = getActiveMockSession(req.user.id)
  return res.json(formatMockSession(refreshed))
})

app.post('/api/mock-sessions/current/submit', authMiddleware, (req, res) => {
  const session = getActiveMockSession(req.user.id)
  if (!session) return res.status(404).json({ message: 'No active mock session' })

  const questionIds = JSON.parse(session.question_ids || '[]')
  const answers = JSON.parse(session.answers_json || '{}')
  const questionRows = getQuestionsByIds(questionIds)

  let correctCount = 0
  const upsertSubmission = db.prepare(
    `
    INSERT INTO submissions (user_id, question_id, selected, correct)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, question_id)
    DO UPDATE SET selected = excluded.selected, correct = excluded.correct, submitted_at = CURRENT_TIMESTAMP
  `,
  )
  const tx = db.transaction(() => {
    for (const q of questionRows) {
      const selected = answers[q.id]
      if (!selected || !['A', 'B', 'C'].includes(selected)) continue
      const correct = selected === q.answer ? 1 : 0
      if (correct) correctCount += 1
      upsertSubmission.run(req.user.id, q.id, selected, correct)
    }
  })
  tx()

  const topicStatsMap = new Map()
  for (const q of questionRows) {
    const selected = answers[q.id]
    if (!selected || !['A', 'B', 'C'].includes(selected)) continue
    if (!topicStatsMap.has(q.topic)) {
      topicStatsMap.set(q.topic, { topic: q.topic, total: 0, correct: 0 })
    }
    const item = topicStatsMap.get(q.topic)
    item.total += 1
    if (selected === q.answer) item.correct += 1
  }
  const topicBreakdown = Array.from(topicStatsMap.values()).map((item) => ({
    ...item,
    accuracy: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0,
  }))

  db.prepare(
    `
    UPDATE mock_sessions
    SET status = 'submitted', score = ?, submitted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
  ).run(correctCount, session.id)

  const submitted = db.prepare('SELECT * FROM mock_sessions WHERE id = ?').get(session.id)
  return res.json({ ...formatMockSession(submitted), topicBreakdown })
})

if (config.isProduction && fs.existsSync(config.staticDir)) {
  app.use(express.static(config.staticDir))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(config.staticDir, 'index.html'))
  })
}

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`CFA Sprint server running at http://localhost:${config.port} (${config.nodeEnv})`)
})

