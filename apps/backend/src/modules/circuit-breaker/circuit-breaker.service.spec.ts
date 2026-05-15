import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RedisService } from '../../common/redis/redis.service';
import { CircuitState } from '@ledn/shared';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, defaultValue?: number) => {
    const values: Record<string, number> = {
      CB_FAILURE_THRESHOLD: 3,
      CB_SUCCESS_THRESHOLD: 2,
      CB_TIMEOUT_MS: 10000,
    };
    return values[key] ?? defaultValue;
  }),
};

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  describe('getState', () => {
    it('should return CLOSED when no state is stored', async () => {
      mockRedis.get.mockResolvedValue(null);

      const state = await service.getState('BTC');

      expect(state).toBe(CircuitState.CLOSED);
    });

    it('should return OPEN when state is OPEN and timeout has not elapsed', async () => {
      mockRedis.get
        .mockResolvedValueOnce(CircuitState.OPEN)
        .mockResolvedValueOnce(Date.now().toString());

      const state = await service.getState('BTC');

      expect(state).toBe(CircuitState.OPEN);
    });

    it('should transition to HALF_OPEN when OPEN and timeout has elapsed', async () => {
      const pastTime = (Date.now() - 15000).toString();
      mockRedis.get
        .mockResolvedValueOnce(CircuitState.OPEN)
        .mockResolvedValueOnce(pastTime);
      mockRedis.set.mockResolvedValue('OK');

      const state = await service.getState('BTC');

      expect(state).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('recordFailure', () => {
    it('should return CLOSED when failures are below threshold', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');

      const state = await service.recordFailure('BTC');

      expect(state).toBe(CircuitState.CLOSED);
    });

    it('should return OPEN when failures reach threshold', async () => {
      mockRedis.incr.mockResolvedValue(3);
      mockRedis.set.mockResolvedValue('OK');

      const state = await service.recordFailure('BTC');

      expect(state).toBe(CircuitState.OPEN);
    });
  });

  describe('recordSuccess', () => {
    it('should close circuit after enough successes in HALF_OPEN state', async () => {
      mockRedis.get.mockResolvedValueOnce(CircuitState.HALF_OPEN);
      mockRedis.incr.mockResolvedValue(2);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const state = await service.recordSuccess('BTC');

      expect(state).toBe(CircuitState.CLOSED);
    });
  });

  describe('isOpen', () => {
    it('should return true when circuit is OPEN', async () => {
      mockRedis.get
        .mockResolvedValueOnce(CircuitState.OPEN)
        .mockResolvedValueOnce(Date.now().toString());

      const result = await service.isOpen('BTC');

      expect(result).toBe(true);
    });

    it('should return false when circuit is CLOSED', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.isOpen('BTC');

      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all circuit breaker state', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      await service.reset('BTC');

      expect(mockRedis.del).toHaveBeenCalledTimes(3);
    });
  });
});
