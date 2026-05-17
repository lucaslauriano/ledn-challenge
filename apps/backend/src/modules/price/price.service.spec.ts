import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getModelToken } from '@nestjs/mongoose'
import { PriceService } from './price.service'
import { PriceRecord } from './price.schema'
import { RedisService } from '../../common/redis/redis.service'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { FeedService } from '../feed/feed.service'
import { AlertType, DataConfidence, FeedMode, PriceSource } from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'
import { AlertService } from '../alert/alert.service'
import { STALE_THRESHOLD_MS_ENV } from '../../config/constants'

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
}

const mockCircuitBreaker = {
  isOpen: jest.fn(),
  getState: jest.fn(),
  recordSuccess: jest.fn(),
  recordFailure: jest.fn(),
}

const mockFeed = {
  onTick: jest.fn(),
}

const mockPriceModel = {
  create: jest.fn(),
  findOne: jest.fn(),
}

const mockConfig = {
  get: jest.fn((key: string, defaultValue?: number) => {
    if (key === STALE_THRESHOLD_MS_ENV) return 5000
    return defaultValue
  }),
}

const mockNats = {
  publish: jest.fn(),
}

const mockAlertService = {
  resolveByTypeAndResource: jest.fn(),
}

describe('PriceService', () => {
  let service: PriceService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceService,
        { provide: RedisService, useValue: mockRedis },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
        { provide: FeedService, useValue: mockFeed },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getModelToken(PriceRecord.name), useValue: mockPriceModel },
        { provide: NatsService, useValue: mockNats },
        { provide: AlertService, useValue: mockAlertService },
      ],
    }).compile()

    service = module.get<PriceService>(PriceService)
  })

  describe('getCurrentPrice', () => {
    it('should return FRESH price from cache when circuit is closed', async () => {
      const cachedPrice = {
        assetId: 'BTC',
        value: 65000,
        timestamp: Date.now(),
        publishedAt: Date.now(),
        receivedAt: Date.now(),
        confidence: DataConfidence.FRESH,
        source: PriceSource.LIVE,
        feedMode: FeedMode.HEALTHY,
        ageMs: 0,
        schemaVersion: 1,
      }

      mockCircuitBreaker.isOpen.mockResolvedValue(false)
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPrice))

      const result = await service.getCurrentPrice('BTC')

      expect(result).not.toBeNull()
      expect(result?.confidence).toBe(DataConfidence.FRESH)
      expect(result?.source).toBe(PriceSource.LIVE)
    })

    it('should return STALE price when cache is old', async () => {
      const oldTimestamp = Date.now() - 10000
      const cachedPrice = {
        assetId: 'BTC',
        value: 65000,
        timestamp: oldTimestamp,
        publishedAt: oldTimestamp,
        receivedAt: oldTimestamp,
        confidence: DataConfidence.FRESH,
        source: PriceSource.LIVE,
        feedMode: FeedMode.DELAYED,
        ageMs: 0,
        schemaVersion: 1,
      }

      mockCircuitBreaker.isOpen.mockResolvedValue(false)
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPrice))

      const result = await service.getCurrentPrice('BTC')

      expect(result?.confidence).toBe(DataConfidence.STALE)
    })

    it('should return fallback from cache when circuit is open', async () => {
      const cachedPrice = {
        assetId: 'BTC',
        value: 65000,
        timestamp: Date.now(),
        publishedAt: Date.now(),
        receivedAt: Date.now(),
        source: PriceSource.LIVE,
        feedMode: FeedMode.HEALTHY,
        ageMs: 0,
        schemaVersion: 1,
      }

      mockCircuitBreaker.isOpen.mockResolvedValue(true)
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPrice))

      const result = await service.getCurrentPrice('BTC')

      expect(result?.source).toBe(PriceSource.CACHE)
      expect(result?.confidence).toBe(DataConfidence.STALE)
    })

    it('should return null when circuit is open and no cache exists', async () => {
      mockCircuitBreaker.isOpen.mockResolvedValue(true)
      mockRedis.get.mockResolvedValue(null)
      mockPriceModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      })

      const result = await service.getCurrentPrice('BTC')

      expect(result).toBeNull()
    })
  })

  describe('price ticks', () => {
    it('publishes PRICE_DRIFT alerts for drifted ticks', async () => {
      mockRedis.set.mockResolvedValue('OK')
      mockPriceModel.create.mockResolvedValue({})
      mockCircuitBreaker.recordSuccess.mockResolvedValue(undefined)
      mockAlertService.resolveByTypeAndResource.mockResolvedValue(undefined)

      await (
        service as unknown as {
          handleTick: (tick: {
            assetId: string
            price: number
            timestamp: Date
            mode: FeedMode
          }) => Promise<void>
        }
      ).handleTick({
        assetId: 'ETH',
        price: 3500,
        timestamp: new Date(),
        mode: FeedMode.DRIFTED,
      })

      expect(mockNats.publish).toHaveBeenCalledWith(
        'alert.trigger',
        expect.objectContaining({
          type: AlertType.PRICE_DRIFT,
          assetId: 'ETH',
        }),
      )
    })
  })
})
