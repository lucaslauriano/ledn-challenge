import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { PriceService } from './price.service';
import { PriceRecord } from './price.schema';
import { RedisService } from '../../common/redis/redis.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { FeedService } from '../feed/feed.service';
import { DataConfidence, CircuitState } from '@ledn/shared';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockCircuitBreaker = {
  isOpen: jest.fn(),
  getState: jest.fn(),
  recordSuccess: jest.fn(),
  recordFailure: jest.fn(),
};

const mockFeed = {
  onTick: jest.fn(),
};

const mockPriceModel = {
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, defaultValue?: number) => {
    if (key === 'STALE_THRESHOLD_MS') return 5000;
    return defaultValue;
  }),
};

describe('PriceService', () => {
  let service: PriceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceService,
        { provide: RedisService, useValue: mockRedis },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
        { provide: FeedService, useValue: mockFeed },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getModelToken(PriceRecord.name), useValue: mockPriceModel },
      ],
    }).compile();

    service = module.get<PriceService>(PriceService);
  });

  describe('getCurrentPrice', () => {
    it('should return FRESH price from cache when circuit is closed', async () => {
      const cachedPrice = {
        assetId: 'BTC',
        price: 65000,
        timestamp: new Date().toISOString(),
        confidence: DataConfidence.FRESH,
        circuitState: CircuitState.CLOSED,
        source: 'LIVE',
        ageMs: 0,
      };

      mockCircuitBreaker.isOpen.mockResolvedValue(false);
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPrice));

      const result = await service.getCurrentPrice('BTC');

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(DataConfidence.FRESH);
      expect(result?.source).toBe('LIVE');
    });

    it('should return STALE price when cache is old', async () => {
      const oldTimestamp = new Date(Date.now() - 10000).toISOString();
      const cachedPrice = {
        assetId: 'BTC',
        price: 65000,
        timestamp: oldTimestamp,
        confidence: DataConfidence.FRESH,
        source: 'LIVE',
        ageMs: 0,
      };

      mockCircuitBreaker.isOpen.mockResolvedValue(false);
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPrice));

      const result = await service.getCurrentPrice('BTC');

      expect(result?.confidence).toBe(DataConfidence.STALE);
    });

    it('should return fallback from cache when circuit is open', async () => {
      const cachedPrice = {
        assetId: 'BTC',
        price: 65000,
        timestamp: new Date().toISOString(),
        source: 'LIVE',
        ageMs: 0,
      };

      mockCircuitBreaker.isOpen.mockResolvedValue(true);
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPrice));

      const result = await service.getCurrentPrice('BTC');

      expect(result?.source).toBe('CACHE');
      expect(result?.confidence).toBe(DataConfidence.STALE);
    });

    it('should return null when circuit is open and no cache exists', async () => {
      mockCircuitBreaker.isOpen.mockResolvedValue(true);
      mockRedis.get.mockResolvedValue(null);
      mockPriceModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getCurrentPrice('BTC');

      expect(result).toBeNull();
    });
  });
});
