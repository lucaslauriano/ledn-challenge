import { AlertType } from '@ledn/shared'

export const APP_CONSTANTS = {
  assets: ['BTC', 'ETH'] as const,
  schemaVersion: 1,
  feed: {
    intervalMs: 1000,
    delayedEveryNthTick: 5,
    delayedDeliveryLagMs: 3000,
    staleThresholdMs: 5000,
    driftMultiplier: 1.06,
  },
  circuitBreaker: {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 5000,
  },
  alerting: {
    dedupKeyPrefix: 'alert:active',
  },
  liquidity: {
    intervalMs: 2000,
    lowAvailableRatio: 0.2,
    staleSourceThresholdMs: 10000,
    sources: {
      internalLedger: {
        sourceId: 'internal-ledger',
        baseAmount: 1_250_000,
      },
      custodian: {
        sourceId: 'custodian',
        baseAmount: 320_000,
      },
      settlementRail: {
        sourceId: 'settlement-rail',
        baseAmount: 85_000,
      },
    },
  },
  scenarios: {
    stepDelayMs: 5000,
  },
  settlement: {
    normalSettlementDelayMs: 3000,
    delayedSettlementDelayMs: 12000,
    exposureBreachThresholdMs: 8000,
  },
} as const

export const PORT_ENV = 'PORT'
export const MONGODB_URI_ENV = 'MONGODB_URI'
export const NATS_URL_ENV = 'NATS_URL'
export const REDIS_HOST_ENV = 'REDIS_HOST'
export const REDIS_PORT_ENV = 'REDIS_PORT'
export const FEED_INTERVAL_MS_ENV = 'FEED_INTERVAL_MS'
export const FEED_DELAYED_EVERY_NTH_TICK_ENV = 'FEED_DELAYED_EVERY_NTH_TICK'
export const FEED_DELAYED_DELIVERY_LAG_MS_ENV = 'FEED_DELAYED_DELIVERY_LAG_MS'
export const FEED_DRIFT_MULTIPLIER_ENV = 'FEED_DRIFT_MULTIPLIER'
export const STALE_THRESHOLD_MS_ENV = 'STALE_THRESHOLD_MS'
export const CB_FAILURE_THRESHOLD_ENV = 'CB_FAILURE_THRESHOLD'
export const CB_SUCCESS_THRESHOLD_ENV = 'CB_SUCCESS_THRESHOLD'
export const CB_TIMEOUT_MS_ENV = 'CB_TIMEOUT_MS'

export const SETTLEMENT_DELAYED_ALERT_TYPE: AlertType =
  'SETTLEMENT_DELAYED' as AlertType
export const SETTLEMENT_FAILED_ALERT_TYPE: AlertType =
  'SETTLEMENT_FAILED' as AlertType
export const SETTLEMENT_EXPOSURE_BREACH_ALERT_TYPE: AlertType =
  'SETTLEMENT_EXPOSURE_BREACH' as AlertType
export const SETTLEMENTS_UPDATED_EVENT = 'SETTLEMENTS_UPDATED'

export type AssetId = (typeof APP_CONSTANTS.assets)[number]
