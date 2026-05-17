import { FeedMode, FeedScenario } from '@ledn/shared'

export interface ScenarioStep {
  afterMs: number
  assetId: string
  mode: FeedMode
}

export const FEED_SCENARIOS: Record<FeedScenario, ScenarioStep[]> = {
  [FeedScenario.BTC_GOES_OFFLINE]: [
    { afterMs: 0, assetId: 'BTC', mode: FeedMode.HEALTHY },
    { afterMs: 5_000, assetId: 'BTC', mode: FeedMode.DELAYED },
    { afterMs: 10_000, assetId: 'BTC', mode: FeedMode.OFFLINE },
    { afterMs: 20_000, assetId: 'BTC', mode: FeedMode.HEALTHY },
  ],
  [FeedScenario.ETH_DRIFTS]: [
    { afterMs: 0, assetId: 'ETH', mode: FeedMode.HEALTHY },
    { afterMs: 5_000, assetId: 'ETH', mode: FeedMode.DRIFTED },
    { afterMs: 15_000, assetId: 'ETH', mode: FeedMode.HEALTHY },
  ],
  [FeedScenario.DUAL_PRESSURE]: [
    { afterMs: 0, assetId: 'BTC', mode: FeedMode.HEALTHY },
    { afterMs: 0, assetId: 'ETH', mode: FeedMode.HEALTHY },
    { afterMs: 5_000, assetId: 'BTC', mode: FeedMode.DELAYED },
    { afterMs: 5_000, assetId: 'ETH', mode: FeedMode.DRIFTED },
    { afterMs: 12_000, assetId: 'BTC', mode: FeedMode.OFFLINE },
    { afterMs: 20_000, assetId: 'BTC', mode: FeedMode.HEALTHY },
    { afterMs: 20_000, assetId: 'ETH', mode: FeedMode.HEALTHY },
  ],
}
