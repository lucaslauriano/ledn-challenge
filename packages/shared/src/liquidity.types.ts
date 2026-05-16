export enum LiquiditySourceState {
  HEALTHY = 'HEALTHY',
  DELAYED = 'DELAYED',
  OFFLINE = 'OFFLINE',
}

export enum LiquidityConfidence {
  FRESH = 'FRESH',
  DEGRADED = 'DEGRADED',
}

export interface LiquiditySourceStatus {
  sourceId: string
  amount: number
  updatedAt: number
  status: LiquiditySourceState
}

export interface LiquiditySnapshot {
  total: number
  available: number
  locked: number
  inFlight: number
  sources: LiquiditySourceStatus[]
  confidence: LiquidityConfidence
  conservativeMode: boolean
  availableAdjusted?: number
  degradedAssets?: string[]
  timestamp: number
  updatedAt: number
  schemaVersion: number
}
