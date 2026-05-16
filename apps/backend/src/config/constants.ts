export const APP_CONSTANTS = {
  assets: ['BTC', 'ETH'] as const,
  schemaVersion: 1,
  feed: {
    intervalMs: 1000,
    delayedEveryNthTick: 5,
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
} as const

export type AssetId = (typeof APP_CONSTANTS.assets)[number]
