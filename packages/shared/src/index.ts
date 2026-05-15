// ─── Feed ───────────────────────────────────────────────────────────────────

export enum FeedMode {
  HEALTHY = 'HEALTHY',
  DELAYED = 'DELAYED',
  DRIFTED = 'DRIFTED',
  OFFLINE = 'OFFLINE',
}

export enum DataConfidence {
  FRESH = 'FRESH',
  STALE = 'STALE',
  ESTIMATED = 'ESTIMATED',
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

// ─── Price ──────────────────────────────────────────────────────────────────

export interface PriceRecord {
  assetId: string
  price: number
  timestamp: string
  confidence: DataConfidence
  circuitState: CircuitState
  source: 'LIVE' | 'CACHE' | 'FALLBACK'
  ageMs: number
}

// ─── Liquidity ───────────────────────────────────────────────────────────────

export interface LiquiditySnapshot {
  available: number
  locked: number
  inFlight: number
  total: number
  updatedAt: string
}

// ─── Alert ──────────────────────────────────────────────────────────────────

export enum AlertType {
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  DATA_STALE = 'DATA_STALE',
  PRICE_DRIFT = 'PRICE_DRIFT',
  FEED_OFFLINE = 'FEED_OFFLINE',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  assetId?: string
  message: string
  timestamp: string
  resolved: boolean
  resolvedAt?: string
}

// ─── WebSocket events ────────────────────────────────────────────────────────

export enum WsEvent {
  PRICE_UPDATED = 'price.updated',
  CIRCUIT_STATE_CHANGED = 'circuit.state.changed',
  LIQUIDITY_UPDATED = 'liquidity.updated',
  ALERT_CREATED = 'alert.created',
  ALERT_RESOLVED = 'alert.resolved',
  FEED_STATUS_CHANGED = 'feed.status.changed',
}