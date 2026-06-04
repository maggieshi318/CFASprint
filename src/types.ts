export type Answer = 'A' | 'B' | 'C'

export type Question = {
  id: number
  topic: string
  los: string
  examYear: number
  tags: string[]
  difficulty: 'Easy' | 'Medium' | 'Hard'
  stem: string
  options: Record<Answer, string>
  answer: Answer
  explanation: string
}

export type User = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin'
  locale: 'en' | 'zh'
  emailVerified: boolean
  reminderEnabled: boolean
  reminderTime: string
  examDate: string | null
  weeklyGoal: number
  onboardingCompleted: boolean
  examDaysRemaining: number | null
  plan: 'free' | 'paid_lifetime' | 'pro_quarterly' | 'pass_pack'
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled'
  subscriptionExpiresAt: string | null
  isPremium: boolean
  entitlements: {
    bankAccess: 'starter' | 'full'
    dailyQuestionLimit: number | null
    mockQuestionLimit: number | null
    mockSubmissionLimit: number | null
    analytics: 'basic' | 'full' | 'merchant'
  }
}

export type PricingPlan = {
  planId: 'free' | 'paid_lifetime'
  name: string
  price: string
  originalPrice?: string
  badge?: string
  features: string[]
  highlighted?: boolean
  checkoutable: boolean
}

export type StudyStats = {
  totalQuestions: number
  completed: number
  correct: number
  wrong: number
  accuracy: number
}

export type MockSession = {
  id: number
  status: 'active' | 'submitted' | 'abandoned'
  score: number
  total: number
  durationMinutes?: number
  remainingSeconds?: number
  startedAt: string
  submittedAt: string | null
  questionIds: number[]
  answers: Record<string, Answer>
  questions: Question[]
  mockBankId?: string | null
  mockBankLabel?: string | null
  mockSessionLabel?: string | null
}
