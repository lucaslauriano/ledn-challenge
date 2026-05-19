import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AlertSeverity, AlertType, WsEventType } from '@ledn/shared'
import { RedisService } from '../../common/redis/redis.service'
import { NatsService } from '../../common/nats/nats.service'
import { AlertRecord } from './alert.schema'
import { AlertService } from './alert.service'

const makeAlert = (
  id: string,
  resolved = false,
  type: AlertType = AlertType.DATA_STALE,
) => ({
  _id: { toString: () => id },
  type,
  severity: AlertSeverity.MEDIUM,
  message: 'BTC price is stale',
  assetId: 'BTC',
  timestamp: new Date(1_700_000_000_000),
  resolved,
  resolvedAt: undefined,
})

const mockAlertModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}

const mockNats = {
  publish: jest.fn(),
  subscribe: jest.fn(),
}

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
}

describe('AlertService', () => {
  let service: AlertService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: getModelToken(AlertRecord.name), useValue: mockAlertModel },
        { provide: NatsService, useValue: mockNats },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile()

    service = module.get<AlertService>(AlertService)
  })

  it('deduplicates identical active alerts by type and resource', async () => {
    const existingAlert = makeAlert('alert-1')

    mockRedis.get.mockResolvedValue('alert-1')
    mockAlertModel.findById.mockResolvedValue(existingAlert)

    const first = await service.create(
      AlertType.DATA_STALE,
      AlertSeverity.MEDIUM,
      'BTC price is stale',
      'BTC',
    )
    const second = await service.create(
      AlertType.DATA_STALE,
      AlertSeverity.MEDIUM,
      'BTC price is still stale',
      'BTC',
    )

    expect(first.id).toBe('alert-1')
    expect(second.id).toBe('alert-1')
    expect(mockAlertModel.create).not.toHaveBeenCalled()
    expect(mockNats.publish).not.toHaveBeenCalledWith(
      WsEventType.ALERT_CREATED,
      expect.anything(),
    )
  })

  it('creates and publishes a new alert when no active dedupe key exists', async () => {
    const newAlert = makeAlert('alert-2')

    mockRedis.get.mockResolvedValue(null)
    mockRedis.setIfNotExists.mockResolvedValue(true)
    mockAlertModel.create.mockResolvedValue(newAlert)

    const created = await service.create(
      AlertType.DATA_STALE,
      AlertSeverity.MEDIUM,
      'BTC price is stale',
      'BTC',
    )

    expect(created.id).toBe('alert-2')
    expect(mockAlertModel.create).toHaveBeenCalledTimes(1)
    expect(mockNats.publish).toHaveBeenCalledWith(
      WsEventType.ALERT_CREATED,
      expect.objectContaining({ id: 'alert-2' }),
    )
  })

  it('resolves all active alerts for a type and resource', async () => {
    const alerts = [
      makeAlert('alert-1', false, AlertType.CIRCUIT_OPEN),
      makeAlert('alert-2', false, AlertType.CIRCUIT_OPEN),
    ]

    mockAlertModel.find.mockResolvedValue(alerts)
    mockAlertModel.findByIdAndUpdate.mockImplementation((_id, update) =>
      Promise.resolve({
        ...alerts[0],
        ...update,
        assetId: 'BTC',
        type: AlertType.CIRCUIT_OPEN,
      }),
    )
    mockRedis.del.mockResolvedValue(1)

    await service.resolveAllByTypeAndResource(AlertType.CIRCUIT_OPEN, 'BTC')

    expect(mockAlertModel.find).toHaveBeenCalledWith({
      type: AlertType.CIRCUIT_OPEN,
      assetId: 'BTC',
      resolved: false,
    })
    expect(mockAlertModel.findByIdAndUpdate).toHaveBeenCalledTimes(2)
    expect(mockNats.publish).toHaveBeenCalledWith(
      WsEventType.ALERT_RESOLVED,
      expect.anything(),
    )
  })
})
