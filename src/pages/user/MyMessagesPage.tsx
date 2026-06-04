import { useEffect, useState } from 'react'
import { fetchMessages, submitMessage, type UserMessage } from '../../api/mockApi'
import { useAuth } from '../../auth/AuthContext'
import { userCenterCopy } from '../../i18n/copy'

export default function MyMessagesPage() {
  const { token } = useAuth()
  const t = userCenterCopy
  const [messages, setMessages] = useState<UserMessage[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchMessages(token).then(setMessages)
  }, [token])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const created = await submitMessage(token, { subject, body })
      setMessages((prev) => [created, ...prev])
      setSubject('')
      setBody('')
      setSuccess(t.pages.messageSent)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pages.messageFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel user-panel lr-panel">
      <h2>{t.pages.messagesTitle}</h2>
      <p className="helper-text">{t.pages.messagesHint}</p>

      <form className="settings-block" onSubmit={(event) => void handleSubmit(event)}>
        <h3>{t.pages.newMessage}</h3>
        <label>
          {t.pages.subjectLabel}
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
        </label>
        <label>
          {t.pages.bodyLabel}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} />
        </label>
        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? t.pages.sending : t.pages.sendMessage}
          </button>
        </div>
        {success ? <p className="result ok">{success}</p> : null}
        {error ? <div className="error">{error}</div> : null}
      </form>

      <div className="message-list">
        {messages.length === 0 ? (
          <p className="helper-text">{t.pages.noMessages}</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="message-card">
              <div className="message-card-head">
                <strong>{message.subject}</strong>
                <span className={`status-tag ${message.status === 'replied' ? 'complete' : 'on-track'}`}>
                  {message.status}
                </span>
              </div>
              <p>{message.body}</p>
              <p className="meta">{message.createdAt?.slice(0, 16).replace('T', ' ')}</p>
              {message.adminReply ? (
                <div className="message-reply">
                  <strong>{t.pages.supportReply}</strong>
                  <p>{message.adminReply}</p>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  )
}
