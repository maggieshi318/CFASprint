import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { usePracticeNotes } from '../hooks/usePracticeNotes'
import { useStudy } from '../store/StudyContext'

export default function StudySidebarPanels() {
  const { user } = useAuth()
  const notes = usePracticeNotes(user?.id)
  const { wrong, favorites } = useStudy()

  return (
    <>
      <Link to="/study/notes" className="study-nav-chip">
        <span className="study-nav-chip-label">My Notes</span>
        <span className="study-nav-chip-meta">{notes.length}</span>
      </Link>
      <Link to="/study/wrong-questions" className="study-nav-chip">
        <span className="study-nav-chip-label">Wrong Questions</span>
        <span className="study-nav-chip-meta">{wrong.length}</span>
      </Link>
      <Link to="/study/bookmarked-questions" className="study-nav-chip">
        <span className="study-nav-chip-label">Bookmarked Questions</span>
        <span className="study-nav-chip-meta">{favorites.length}</span>
      </Link>
      <Link to="/study/mock-exam" className="study-nav-chip">
        <span className="study-nav-chip-label">Full Mock Exam</span>
      </Link>
    </>
  )
}
