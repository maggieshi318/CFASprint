import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { updateUserSettings } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import { copyFor, userCenterCopy } from '../i18n/copy'
import { bootstrapStudyReminder, syncStudyReminder } from '../native/studyReminders'
import { initRemotePush } from '../native/pushNotifications'

export default function SettingsPage() {
  const { token, user, locale, setLocale, refreshUser } = useAuth()
  const account = userCenterCopy
  const t = copyFor('en')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('20:00')
  const [examDate, setExamDate] = useState('')
  const [weeklyGoal, setWeeklyGoal] = useState(50)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setReminderEnabled(user.reminderEnabled)
    setReminderTime(user.reminderTime)
    setExamDate(user.examDate || '')
    setWeeklyGoal(user.weeklyGoal || 50)
  }, [user])

  useEffect(() => {
    if (!user) return
    void bootstrapStudyReminder(user.reminderEnabled, user.reminderTime)
  }, [user])

  async function handleSaveStudyPlan() {
    if (!token) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateUserSettings(token, {
        examDate: examDate || null,
        weeklyGoal,
      })
      await refreshUser(updated)
      setMessage(t.settings.studyPlanSaved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save study plan')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveReminders() {
    if (!token) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await updateUserSettings(token, {
        reminderEnabled,
        reminderTime,
      })
      await refreshUser(updated)
      const result = await syncStudyReminder(reminderEnabled, reminderTime)
      if (result.mode === 'web') {
        setMessage('Reminder saved. Native daily notifications work in the iOS/Android app.')
      } else if (result.permissionDenied) {
        setError('Notification permission denied on this device.')
      } else if (result.scheduled) {
        setMessage(`Daily reminder scheduled for ${reminderTime}.`)
      } else {
        setMessage('Daily reminder disabled.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel lr-panel">
      <h2>{account.pages.accountTitle}</h2>

      <article className="settings-block">
        <h3>Language</h3>
        <div className="actions">
          <button type="button" className={locale === 'en' ? 'primary-btn' : 'plain-btn'} onClick={() => void setLocale('en')}>
            English
          </button>
          <button type="button" className={locale === 'zh' ? 'primary-btn' : 'plain-btn'} onClick={() => void setLocale('zh')}>
            中文
          </button>
        </div>
      </article>

      <article className="settings-block">
        <h3>{t.settings.studyPlanTitle}</h3>
        <label>
          {t.settings.examLabel}
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </label>
        <label>
          {t.settings.weeklyLabel}
          <input
            type="number"
            min={10}
            max={500}
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(Number(e.target.value))}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={() => void handleSaveStudyPlan()} disabled={saving}>
            {saving ? (locale === 'zh' ? '保存中...' : 'Saving...') : t.settings.saveStudyPlan}
          </button>
        </div>
      </article>

      <article className="settings-block">
        <h3>Study reminder</h3>
        <p className="helper-text">
          Daily local notification on mobile. Web/PWA users can rely on calendar or device reminders separately.
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
          Enable daily study reminder
        </label>
        <label>
          Reminder time
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            disabled={!reminderEnabled}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={() => void handleSaveReminders()} disabled={saving}>
            {saving ? 'Saving...' : 'Save reminder'}
          </button>
        </div>
        {message ? <p className="result ok">{message}</p> : null}
        {error ? <div className="error">{error}</div> : null}
      </article>

      <article className="settings-block">
        <h3>Campaign push (mobile app)</h3>
        <p className="helper-text">
          Register this device for admin broadcast messages (FCM/APNs). Requires Firebase setup in production.
        </p>
        <div className="actions">
          <button
            type="button"
            onClick={() => token && void initRemotePush(token).then((result) => {
              if (result.mode === 'web') setMessage('Campaign push registration works in the native iOS/Android app.')
              else if (result.permissionDenied) setError('Push permission denied.')
              else setMessage('Device registered for campaign push.')
            })}
          >
            Enable campaign push
          </button>
        </div>
      </article>

      <article className="settings-block">
        <h3>Legal</h3>
        <p className="helper-text">
          <Link to="/privacy">Privacy Policy</Link> · <Link to="/terms">Terms of Service</Link>
        </p>
      </article>
    </section>
  )
}
