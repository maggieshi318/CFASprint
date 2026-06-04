import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCourses, type CourseItem } from '../../api/mockApi'
import { useAuth } from '../../auth/AuthContext'
import { userCenterCopy } from '../../i18n/copy'
import type { User } from '../../types'

const PLAN_NAMES: Record<User['plan'], string> = {
  free: 'Account Only',
  trial_monthly: '1-Month Trial',
  paid_lifetime: 'Full Access',
  pro_quarterly: 'Full Access',
  pass_pack: 'Full Access',
}

function buildFallbackCourse(user: User | null): CourseItem {
  const isPremium = user?.isPremium ?? false
  const plan = user?.plan ?? 'free'

  return {
    id: 'cfa-l1-2026',
    title: 'CFA Level I Question Bank 2026',
    subtitle: 'Practice bank | timed mocks | sprint plan | review center',
    plan,
    planName: PLAN_NAMES[plan] || plan,
    isPremium,
    expiresAt: user?.subscriptionExpiresAt ?? null,
    studyPath: '/study/statistics',
    bankPath: '/study/practice',
    bankLabel: isPremium ? 'Full question bank' : 'Trial payment required',
    bankSize: isPremium ? 42 : 0,
    totalBankSize: 42,
  }
}

function normalizeCourse(course: CourseItem): CourseItem {
  return {
    ...course,
    studyPath: course.studyPath || '/study/statistics',
    bankPath: course.bankPath || '/study/practice',
  }
}

function featureList(course: CourseItem) {
  if (course.isPremium) {
    if (course.plan === 'trial_monthly') {
      return [
        '30 days full question bank access',
        'Full timed mock exams with score reports',
        'Practice on desktop, tablet, and mobile',
        'Wrong-book, favorites, and review center',
        'Continue with AED 99 Full Access after trial',
      ]
    }
    return [
      '2026 official-style practice questions (full bank)',
      'Full timed mock exams with score reports',
      'Practice on desktop, tablet, and mobile',
      'Unlimited mock exam sessions included',
      'Wrong-book, favorites, and review center',
      'One-time payment, no subscription',
    ]
  }

  return [
    'Start AED 9.9 trial to unlock all questions',
    'Trial lasts 30 days with full question bank access',
    'Practice on desktop, tablet, and mobile',
    'Continue with AED 99 Full Access after trial',
    'Wrong-book and favorites included',
    'Referral rewards available after Full Access purchases',
  ]
}

function planAccessLabel(user: User | null, course: CourseItem) {
  const entitlements = user?.entitlements
  if (!entitlements) return course.isPremium ? 'Full access' : 'Trial payment required'
  const dailyLimit = entitlements.dailyQuestionLimit == null ? 'unlimited practice' : `${entitlements.dailyQuestionLimit}/day`
  const mockLimit =
    entitlements.mockSubmissionLimit == null ? 'unlimited mocks' : `${entitlements.mockSubmissionLimit} mock`
  return `${course.isPremium ? 'Full bank' : 'Payment required'} | ${dailyLimit} | ${mockLimit}`
}

export default function MyCoursesPage() {
  const { token, user } = useAuth()
  const t = userCenterCopy
  const fallbackCourse = useMemo(() => buildFallbackCourse(user), [user])
  const [courses, setCourses] = useState<CourseItem[]>([])

  useEffect(() => {
    if (!token) return

    fetchCourses(token)
      .then((items) => {
        const next = items.length ? items.map(normalizeCourse) : [fallbackCourse]
        setCourses(next)
      })
      .catch(() => {
        setCourses([fallbackCourse])
      })
  }, [token, fallbackCourse])

  const displayCourses = courses.length ? courses : [fallbackCourse]

  return (
    <section className="lr-courses-section">
      <div className="commercial-course-head">
        <div>
          <p className="marketing-kicker">Your CFA Level I workspace</p>
          <h2 className="lr-section-title">My Courses</h2>
          <p>Pick up practice on any device. Your plan controls how much of the bank and mock exams are unlocked.</p>
        </div>
        {!user?.isPremium ? (
          <Link to="/pricing" className="commercial-upgrade-btn">
            Unlock full access
          </Link>
        ) : null}
      </div>

      <div className="lr-course-list">
        {displayCourses.map((course) => (
          <article key={course.id} className="lr-course-card">
            <div className="lr-course-card-head">
              <span className="lr-course-icon" aria-hidden="true">
                QB
              </span>
              <div>
                <h3>Online Question Bank</h3>
                <p className="lr-course-subtitle">
                  {course.title} |{' '}
                  <Link to={course.bankPath} className="lr-bank-link">
                    {course.bankLabel}
                  </Link>
                </p>
              </div>
            </div>

            <div className="commercial-course-metrics">
              <div>
                <strong>{course.bankSize}</strong>
                <span>Available questions</span>
              </div>
              <div>
                <strong>{course.isPremium ? 'Full' : 'Starter'}</strong>
                <span>Mock exam access</span>
              </div>
              <div>
                <strong>3 screens</strong>
                <span>Phone, tablet, desktop</span>
              </div>
            </div>

            <div className="lr-feature-box">
              <ul className="lr-feature-grid">
                {featureList(course).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="lr-course-card-foot">
              <p className="lr-plan-meta">
                Plan: <strong>{course.planName}</strong>
                {course.expiresAt ? ` | Expires ${course.expiresAt.slice(0, 10)}` : ''}
              </p>
              <p className="lr-plan-meta">{planAccessLabel(user, course)}</p>
              <div className="commercial-course-actions">
                <Link to={course.bankPath || '/study/practice'} className="lr-start-btn secondary">
                  Question Bank
                </Link>
                <Link to={course.studyPath || '/study/statistics'} className="lr-start-btn">
                  {t.pages.startLearning}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
