export type MockExamBankId =
  | '2026-mock-exam-1'
  | '2026-mock-exam-2'
  | '2026-mock-exam-3'
  | '2026-mock-exam-4'
  | '2026-mock-exam-5'
  | '2026-mock-exam-6'
  | '2025-special-mock-a'
  | '2025-special-mock-b'

export type MockExamBankOption = {
  id: MockExamBankId
  label: string
}

/** Specified mock banks shown in the mode picker (matches lanrencfa). */
export const MOCK_EXAM_BANK_OPTIONS: MockExamBankOption[] = [
  { id: '2026-mock-exam-1', label: '2026 Mock Exam 1' },
  { id: '2026-mock-exam-2', label: '2026 Mock Exam 2' },
  { id: '2026-mock-exam-3', label: '2026 Mock Exam 3' },
  { id: '2026-mock-exam-4', label: '2026 Mock Exam 4' },
  { id: '2026-mock-exam-5', label: '2026 Mock Exam 5' },
  { id: '2026-mock-exam-6', label: '2026 Mock Exam 6' },
  { id: '2025-special-mock-a', label: '2025 Specialized Mock Exam A' },
  { id: '2025-special-mock-b', label: '2025 Specialized Mock Exam B' },
]

export const DEFAULT_MOCK_EXAM_BANK_ID: MockExamBankId = '2026-mock-exam-1'
