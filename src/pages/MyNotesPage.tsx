import { useState } from 'react'
import { Link } from 'react-router-dom'
import { summarizeNotesWithAi, type AiNotesStudyReport } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import { usePracticeNotes } from '../hooks/usePracticeNotes'
import { buildNoteSessionPath } from '../utils/practiceNotes'

export default function MyNotesPage() {
  const { token, user } = useAuth()
  const notes = usePracticeNotes(token, user?.id)
  const [report, setReport] = useState<AiNotesStudyReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  async function handleGenerateReport() {
    if (!token || notes.length === 0) return
    setReportError('')
    setReportLoading(true)
    try {
      const result = await summarizeNotesWithAi(
        token,
        notes.map((note) => ({
          questionId: note.questionId,
          topic: note.topic,
          session: note.session,
          text: note.text,
        })),
      )
      setReport(result.report)
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Could not generate notes report.')
    } finally {
      setReportLoading(false)
    }
  }

  function handlePrintReport() {
    window.print()
  }

  return (
    <section className="panel qb-notes-page">
      <div className="qb-notes-head">
        <Link to="/study/practice" className="study-back-link">
          Back to Question Bank
        </Link>
        <div className="qb-notes-title-row">
          <div>
            <h2>My Notes</h2>
            <p className="helper-text">{notes.length} questions with saved notes</p>
            <p className="helper-text">
              CFA Institute trademarks and question-source rights require compliance review. Use notes and AI reports
              for concepts and original practice, not for sharing real exam questions.
            </p>
          </div>
          <button
            type="button"
            className="qb-notes-report-btn"
            onClick={handleGenerateReport}
            disabled={notes.length === 0 || reportLoading}
          >
            {reportLoading ? 'Generating...' : 'Generate AI Study Report'}
          </button>
        </div>
      </div>

      {reportError ? <p className="qb-notes-report-error">{reportError}</p> : null}

      {report ? (
        <section className="qb-notes-report" aria-label="AI study report">
          <div className="qb-notes-report-head">
            <div>
              <span>AI Study Report</span>
              <strong>Grouped by CFA Level I topic</strong>
            </div>
            <button type="button" className="qb-notes-print-btn" onClick={handlePrintReport}>
              Print Report
            </button>
          </div>
          <div className="qb-notes-report-grid">
            {report.topics.map((topic) => (
              <article key={topic.topic} className="qb-notes-report-topic">
                <h3>{topic.topic}</h3>
                <ReportList title="Knowledge points" items={topic.knowledgePoints} />
                <ReportList title="Common mistakes" items={topic.commonMistakes} />
                <ReportList title="Key formulas" items={topic.keyFormulas} emptyText="No formula captured from your notes yet." />
                <ReportList title="Memory hooks" items={topic.memoryHooks} />
                <ReportList title="Review actions" items={topic.reviewActions} />
                {topic.relatedQuestionIds.length > 0 ? (
                  <p className="qb-notes-related">
                    Related questions: {topic.relatedQuestionIds.map((id) => `#${id}`).join(', ')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <div className="qb-notes-overall">
            <h3>Next review plan</h3>
            <ol>
              {report.overallReviewPlan.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {notes.length === 0 ? (
        <p>No notes yet. Add notes while practicing and click Save, then come back to generate an AI study report.</p>
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

function ReportList({
  title,
  items,
  emptyText = 'Nothing captured yet.',
}: {
  title: string
  items: string[]
  emptyText?: string
}) {
  return (
    <div className="qb-notes-report-section">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
