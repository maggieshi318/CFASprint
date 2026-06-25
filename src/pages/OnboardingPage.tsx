import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateFounderFunnel, updateUserSettings } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import { copyFor } from '../i18n/copy'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { token, locale, refreshUser } = useAuth()
  const t = copyFor(locale)
  const [step, setStep] = useState(1)
  const [examWindow, setExamWindow] = useState<'aug_2026' | 'nov_2026'>('nov_2026')
  const [examDate, setExamDate] = useState('2026-11-11')
  const [weeklyGoal, setWeeklyGoal] = useState(50)
  const [dailyCheckinWilling, setDailyCheckinWilling] = useState(false)
  const [freeTrialFeedbackWilling, setFreeTrialFeedbackWilling] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleExamWindowChange(value: 'aug_2026' | 'nov_2026') {
    setExamWindow(value)
    setExamDate(value === 'aug_2026' ? '2026-08-25' : '2026-11-11')
  }

  async function finish() {
    if (!token) return
    setSaving(true)
    try {
      const updated = await updateUserSettings(token, {
        examDate,
        weeklyGoal,
        onboardingCompleted: true,
      })
      await updateFounderFunnel(token, {
        source: 'product_onboarding',
        examWindow,
        dailyCheckinWilling,
        freeTrialFeedbackWilling,
        activationStarted: true,
      })
      await refreshUser(updated)
      navigate('/user/courses')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel onboarding">
      <h2>{t.onboarding.title}</h2>
      <p className="meta">{t.onboarding.step(step)}</p>

      {step === 1 && (
        <article className="settings-block">
          <h3>{t.onboarding.examTitle}</h3>
          <p className="helper-text">{t.onboarding.examHint}</p>
          <label>
            Exam window
            <select
              value={examWindow}
              onChange={(event) => handleExamWindowChange(event.target.value as 'aug_2026' | 'nov_2026')}
            >
              <option value="aug_2026">August 2026</option>
              <option value="nov_2026">November 2026</option>
            </select>
          </label>
          <label>
            {t.onboarding.examLabel}
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </label>
          <div className="actions">
            <button type="button" onClick={() => setStep(2)}>
              {t.onboarding.continue}
            </button>
          </div>
        </article>
      )}

      {step === 2 && (
        <article className="settings-block">
          <h3>{t.onboarding.goalTitle}</h3>
          <p className="helper-text">{t.onboarding.goalHint}</p>
          <label>
            {t.onboarding.goalLabel}
            <input
              type="number"
              min={10}
              max={500}
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(Number(e.target.value))}
            />
          </label>
          <div className="actions">
            <button type="button" className="plain-btn" onClick={() => setStep(1)}>
              {t.onboarding.back}
            </button>
            <button type="button" onClick={() => setStep(3)}>
              {t.onboarding.continue}
            </button>
          </div>
        </article>
      )}

      {step === 3 && (
        <article className="settings-block">
          <h3>{t.onboarding.confirmTitle}</h3>
          <ul>
            <li>{t.onboarding.confirmExam(examDate)}</li>
            <li>{t.onboarding.confirmGoal(weeklyGoal)}</li>
            <li>{t.onboarding.confirmUnlock}</li>
          </ul>
          <label className="practice-radio">
            <input
              type="checkbox"
              checked={dailyCheckinWilling}
              onChange={(event) => setDailyCheckinWilling(event.target.checked)}
            />
            I am willing to do daily check-ins during the Founder trial.
          </label>
          <label className="practice-radio">
            <input
              type="checkbox"
              checked={freeTrialFeedbackWilling}
              onChange={(event) => setFreeTrialFeedbackWilling(event.target.checked)}
            />
            I am willing to share feedback after the free trial.
          </label>
          <div className="actions">
            <button type="button" className="plain-btn" onClick={() => setStep(2)}>
              {t.onboarding.back}
            </button>
            <button type="button" onClick={() => void finish()} disabled={saving}>
              {saving ? t.onboarding.saving : t.onboarding.start}
            </button>
          </div>
        </article>
      )}
    </section>
  )
}
