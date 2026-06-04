import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchMockSessionDetail } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import type { MockSession } from '../types'

export default function MockSessionDetailPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const { token } = useAuth()
  const [detail, setDetail] = useState<
    (MockSession & {
      topicBreakdown?: Array<{ topic: string; total: number; correct: number; accuracy: number }>
    }) | null
  >(null)

  useEffect(() => {
    if (!token || !sessionId) return
    fetchMockSessionDetail(token, sessionId).then(setDetail)
  }, [token, sessionId])

  if (!detail) return <section className="panel">Loading mock session detail...</section>

  return (
    <section className="panel">
      <h2>Mock Session #{detail.id} Report</h2>
      <p className="meta">
        Score: {detail.score}/{detail.total} · Status: {detail.status}
      </p>
      <h3>Topic Breakdown</h3>
      <div className="topic-list">
        {(detail.topicBreakdown || []).map((item) => (
          <div key={item.topic} className="topic-row">
            <div>
              <strong>{item.topic}</strong>
              <p>
                {item.correct}/{item.total} correct
              </p>
            </div>
            <span>{item.accuracy}%</span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: '1rem' }}>Question Playback</h3>
      <div className="topic-list">
        {detail.questions.map((q) => {
          const selected = detail.answers[String(q.id)]
          const isCorrect = selected === q.answer
          return (
            <div key={q.id} className="topic-row">
              <div>
                <strong>
                  #{q.id} {q.topic} ({q.los})
                </strong>
                <p>
                  Selected: {selected || '-'} | Correct: {q.answer}
                </p>
              </div>
              <span>{isCorrect ? 'OK' : 'Wrong'}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
