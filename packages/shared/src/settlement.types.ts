export enum SettlementStatus {
  CREATED = 'CREATED',
  BOOKED = 'BOOKED',
  LOCKED = 'LOCKED',
  SUBMITTED = 'SUBMITTED',
  PENDING_SETTLEMENT = 'PENDING_SETTLEMENT',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
}

export enum SettlementScenario {
  NORMAL = 'NORMAL',
  DELAYED = 'DELAYED',
  FAILED = 'FAILED',
}

export interface SettlementOperation {
  id: string
  amount: number
  currency: string
  status: SettlementStatus
  scenario: SettlementScenario
  createdAt: number
  bookedAt?: number
  lockedAt?: number
  submittedAt?: number
  expectedSettlementAt?: number
  settledAt?: number
  failedAt?: number
  exposureWindowMs: number
}

export interface SettlementSnapshot {
  operations: SettlementOperation[]
  pendingSettlementAmount: number
  delayedSettlementAmount: number
  oldestPendingSettlementAgeMs: number
  settlementExposure: number
  updatedAt: number
}
