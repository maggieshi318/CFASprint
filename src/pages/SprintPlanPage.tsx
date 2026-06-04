import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSprintPlan } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import { copyFor } from '../i18n/copy'

type SprintPlan = Awaited<ReturnType<typeof fetchSprintPlan>>

export default function SprintPlanPage() {
  const { token, user, locale } = useAuth()
  const t = copyFor(locale)
  const [plan, setPlan] = useState<SprintPlan | null>(null)

  useEffect(() => {
    if (!token) return
    fetchSprintPlan(token).then(setPlan)
  }, [token])

  if (!plan) return <section className="panel">{t.sprint.loading}</section>

  return (
    <section className="panel">
      <h2>{t.sprint.title}</h2>
      {user?.examDaysRemaining != null ? (
        <p className="helper-text">
          <strong>{t.sprint.daysUntil(user.examDaysRemaining, user.examDate)}</strong>
        </p>
      ) : null}

      <article className="settings-block">
        <h3>{t.sprint.weeklyTitle}</h3>
        <p>{t.sprint.weeklyProgress(plan.weekly.completedThisWeek, plan.weekly.weeklyGoal)}</p>
        <div className="goal-progress-wrap">
          <div className="goal-progress" style={{ width: `${plan.weekly.progressPct}%` }} />
        </div>
        <p className="helper-text">{t.sprint.weeklyPct(plan.weekly.progressPct)}</p>
      </article>

      <div className="topic-list">
        {plan.weeks.map((week) => (
          <div key={week.week} className="topic-row sprint-week">
            <div>
              <strong>{t.sprint.weekLabel(week.week, week.title)}</strong>
              <p>{week.focus}</p>
              <p className="meta">
                {t.sprint.topics}: {week.topics.join(', ')}
              </p>
              <p className="topic-links">
                {week.topics.map((topic) => (
                  <Link key={topic} to={`/study/practice?topic=${encodeURIComponent(topic)}`}>
                    {t.sprint.practiceTopic(topic)}
                  </Link>
                ))}
              </p>
              <p>
                {t.sprint.questions(week.completed, week.targetQuestions)} ·{' '}
                <span className={`status-tag ${week.status}`}>
                  {t.sprint.status[week.status]}
                </span>
              </p>
              <div className="goal-progress-wrap compact">
                <div className="goal-progress" style={{ width: `${week.progressPct}%` }} />
              </div>
            </div>
            <span>{week.progressPct}%</span>
          </div>
        ))}
      </div>

      <p className="helper-text">
        <Link to="/study/practice">{t.sprint.startPractice}</Link> · <Link to="/study/mock-exam">{t.sprint.takeMock}</Link>
      </p>
    </section>
  )
}
