import { useEffect, useRef, useState } from 'react'
import { formatPrometricTimer, MOCK_EXAM_BREAK_SECONDS } from '../utils/prometricTimer'

type MockExamBreakScreenProps = {
  onContinue: () => void
  onFinishTest: () => void
  finishing?: boolean
}

export default function MockExamBreakScreen({
  onContinue,
  onFinishTest,
  finishing = false,
}: MockExamBreakScreenProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(MOCK_EXAM_BREAK_SECONDS)
  const autoContinuedRef = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (remainingSeconds === 0 && !autoContinuedRef.current) {
      autoContinuedRef.current = true
      onContinue()
    }
  }, [remainingSeconds, onContinue])

  return (
    <div className="mock-exam-break">
      <h2 className="mock-exam-break-title">Break in Progress</h2>
      <p className="mock-exam-break-timer">{formatPrometricTimer(remainingSeconds)}</p>
      <h3 className="mock-exam-break-subtitle">Section 1 is finished.</h3>
      <p className="mock-exam-break-copy">
        You may leave the testing room during break. Return before break ends to avoid delays.
      </p>
      <div className="mock-exam-break-actions">
        <button
          type="button"
          className="mock-tutorial-nav-btn primary"
          onClick={onContinue}
          disabled={finishing}
        >
          Continue Test
        </button>
        <button
          type="button"
          className="mock-tutorial-nav-btn"
          onClick={onFinishTest}
          disabled={finishing}
        >
          Finish Test
        </button>
      </div>
    </div>
  )
}
