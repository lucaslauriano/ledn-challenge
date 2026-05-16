export enum AlertType {
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  DATA_STALE = 'DATA_STALE',
  FEED_OFFLINE = 'FEED_OFFLINE',
  PRICE_DRIFT = 'PRICE_DRIFT',
  LIQUIDITY_LOW = 'LIQUIDITY_LOW',
  LIQUIDITY_SOURCE_STALE = 'LIQUIDITY_SOURCE_STALE',
}

export enum AlertSeverity {
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AlertEvent {
  id: string
  resourceId: string
  type: AlertType
  severity: AlertSeverity
  payload: Record<string, unknown>
  isActive: boolean
  createdAt: number
  resolvedAt?: number
}
