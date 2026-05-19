import { FeedMode, FeedScenario } from '@ledn/shared'

export interface ScenarioStep {
  afterMs: number
  assetId: string
  mode: FeedMode
}

export const FEED_SCENARIOS: Record<FeedScenario, ScenarioStep[]> = {
  [FeedScenario.BTC_GOES_OFFLINE]: [
    { afterMs: 500, assetId: 'BTC', mode: FeedMode.DELAYED },
    { afterMs: 3_500, assetId: 'BTC', mode: FeedMode.OFFLINE },
    { afterMs: 12_000, assetId: 'BTC', mode: FeedMode.DELAYED },
    { afterMs: 17_000, assetId: 'BTC', mode: FeedMode.HEALTHY },
  ],
  [FeedScenario.ETH_DRIFTS]: [
    { afterMs: 500, assetId: 'ETH', mode: FeedMode.DRIFTED },
    { afterMs: 14_000, assetId: 'ETH', mode: FeedMode.HEALTHY },
  ],
  [FeedScenario.DUAL_PRESSURE]: [
    { afterMs: 500, assetId: 'BTC', mode: FeedMode.DELAYED },
    { afterMs: 500, assetId: 'ETH', mode: FeedMode.DRIFTED },
    { afterMs: 3_500, assetId: 'BTC', mode: FeedMode.OFFLINE },
    { afterMs: 12_000, assetId: 'BTC', mode: FeedMode.DELAYED },
    { afterMs: 15_000, assetId: 'ETH', mode: FeedMode.HEALTHY },
    { afterMs: 17_000, assetId: 'BTC', mode: FeedMode.HEALTHY },
  ],
}
