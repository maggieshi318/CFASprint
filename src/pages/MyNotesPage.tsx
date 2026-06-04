import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { usePracticeNotes } from '../hooks/usePracticeNotes'
import { buildNoteSessionPath } from '../utils/practiceNotes'

export default function MyNotesPage() {
  const { user } = useAuth()
  const notes = usePracticeNotes(user?.id)

  return (
    <section className="panel qb-notes-page">
      <div className="qb-notes-head">
        <Link to="/study/practice" className="study-back-link">
          ← Question Bank
        </Link>
        <h2>My Notes</h2>
        <p className="helper-text">{notes.length} questions with saved notes</p>
      </div>

      {notes.length === 0 ? (
        <p>No notes yet. Add notes while practicing and click Save.</p>
      ) : (
        <div className="qb-notes-list">
          {notes.map((note) => (
            <article key={note.questionId} className="qb-note-card">
              <div className="qb-note-card-head">
                <strong>Question #{note.questionId}</strong>
                {note.topic ? <span className="qb-note-topic">{note.topic}</span> : null}
              </div>
              <p className="qb-note-preview">{note.text}</p>
              <Link to={buildNoteSessionPath(note)} className="qb-widget-btn">
                Open question
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
