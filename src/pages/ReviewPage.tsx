import { useStudy } from '../store/StudyContext'
import { useAuth } from '../auth/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { fetchQuestions, fetchReview } from '../api/mockApi'
import type { Question } from '../types'

export default function ReviewPage() {
  const { token } = useAuth()
  const { wrong, favorites, setFromServer } = useStudy()
  const [questions, setQuestions] = useState<Question[]>([])
  const [losFilter, setLosFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')

  useEffect(() => {
    if (!token) return
    fetchReview(token).then((review) => {
      setFromServer(review)
    })
    fetchQuestions(token).then(setQuestions)
  }, [token, setFromServer])

  const wrongQuestions = useMemo(() => {
    const base = questions.filter((q) => wrong.includes(q.id))
    return base.filter((q) => {
      const losOk = losFilter === 'all' || q.los === losFilter
      const tagOk = tagFilter === 'all' || q.tags.includes(tagFilter)
      return losOk && tagOk
    })
  }, [questions, wrong, losFilter, tagFilter])

  const losOptions = useMemo(
    () => Array.from(new Set(questions.filter((q) => wrong.includes(q.id)).map((q) => q.los))),
    [questions, wrong],
  )
  const tagOptions = useMemo(
    () =>
      Array.from(
        new Set(questions.filter((q) => wrong.includes(q.id)).flatMap((q) => q.tags)),
      ),
    [questions, wrong],
  )

  return (
    <section className="panel">
      <h2>Review Center</h2>
      <div className="actions">
        <label>
          LOS
          <select value={losFilter} onChange={(e) => setLosFilter(e.target.value)}>
            <option value="all">All</option>
            {losOptions.map((los) => (
              <option key={los} value={los}>
                {los}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tag
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="all">All</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="review-grid">
        <article>
          <h3>Wrong Question Bank</h3>
          {wrongQuestions.length === 0 ? (
            <p>No wrong questions for selected filters.</p>
          ) : (
            <div className="topic-list">
              {wrongQuestions.map((q) => (
                <div key={q.id} className="topic-row">
                  <div>
                    <strong>
                      #{q.id} {q.topic}
                    </strong>
                    <p>
                      LOS {q.los} · {q.tags.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
        <article>
          <h3>Favorites</h3>
          {favorites.length === 0 ? <p>No favorites yet.</p> : <p>{favorites.join(', ')}</p>}
        </article>
        <article>
          <h3>Weekly Plan</h3>
          <ul>
            <li>Mon-Thu: 20 practice questions/day</li>
            <li>Fri: Weak-topic recovery set</li>
            <li>Sat: 45-minute timed quiz</li>
            <li>Sun: Error log and recap</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
