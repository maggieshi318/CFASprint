import { useEffect, useMemo, useRef, useState } from 'react'

type MockExamTutorialIntroProps = {
  candidateId: string
  loading?: boolean
  onExit: () => void
  onStartTest: () => void
}

const TUTORIAL_PAGES = 14
const INTRO_SECONDS = 15 * 60 - 3
const TUTORIAL_PRACTICE_OPTIONS = [
  { key: 'A', label: 'Estonia' },
  { key: 'B', label: 'Ukraine' },
  { key: 'C', label: 'Belgium' },
] as const
const TUTORIAL_STRIKEOUT_OPTIONS = [
  { key: 'A', label: 'Golden eagle' },
  { key: 'B', label: 'Wandering albatross' },
  { key: 'C', label: 'California condor' },
] as const

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function MockTutorialEssayEditor() {
  const editorRef = useRef<HTMLDivElement>(null)

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
  }

  return (
    <div className="mock-tutorial-essay-editor">
      <div className="mock-tutorial-essay-toolbar" role="toolbar" aria-label="Formatting toolbar">
        <button type="button" className="mock-tutorial-essay-tool" onClick={() => runCommand('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" className="mock-tutorial-essay-tool" onClick={() => runCommand('italic')}>
          <em>I</em>
        </button>
        <button type="button" className="mock-tutorial-essay-tool" onClick={() => runCommand('underline')}>
          <span className="mock-tutorial-essay-underline">U</span>
        </button>
        <span className="mock-tutorial-essay-tool-divider" aria-hidden="true" />
        <button
          type="button"
          className="mock-tutorial-essay-tool"
          onClick={() => runCommand('justifyLeft')}
          aria-label="Align left"
        >
          ≡
        </button>
        <button
          type="button"
          className="mock-tutorial-essay-tool"
          onClick={() => runCommand('justifyCenter')}
          aria-label="Align center"
        >
          ☰
        </button>
        <button
          type="button"
          className="mock-tutorial-essay-tool"
          onClick={() => runCommand('justifyRight')}
          aria-label="Align right"
        >
          ≡
        </button>
        <span className="mock-tutorial-essay-tool-divider" aria-hidden="true" />
        <button type="button" className="mock-tutorial-essay-tool" onClick={() => runCommand('undo')}>
          ↶
        </button>
        <button type="button" className="mock-tutorial-essay-tool" onClick={() => runCommand('redo')}>
          ↷
        </button>
      </div>
      <div
        ref={editorRef}
        className="mock-tutorial-essay-input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Essay response"
      />
    </div>
  )
}

const SECTION_REVIEW_CELLS = [
  { n: 1 },
  { n: 2 },
  { n: 3 },
  { n: 4, flagged: true },
  { n: 5 },
  { n: 6 },
  { n: 7, attempted: true, flagged: true },
  { n: 8 },
  { n: 9 },
  { n: 10 },
  { n: 11 },
  { n: 12, current: true },
  { n: 13 },
  { n: 14 },
  { n: 15, attempted: true, corner: true },
  { n: 16 },
  { n: 17 },
  { n: 18 },
  { n: 19 },
  { n: 20 },
] as const

function MockTutorialSectionReviewDemo() {
  return (
    <div className="mock-tutorial-review-panel" aria-hidden="true">
      <div className="mock-tutorial-review-panel-header">
        <span>Section Review</span>
        <div className="mock-tutorial-review-panel-tools">
          <span className="mock-tutorial-review-lock">🔓</span>
          <span className="mock-tutorial-review-close">✕</span>
        </div>
      </div>
      <div className="mock-tutorial-review-panel-filters">
        <span className="mock-tutorial-review-filter-label">Filter by:</span>
        <label>
          <input type="checkbox" readOnly /> Unattempted
        </label>
        <label>
          <input type="checkbox" readOnly /> Attempted
        </label>
        <label>
          <input type="checkbox" readOnly /> Flagged
        </label>
        <button type="button" className="mock-tutorial-review-clear">
          Clear
        </button>
      </div>
      <div className="mock-tutorial-review-panel-grid">
        {SECTION_REVIEW_CELLS.map((cell) => (
          <div
            key={cell.n}
            className={[
              'mock-tutorial-review-cell',
              'current' in cell && cell.current ? 'current' : '',
              'attempted' in cell && cell.attempted ? 'attempted' : '',
              'flagged' in cell && cell.flagged ? 'flagged' : '',
              'corner' in cell && cell.corner ? 'corner' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {cell.n}
            {'flagged' in cell && cell.flagged ? (
              <span className="mock-tutorial-review-cell-flag">⚑</span>
            ) : null}
            {'corner' in cell && cell.corner ? (
              <span className="mock-tutorial-review-cell-corner" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MockExamTutorialIntro({
  candidateId,
  loading = false,
  onExit,
  onStartTest,
}: MockExamTutorialIntroProps) {
  const [page, setPage] = useState(1)
  const [remainingSeconds, setRemainingSeconds] = useState(INTRO_SECONDS)
  const [practiceChoice, setPracticeChoice] = useState<string | null>(null)
  const [strikeoutChoice, setStrikeoutChoice] = useState<string | null>(null)
  const [struckOutOptions, setStruckOutOptions] = useState<string[]>([])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (page !== 7) setPracticeChoice(null)
  }, [page])

  useEffect(() => {
    if (page !== 11) {
      setStrikeoutChoice(null)
      setStruckOutOptions([])
    }
  }, [page])

  const progressPct = useMemo(() => Math.round(((page - 1) / TUTORIAL_PAGES) * 100), [page])

  function handleNext() {
    if (page < TUTORIAL_PAGES) {
      setPage((prev) => prev + 1)
      return
    }
    onStartTest()
  }

  function handleBack() {
    if (page > 1) setPage((prev) => prev - 1)
  }

  function renderPageContent() {
    if (page === 1) {
      return (
        <>
          <h2>Tutorial Introduction</h2>
          <div className="mock-tutorial-copy">
            <div>
              <p>
                The screens that follow provide a tutorial to familiarize you with the software
                features. This tutorial is not a mock exam and will be available on exam day.
              </p>
              <p>
                Review the sample questions and then click the &quot;Finish Section&quot; button in the
                top-right corner of the screen. A pop-up message will ask you to confirm that you
                want to finish the section.
              </p>
              <p>
                Once you finish a section, you will not be able to return to it. You will not earn
                or lose points during this tutorial.
              </p>
              <p>
                The gear icon is used to change the color scheme. The question mark icon is used to
                view this information screen again.
              </p>
              <p>To begin the tutorial, click &quot;Next&quot; to continue.</p>
            </div>
            <div className="mock-tutorial-icons" aria-hidden="true">
              <div className="mock-tutorial-icon-card">⚙</div>
              <div className="mock-tutorial-icon-card">?</div>
            </div>
          </div>
        </>
      )
    }

    if (page === 2) {
      return (
        <div className="mock-tutorial-simple-copy">
          <h2>Welcome to the Tutorial</h2>
          <p>
            This tutorial provides a series of screens that orient you to the computer testing
            environment. You will be instructed on how to use the mouse and the different parts of
            the screen.
          </p>
          <p>
            Notice the timer at the top of the screen. A similar display will appear during the
            actual exam. To the left of the screen is a numbered list that shows you where you are
            in the series of examination questions (or in this case, screens of the tutorial).
            Other screen features are described later in the tutorial.
          </p>
          <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
        </div>
      )
    }

    if (page === 3) {
      return (
        <div className="mock-tutorial-simple-copy">
          <h2>Using the Mouse</h2>
          <div className="mock-tutorial-mouse-icon" aria-hidden="true">
            ↖
          </div>
          <p>
            The mouse pointer moves when you move the mouse around on a surface. Although it can
            assume different shapes, the arrow shown above is most common. To point with the mouse,
            move the pointer until it rests on the desired object. To click on an object, point to
            it and then quickly press and release the left mouse button.
          </p>
          <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
        </div>
      )
    }

    if (page === 4) {
      return (
        <div className="mock-tutorial-nav-page">
          <h2>Navigating Through the Exam</h2>
          <div className="mock-tutorial-nav-copy">
            <div>
              <p>
                Near the bottom of the screen are &quot;Next&quot; and &quot;Back&quot; buttons. Use these buttons
                to move between questions in the exam.
              </p>
              <p>
                Notice the list of numbered buttons to the left of the screen. You can point to one
                and left-click on the desired button to go to a specific question in the exam. In
                the actual exam, each numbered button represents a question. In this tutorial, each
                numbered button represents a screen in the tutorial.
              </p>
              <p>
                Different question states will be indicated by button color and other symbols. For
                example:
              </p>
              <ul className="mock-tutorial-nav-list">
                <li>
                  The current question will be indicated by an arrow-shaped numbered button.
                </li>
                <li>
                  Questions that have been attempted will be indicated by a button that is a darker
                  color than the ones shown above.
                </li>
                <li>Unattempted questions will remain the color as above.</li>
                <li>
                  Questions that have been flagged for review are indicated by a flag icon on the
                  numbered button.
                </li>
              </ul>
              <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
            </div>
            <div className="mock-tutorial-nav-legend" aria-hidden="true">
              <div className="mock-tutorial-nav-demo-btn current">
                <span className="mock-tutorial-nav-demo-arrow" />
                17
              </div>
              <div className="mock-tutorial-nav-demo-btn attempted">18</div>
              <div className="mock-tutorial-nav-demo-btn unattempted">19</div>
              <div className="mock-tutorial-nav-demo-btn flagged">
                20
                <span className="mock-tutorial-nav-demo-flag">⚑</span>
              </div>
              <div className="mock-tutorial-nav-scroll">▼</div>
            </div>
          </div>
        </div>
      )
    }

    if (page === 5) {
      return (
        <div className="mock-tutorial-simple-copy">
          <h2>Time Remaining</h2>
          <p>The amount of time remaining is displayed at the top of the screen.</p>
          <div className="mock-tutorial-timer-demo" aria-hidden="true">
            <span className="mock-tutorial-clock">🕒</span>
            <span className="mock-tutorial-timer-demo-label">Section Time Remaining</span>
            <strong>01:59:46</strong>
          </div>
          <p>
            Each section of this examination is allocated a specific amount of time, including the
            Tutorial and Survey. There is also an overall amount of time provided for your full exam
            appointment. Clicking on the clock will switch between the amount of time remaining in
            the current section of the exam and the amount of overall time remaining for the full
            exam appointment.
          </p>
          <p>
            The most important time display for you as a test taker is the &quot;Section Time
            Remaining.&quot;
          </p>
          <p>
            Note that, where applicable, an alert box will appear below the exam clock to signal
            when 30 minutes, 15 minutes, and 5 minutes remain in the current section.
          </p>
          <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
        </div>
      )
    }

    if (page === 6) {
      return (
        <div className="mock-tutorial-flag-page">
          <h2>Flagging Questions</h2>
          <div className="mock-tutorial-flag-copy">
            <div>
              <div className="mock-tutorial-flag-icon" aria-hidden="true">
                ⚑
              </div>
              <p>
                You can flag a question as a reminder to go back and check your answer or attempt
                it later. To flag a question, click the &quot;Flag&quot; button displayed at the bottom
                of the exam screen.
              </p>
              <p>
                Any questions that are flagged for review will show a flag icon on the numbered
                button, as shown below.
              </p>
              <p>Click the &quot;Flag&quot; button again to remove the flag.</p>
              <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
            </div>
            <div className="mock-tutorial-flag-visual" aria-hidden="true">
              <div className="mock-tutorial-nav-demo-btn flagged mock-tutorial-flag-demo-btn">
                <span className="mock-tutorial-nav-demo-arrow" />
                1
                <span className="mock-tutorial-nav-demo-flag">⚑</span>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (page === 7) {
      return (
        <div className="mock-tutorial-mcq-page">
          <h2>Answering Multiple-Choice Questions</h2>
          <p>
            To answer a multiple-choice question, click the option that you believe to be the single
            best answer. Once selected, the option will appear darker in color.
          </p>
          <p>
            To change your selection, simply click a different option. To unselect an option, click
            it again.
          </p>
          <p className="mock-tutorial-emphasis">
            Practice answering the multiple-choice question below. Once you have finished practicing,
            click the &quot;Next&quot; button to continue.
          </p>
          <p className="mock-tutorial-mcq-stem">Tallinn is the capital of which country?</p>
          <div className="mock-tutorial-mcq-options" role="radiogroup" aria-label="Practice question">
            {TUTORIAL_PRACTICE_OPTIONS.map((option) => {
              const selected = practiceChoice === option.key
              return (
                <div key={option.key} className="mock-tutorial-mcq-row">
                  <span className="mock-tutorial-mcq-label">{option.key}</span>
                  <button
                    type="button"
                    className={`mock-tutorial-mcq-option ${selected ? 'selected' : ''}`}
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setPracticeChoice((prev) => (prev === option.key ? null : option.key))
                    }
                  >
                    {option.label}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (page === 8) {
      return (
        <div className="mock-tutorial-essay-page">
          <h2>Answering Essay Questions</h2>
          <p>
            Essay questions require you to respond to a question or scenario using your keyboard. You
            will need to compose and type your answer in the response box provided below the question
            or case information.
          </p>
          <p>
            Essay questions will be presented along with specific instructions about the amount of
            text required and response presentation. You may change font size, apply formatting
            (bold, italic, underline), change alignment, and use Cut/Copy/Paste from the toolbar.
          </p>
          <p className="mock-tutorial-emphasis">
            Practice answering the essay question below. Once you have finished practicing, click the
            &quot;Next&quot; button to continue.
          </p>
          <p>
            <strong>Determine</strong> which bond best meets the advisor&apos;s objective. (Bond X, Bond Y,
            Bond Z)
          </p>
          <p>
            <strong>Justify</strong> your response.
          </p>
          <p>
            For this question, a candidate is expected to type two answers in the response box: the
            name of the bond that best meets the objective, and a reason why it best meets the
            objective.
          </p>
          <MockTutorialEssayEditor key={page} />
        </div>
      )
    }

    if (page === 9) {
      return (
        <div className="mock-tutorial-vignette-page">
          <h2>Vignettes</h2>
          <p>
            This exam includes vignettes that will be presented on the left side of the screen. Each
            vignette will contain a variable number of questions. Multiple choice questions related
            to the vignette will be presented on the right side of the screen, followed by the
            possible answer selections. Essay questions related to the vignette will also be
            presented on the right, followed by a freeform text box. To answer the multiple choice
            questions in your exam, use the mouse to select an answer.
          </p>
          <div className="mock-tutorial-note-box">
            <p>
              <strong>Please note:</strong> If a vignette and/or question and/or answer option
              overlaps on your screen, adjust your browser&apos;s zoom level before proceeding. The
              exam interface formatting on your actual exam may vary slightly depending on the
              monitors used at your test center.
            </p>
          </div>
          <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
        </div>
      )
    }

    if (page === 10) {
      return (
        <div className="mock-tutorial-highlight-page">
          <h2>Highlighting Text</h2>
          <p>
            During the exam, you can highlight text in the exam questions to refer back to later. All
            highlights will remain throughout the exam unless you manually remove them.
          </p>
          <p>
            To highlight, click and drag the mouse cursor over the desired text. After releasing the
            mouse button, a Highlight button will appear on the screen. Click the Highlight button to
            highlight the selected text.
          </p>
          <p>
            To remove a highlight, click anywhere on the highlighted text and then click the Highlight
            button again.
          </p>
          <div className="mock-tutorial-highlight-demo" aria-hidden="true">
            <p className="mock-tutorial-highlight-sample">
              <span className="mock-tutorial-highlight-mark">How would you</span> characteri:
            </p>
            <div className="mock-tutorial-highlight-btn">🖍</div>
          </div>
          <p>
            The highlight feature cannot be applied to text within the answer options.
          </p>
          <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
        </div>
      )
    }

    if (page === 11) {
      return (
        <div className="mock-tutorial-strikeout-page">
          <h2>Striking Out Options</h2>
          <p>
            During the examination, a Strikeout feature is available to help you visually eliminate
            possible options from consideration. A struck out option will remain present as you
            progress through the exam, unless you select to remove it.
          </p>
          <p>
            Right-click on an option to strike it out. Right-click again to remove the strikeout.
            Left-click on a struck out option to select it as your response. You may strike out as
            many or as few items as you like.
          </p>
          <p className="mock-tutorial-emphasis">
            Practice using the Strikeout feature below. Once you have finished practicing, click the
            &quot;Next&quot; button to continue.
          </p>
          <p className="mock-tutorial-mcq-stem">
            What bird has the largest wingspan of any existing species?
          </p>
          <div className="mock-tutorial-mcq-options" role="radiogroup" aria-label="Strikeout practice question">
            {TUTORIAL_STRIKEOUT_OPTIONS.map((option) => {
              const selected = strikeoutChoice === option.key
              const struckOut = struckOutOptions.includes(option.key)
              return (
                <div key={option.key} className="mock-tutorial-mcq-row">
                  <span className="mock-tutorial-mcq-label">{option.key}</span>
                  <button
                    type="button"
                    className={`mock-tutorial-mcq-option mock-tutorial-strikeout-option ${selected ? 'selected' : ''} ${struckOut && !selected ? 'struck-out' : ''}`}
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setStrikeoutChoice((prev) => (prev === option.key ? null : option.key))
                    }
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setStruckOutOptions((prev) =>
                        prev.includes(option.key)
                          ? prev.filter((key) => key !== option.key)
                          : [...prev, option.key],
                      )
                    }}
                  >
                    {option.label}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (page === 12) {
      return (
        <div className="mock-tutorial-review-page">
          <h2>Section Review</h2>
          <p>
            During the examination, you can review the status of all questions in a current exam
            section using the grid icon located in the bottom left corner of the exam screen:
          </p>
          <div className="mock-tutorial-grid-icon" aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <p>
            To navigate directly to a question, click the corresponding numbered icon. You may also
            filter your view by unattempted, attempted, and flagged questions. The Section Review
            can be locked in place using the padlock icon and closed using the &quot;X&quot; icon.
          </p>
          <MockTutorialSectionReviewDemo />
          <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
        </div>
      )
    }

    if (page === 13) {
      return (
        <div className="mock-tutorial-simple-copy">
          <h2>Ending Exam Sections</h2>
          <p>
            After completing and reviewing all of the questions within the section, you can end the
            section by clicking the &quot;Finish Test&quot; button in the top-right corner of the screen.
            Once clicked, a pop-up window will appear confirming you want to finish the section.
            Select &quot;Finish&quot; again to submit your answers.
          </p>
          <p>
            Please note that once you leave a section, you may not return. You will not earn or lose
            points for an unanswered question or incorrect answer.
          </p>
          <p className="mock-tutorial-emphasis">Click the &quot;Next&quot; button to continue.</p>
        </div>
      )
    }

    if (page === 14) {
      return (
        <div className="mock-tutorial-simple-copy">
          <h2>Tutorial Conclusion</h2>
          <p>
            This concludes the tutorial. You can review the tutorial by clicking on the &quot;Back&quot;
            button to back up one screen at a time, or by using the numbered buttons displayed on the
            left side of the screen. You may view the tutorial at any point during the examination by
            clicking on the question mark icon. This icon can be found in the bottom left of the screen
            once you have begun testing.
          </p>
          <p>Good luck with the examination.</p>
          <p className="mock-tutorial-emphasis">
            Click the &quot;Start the Test&quot; button to exit the tutorial and begin the examination.
          </p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="mock-tutorial-page">
      <header className="mock-tutorial-topbar">
        <div className="mock-tutorial-topbar-left">
          <span>Page:{page}</span>
          <span>Section:Introduction</span>
        </div>
        <div className="mock-tutorial-topbar-center">
          <span className="mock-tutorial-clock" aria-hidden="true">
            🕒
          </span>
          <span className="mock-tutorial-time-label">Introduction Time Remaining</span>
          <strong>{formatTimer(remainingSeconds)}</strong>
        </div>
        <div className="mock-tutorial-topbar-right">
          <div className="mock-tutorial-progress-wrap">
            <span>Progress {progressPct}%</span>
            <div className="mock-tutorial-progress-track">
              <div className="mock-tutorial-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <button type="button" className="mock-tutorial-finish" onClick={onExit} disabled={loading}>
            Finish Test
          </button>
        </div>
      </header>

      <div className="mock-tutorial-banner">
        <span>Test: CFA Online Tutorial</span>
        <span>Candidate: {candidateId}</span>
      </div>

      <div className="mock-tutorial-layout">
        <aside className="mock-tutorial-sidebar" aria-label="Tutorial pages">
          {Array.from({ length: TUTORIAL_PAGES }, (_, index) => {
            const pageNumber = index + 1
            const active = pageNumber === page
            return (
              <button
                key={pageNumber}
                type="button"
                className={`mock-tutorial-page-btn ${active ? 'active' : ''}`}
                onClick={() => setPage(pageNumber)}
                disabled={loading}
              >
                {active ? <span className="mock-tutorial-page-arrow" aria-hidden="true" /> : null}
                {pageNumber}
              </button>
            )
          })}
        </aside>

        <main className="mock-tutorial-content">{renderPageContent()}</main>
      </div>

      <footer className="mock-tutorial-footer">
        <div className="mock-tutorial-footer-actions">
          <button
            type="button"
            className="mock-tutorial-nav-btn"
            onClick={handleBack}
            disabled={loading || page <= 1}
          >
            &lt; Back
          </button>
          <button type="button" className="mock-tutorial-nav-btn primary" onClick={handleNext} disabled={loading}>
            Next &gt;
          </button>
          <button type="button" className="mock-tutorial-nav-btn primary" onClick={onStartTest} disabled={loading}>
            {loading ? 'Starting...' : 'Start the Test'}
          </button>
        </div>
      </footer>
    </div>
  )
}

export function buildCandidateId(seed: string) {
  const normalized = seed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (normalized.length >= 12) return normalized.slice(0, 12)
  return `${normalized}${'X'.repeat(12)}`.slice(0, 12)
}
