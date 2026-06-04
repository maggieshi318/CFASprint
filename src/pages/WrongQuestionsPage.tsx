import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { bookmarkGroupTitle } from '../constants/questionBankDisplay'
import { useStudy } from '../store/StudyContext'
import { buildWrongGroupSessionPath } from '../utils/studyReview'

type WrongGroup = {
  key: string
  title: string
  count: number
  sessionPath: string
}

function groupWrongQuestions(
  wrongQuestions: {
    id: number
    topic: string
    pack?: string
  }[],
): WrongGroup[] {
  const groups = new Map<string, WrongGroup>()

  for (const question of wrongQuestions) {
    const pack = question.pack || '2026-practice'
    const key = `${pack}::${question.topic}`
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    groups.set(key, {
      key,
      title: bookmarkGroupTitle(pack, question.topic),
      count: 1,
      sessionPath: buildWrongGroupSessionPath(pack, question.topic),
    })
  }

  return [...groups.values()]
}

export default function WrongQuestionsPage() {
  const { wrongQuestions } = useStudy()
  const groups = useMemo(() => groupWrongQuestions(wrongQuestions), [wrongQuestions])

  return (
    <section className="bookmark-page">
      <nav className="bookmark-breadcrumb" aria-label="Breadcrumb">
        <Link to="/user/courses">Learning Center</Link>
        <span>/</span>
        <span>Wrong Question Practice</span>
      </nav>

      {groups.length === 0 ? (
        <div className="bookmark-empty panel">
          <p>No wrong questions yet. Incorrect answers during practice are saved here automatically.</p>
        </div>
      ) : (
        <div className="bookmark-group-list">
          {groups.map((group) => (
            <article key={group.key} className="bookmark-group-row">
              <div className="bookmark-group-copy">
                <h2>{group.title}</h2>
                <p>{group.count} question{group.count === 1 ? '' : 's'}</p>
              </div>
              <Link to={group.sessionPath} className="bookmark-start-btn">
                Start Practice
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
