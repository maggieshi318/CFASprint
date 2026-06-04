import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCourses, type CourseItem } from '../../api/mockApi'
import { useAuth } from '../../auth/AuthContext'
import { userCenterCopy } from '../../i18n/copy'
import type { User } from '../../types'

const PLAN_NAMES: Record<User['plan'], string> = {
  free: 'Free Trial',
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
    bankLabel: isPremium ? 'Full question bank' : 'Free trial question bank',
    bankSize: isPremium ? 42 : 40,
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
    '20 answered questions per day',
    'Try the question bank before paying',
    'Practice on desktop, tablet, and mobile',
    'Upgrade for unlimited practice',
    'Wrong-book and favorites included',
    'Upgrade anytime for full bank access',
  ]
}

function planAccessLabel(user: User | null, course: CourseItem) {
  const entitlements = user?.entitlements
  if (!entitlements) return course.isPremium ? 'Full access' : 'Starter access'
  const dailyLimit = entitlements.dailyQuestionLimit == null ? 'unlimited practice' : `${entitlements.dailyQuestionLimit}/day`
  const mockLimit =
    entitlements.mockSubmissionLimit == null ? 'unlimited mocks' : `${entitlements.mockSubmissionLimit} mock`
  return `${course.isPremium ? 'Full bank' : 'Starter bank'} | ${dailyLimit} | ${mockLimit}`
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
