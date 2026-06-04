import { useEffect, useState } from 'react'

type MockExamAgreeTermsProps = {
  loading?: boolean
  onContinue: () => void
  onExit: () => void
}

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function MockExamAgreeTerms({ loading = false, onContinue, onExit }: MockExamAgreeTermsProps) {
  const [accepted, setAccepted] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(114)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="mock-terms-page">
      <header className="mock-terms-topbar">
        <h1>Agree to Terms</h1>
        <div className="mock-terms-topbar-tools">
          <span className="mock-terms-timer">
            <span className="mock-terms-timer-icon" aria-hidden="true">
              🕒
            </span>
            {formatTimer(remainingSeconds)}
          </span>
          <button type="button" className="mock-terms-fullscreen" aria-label="Toggle full screen">
            ⤢
          </button>
        </div>
      </header>

      <div className="mock-terms-body">
        <div className="mock-terms-brands">
          <div className="mock-terms-cfa">
            <span className="mock-terms-cfa-mark" aria-hidden="true" />
            <span className="mock-terms-cfa-name">CFA Institute</span>
          </div>
          <div className="mock-terms-prometric">
            <span className="mock-terms-prometric-mark" aria-hidden="true" />
            <span>PROMETRIC</span>
          </div>
        </div>

        <div className="mock-terms-box">
          <p>
            There may be question types in this software tutorial that do not apply to your exam. This
            tutorial is only intended to help you become familiar with the exam software.
          </p>
          <p>
            At the test center before beginning the exam you must agree to terms in the Candidate
            Agreement and Standard VII(A) of the CFA Institute Standards of Professional Conduct. If you
            do not accept the terms, you will not be permitted to test and must exit the exam. Your
            enrollment and/or registration fees are non-refundable and non-transferable.
          </p>
          <p>
            By checking the box &quot;I accept these terms.&quot; and clicking &quot;Continue&quot; you
            affirm that you accept the terms of this agreement and want to proceed into the exam. If you
            do not accept the terms of this agreement, you must click the &quot;Exit&quot; button and the
            exam will terminate.
          </p>
        </div>

        <label className="mock-terms-check">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            disabled={loading}
          />
          <span>I accept these terms.</span>
        </label>

        <div className="mock-terms-actions">
          <button type="button" className="mock-terms-action-btn mock-terms-exit-btn" onClick={onExit} disabled={loading}>
            <span aria-hidden="true">×</span>
            Exit
          </button>
          <button
            type="button"
            className="mock-terms-action-btn mock-terms-continue-btn"
            disabled={!accepted || loading}
            onClick={onContinue}
          >
            <span aria-hidden="true">✓</span>
            {loading ? 'Starting...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
