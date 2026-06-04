import type { MockExamBankId } from '../constants/mockExamBanks'
import { DEFAULT_MOCK_EXAM_BANK_ID, MOCK_EXAM_BANK_OPTIONS } from '../constants/mockExamBanks'

const STORAGE_KEY = 'cfa-mock-exam-setup'

export type MockExamSetupPayload = {
  mockBankId: MockExamBankId
}

export function isMockExamBankId(value: string): value is MockExamBankId {
  return MOCK_EXAM_BANK_OPTIONS.some((option) => option.id === value)
}

export function saveMockExamSetup(payload: MockExamSetupPayload) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function readMockExamSetup(): MockExamSetupPayload | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as MockExamSetupPayload
    if (parsed?.mockBankId && isMockExamBankId(parsed.mockBankId)) {
      return parsed
    }
  } catch {
    // ignore invalid payload
  }
  return null
}

export function clearMockExamSetup() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function resolveMockBankFromQuery(bankParam: string | null): MockExamBankId | null {
  if (bankParam && isMockExamBankId(bankParam)) return bankParam
  return null
}

export function buildMockExamTutorialUrl(mockBankId: MockExamBankId = DEFAULT_MOCK_EXAM_BANK_ID) {
  const params = new URLSearchParams({
    step: 'tutorial',
    bank: mockBankId,
  })
  return `/study/mock-exam?${params.toString()}`
}
