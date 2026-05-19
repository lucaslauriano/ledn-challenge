import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { CircuitBreakerService } from './circuit-breaker.service'
import { RedisService } from '../../common/redis/redis.service'
import { AlertType, CircuitState, WsEventType } from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'
import { AlertService } from '../alert/alert.service'

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}

const mockConfig = {
  get: jest.fn((key: string, defaultValue?: number) => {
    const values: Record<string, number> = {
      CB_FAILURE_THRESHOLD: 3,
      CB_SUCCESS_THRESHOLD: 2,
      CB_TIMEOUT_MS: 10000,
    }
    return values[key] ?? defaultValue
  }),
}

const mockNats = {
  publish: jest.fn(),
  subscribe: jest.fn(),
}

const mockAlertService = {
  resolveAllByTypeAndResource: jest.fn(),
}

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NatsService, useValue: mockNats },
        { provide: AlertService, useValue: mockAlertService },
      ],
    }).compile()

    service = module.get<CircuitBreakerService>(CircuitBreakerService)
  })

  describe('getState', () => {
    it('should return CLOSED when no state is stored', async () => {
      mockRedis.get.mockResolvedValue(null)

      const state = await service.getState('BTC')

      expect(state).toBe(CircuitState.CLOSED)
    })

    it('should return OPEN when state is OPEN and timeout has not elapsed', async () => {
      mockRedis.get
        .mockResolvedValueOnce(CircuitState.OPEN)
        .mockResolvedValueOnce(Date.now().toString())

      const state = await service.getState('BTC')

      expect(state).toBe(CircuitState.OPEN)
    })

    it('should transition to HALF_OPEN when OPEN and timeout has elapsed', async () => {
      const pastTime = (Date.now() - 15000).toString()
      mockRedis.get
        .mockResolvedValueOnce(CircuitState.OPEN)
        .mockResolvedValueOnce(pastTime)
      mockRedis.set.mockResolvedValue('OK')

      const state = await service.getState('BTC')

      expect(state).toBe(CircuitState.HALF_OPEN)
      expect(mockNats.publish).toHaveBeenCalledWith(
        WsEventType.CIRCUIT_STATE_CHANGED,
        expect.objectContaining({
          assetId: 'BTC',
          state: CircuitState.HALF_OPEN,
        }),
      )
    })
  })

  describe('recordFailure', () => {
    it('should return CLOSED when failures are below threshold', async () => {
      mockRedis.incr.mockResolvedValue(1)
      mockRedis.set.mockResolvedValue('OK')

      const state = await service.recordFailure('BTC')

      expect(state).toBe(CircuitState.CLOSED)
    })

    it('should return OPEN when failures reach threshold from CLOSED', async () => {
      mockRedis.get.mockResolvedValue(CircuitState.CLOSED)
      mockRedis.incr.mockResolvedValue(3)
      mockRedis.set.mockResolvedValue('OK')

      const state = await service.recordFailure('BTC')

      expect(state).toBe(CircuitState.OPEN)
      expect(mockNats.publish).toHaveBeenCalledWith('alert.trigger', {
        type: AlertType.CIRCUIT_OPEN,
        severity: expect.any(String),
        assetId: 'BTC',
        message: expect.stringContaining('BTC'),
      })
    })

    it('should not reopen or emit a new circuit alert from HALF_OPEN', async () => {
      mockRedis.get.mockResolvedValue(CircuitState.HALF_OPEN)
      mockRedis.incr.mockResolvedValue(3)
      mockRedis.set.mockResolvedValue('OK')

      const state = await service.recordFailure('BTC')

      expect(state).toBe(CircuitState.CLOSED)
      expect(mockNats.publish).not.toHaveBeenCalledWith(
        'alert.trigger',
        expect.anything(),
      )
    })
  })

  describe('recordSuccess', () => {
    it('should close circuit after enough successes in HALF_OPEN state', async () => {
      mockRedis.get.mockResolvedValueOnce(CircuitState.HALF_OPEN)
      mockRedis.incr.mockResolvedValue(2)
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.del.mockResolvedValue(1)

      const state = await service.recordSuccess('BTC')

      expect(state).toBe(CircuitState.CLOSED)
    })
  })

  describe('isOpen', () => {
    it('should return true when circuit is OPEN', async () => {
      mockRedis.get
        .mockResolvedValueOnce(CircuitState.OPEN)
        .mockResolvedValueOnce(Date.now().toString())

      const result = await service.isOpen('BTC')

      expect(result).toBe(true)
    })

    it('should return false when circuit is CLOSED', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await service.isOpen('BTC')

      expect(result).toBe(false)
    })
  })

  describe('reset', () => {
    it('should clear all circuit breaker state', async () => {
      mockRedis.set.mockResolvedValue('OK')
      mockRedis.del.mockResolvedValue(1)

      await service.reset('BTC')

      expect(mockRedis.del).toHaveBeenCalledTimes(3)
      expect(mockAlertService.resolveAllByTypeAndResource).toHaveBeenCalledWith(
        AlertType.CIRCUIT_OPEN,
        'BTC',
      )
    })
  })
})
