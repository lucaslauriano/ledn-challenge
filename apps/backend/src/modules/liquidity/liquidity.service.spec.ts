import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import {
  DataConfidence,
  FeedMode,
  PriceRecord,
  PriceSource,
} from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'
import { AlertService } from '../alert/alert.service'
import { LiquidityService } from './liquidity.service'

const mockNats = {
  publish: jest.fn(),
  subscribe: jest.fn(),
}

const mockAlertService = {
  resolveByTypeAndResource: jest.fn(),
}

const makePriceRecord = (
  confidence: DataConfidence,
  assetId = 'BTC',
): PriceRecord => ({
  assetId,
  value: 65000,
  timestamp: Date.now(),
  publishedAt: Date.now(),
  receivedAt: Date.now(),
  confidence,
  source: PriceSource.LIVE,
  feedMode: FeedMode.HEALTHY,
  ageMs: 0,
  schemaVersion: 1,
})

describe('LiquidityService', () => {
  let service: LiquidityService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiquidityService,
        { provide: NatsService, useValue: mockNats },
        { provide: AlertService, useValue: mockAlertService },
      ],
    }).compile()

    service = module.get<LiquidityService>(LiquidityService)
  })

  it('marks liquidity conservative when price confidence is degraded', async () => {
    await (
      service as unknown as {
        handlePriceConfidence: (price: PriceRecord) => Promise<void>
      }
    ).handlePriceConfidence(makePriceRecord(DataConfidence.STALE))

    const snapshot = service.getSnapshot()

    expect(snapshot.conservativeMode).toBe(true)
    expect(snapshot.degradedAssets).toEqual(['BTC'])
    expect(snapshot.availableAdjusted).toBe(snapshot.available * 0.9)
  })

  it('exits conservative mode when degraded price becomes fresh', async () => {
    const internals = service as unknown as {
      handlePriceConfidence: (price: PriceRecord) => Promise<void>
    }

    await internals.handlePriceConfidence(makePriceRecord(DataConfidence.STALE))
    await internals.handlePriceConfidence(makePriceRecord(DataConfidence.FRESH))

    const snapshot = service.getSnapshot()

    expect(snapshot.conservativeMode).toBe(false)
    expect(snapshot.degradedAssets).toEqual([])
    expect(snapshot.availableAdjusted).toBe(snapshot.available)
  })

  it('rejects locks above conservative availability while prices are degraded', async () => {
    await (
      service as unknown as {
        handlePriceConfidence: (price: PriceRecord) => Promise<void>
      }
    ).handlePriceConfidence(makePriceRecord(DataConfidence.ESTIMATED))

    const snapshot = service.getSnapshot()
    const amountAboveAdjusted = (snapshot.availableAdjusted ?? snapshot.available) + 1

    await expect(service.lockFunds(amountAboveAdjusted)).rejects.toThrow(
      BadRequestException,
    )
    await expect(service.lockFunds(amountAboveAdjusted)).rejects.toThrow(
      'Insufficient conservative liquidity',
    )
  })

  it('locks funds while preserving total liquidity', async () => {
    const before = service.getSnapshot()

    const after = await service.lockFunds(100_000)

    expect(after.available).toBe(before.available - 100_000)
    expect(after.locked).toBe(before.locked + 100_000)
    expect(after.total).toBe(before.total)
  })

  it('releases funds while preserving total liquidity', async () => {
    const before = service.getSnapshot()

    const after = await service.releaseFunds(100_000)

    expect(after.available).toBe(before.available + 100_000)
    expect(after.locked).toBe(before.locked - 100_000)
    expect(after.total).toBe(before.total)
  })

  it('records lock and release audit entries', async () => {
    await service.lockFunds(10_000)
    await service.releaseFunds(5_000)

    const auditTrail = service.getAuditTrail()

    expect(auditTrail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'LOCK', amount: 10_000 }),
        expect.objectContaining({ type: 'RELEASE', amount: 5_000 }),
      ]),
    )
  })
})
