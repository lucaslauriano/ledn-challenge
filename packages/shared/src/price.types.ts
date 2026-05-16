export enum FeedMode {
  HEALTHY = 'HEALTHY',
  DELAYED = 'DELAYED',
  DRIFTED = 'DRIFTED',
  OFFLINE = 'OFFLINE',
}

export enum FeedScenario {
  BTC_GOES_OFFLINE = 'BTC_GOES_OFFLINE',
  ETH_DRIFTS = 'ETH_DRIFTS',
  DUAL_PRESSURE = 'DUAL_PRESSURE',
}

export enum DataConfidence {
  FRESH = 'FRESH',
  STALE = 'STALE',
  ESTIMATED = 'ESTIMATED',
}

export enum PriceSource {
  LIVE = 'LIVE',
  CACHE = 'CACHE',
  FALLBACK = 'FALLBACK',
  REFERENCE = 'REFERENCE',
}

export interface PriceRecord {
  assetId: string
  value: number
  timestamp: number
  publishedAt: number
  receivedAt: number
  confidence: DataConfidence
  source: PriceSource
  feedMode: FeedMode
  ageMs: number
  schemaVersion: number
}
