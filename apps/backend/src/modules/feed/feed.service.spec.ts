import { ConfigService } from '@nestjs/config'
import { FeedMode, WsEventType } from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'
import { FeedService, PriceTick } from './feed.service'

const mockConfig = {
  get: jest.fn((key: string, defaultValue?: number) => {
    const values: Record<string, number> = {
      FEED_INTERVAL_MS: 1000,
      FEED_DELAYED_EVERY_NTH_TICK: 3,
      FEED_DRIFT_MULTIPLIER: 1.06,
    }
    return values[key] ?? defaultValue
  }),
}

const mockNats = {
  publish: jest.fn(),
}

const generateTick = (service: FeedService, assetId: string) =>
  (
    service as unknown as {
      generateTick: (assetId: string) => PriceTick | null
    }
  ).generateTick(assetId)

describe('FeedService', () => {
  let service: FeedService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new FeedService(
      mockConfig as unknown as ConfigService,
      mockNats as unknown as NatsService,
    )
  })

  it('emits feed status changes when mode is updated', () => {
    service.setMode('BTC', FeedMode.DELAYED)

    expect(mockNats.publish).toHaveBeenCalledWith(
      WsEventType.FEED_STATUS_CHANGED,
      expect.objectContaining({
        assetId: 'BTC',
        mode: FeedMode.DELAYED,
      }),
    )
  })

  it('does not emit ticks while offline', () => {
    service.setMode('BTC', FeedMode.OFFLINE)

    expect(generateTick(service, 'BTC')).toBeNull()
  })

  it('emits delayed ticks only on the configured cadence', () => {
    service.setMode('BTC', FeedMode.DELAYED)

    expect(generateTick(service, 'BTC')).toBeNull()
    expect(generateTick(service, 'BTC')).toBeNull()
    expect(generateTick(service, 'BTC')).toEqual(
      expect.objectContaining({
        assetId: 'BTC',
        mode: FeedMode.DELAYED,
      }),
    )
  })

  it('marks drifted ticks with DRIFTED mode', () => {
    service.setMode('ETH', FeedMode.DRIFTED)

    expect(generateTick(service, 'ETH')).toEqual(
      expect.objectContaining({
        assetId: 'ETH',
        mode: FeedMode.DRIFTED,
      }),
    )
  })
})
