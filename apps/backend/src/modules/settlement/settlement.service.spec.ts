import { BadRequestException } from '@nestjs/common'
import {
  AlertType,
  SettlementScenario,
  SettlementStatus,
  WsEventType,
} from '@ledn/shared'
import { SettlementService } from './settlement.service'

const liquidityService = {
  startSettlement: jest.fn(),
  settleInFlight: jest.fn(),
  failSettlement: jest.fn(),
  updateSettlementMetrics: jest.fn(),
}

const alertService = {
  resolveByTypeAndResource: jest.fn(),
  resolveAllByTypeAndResource: jest.fn(),
  findActiveByTypes: jest.fn().mockResolvedValue([]),
  resolve: jest.fn(),
}

const nats = {
  publish: jest.fn(),
}

describe('SettlementService', () => {
  let service: SettlementService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SettlementService(
      liquidityService as never,
      alertService as never,
      nats as never,
    )
  })

  it('starts settlement and moves funds into in-flight liquidity', async () => {
    const snapshot = await service.startSettlement(25_000)

    expect(liquidityService.startSettlement).toHaveBeenCalledWith(25_000)
    expect(snapshot.pendingSettlementAmount).toBe(25_000)
    expect(snapshot.settlementExposure).toBe(25_000)
    expect(snapshot.operations[0]).toEqual(
      expect.objectContaining({
        amount: 25_000,
        status: SettlementStatus.PENDING_SETTLEMENT,
      }),
    )
  })

  it('settles pending operation and reduces in-flight liquidity', async () => {
    const started = await service.startSettlement(15_000)
    const operationId: string = started.operations[0].id

    const snapshot = await service.settleSettlement(operationId)

    expect(liquidityService.settleInFlight).toHaveBeenCalledWith(15_000)
    expect(snapshot.pendingSettlementAmount).toBe(0)
    expect(snapshot.operations[0].status).toBe(SettlementStatus.SETTLED)
  })

  it('fails pending operation and reverses funds to available liquidity', async () => {
    const started = await service.startSettlement(10_000)
    const operationId: string = started.operations[0].id

    const snapshot = await service.failSettlement(operationId)

    expect(liquidityService.failSettlement).toHaveBeenCalledWith(10_000)
    expect(snapshot.pendingSettlementAmount).toBe(0)
    expect(snapshot.operations[0].status).toBe(SettlementStatus.FAILED)
    expect(nats.publish).toHaveBeenCalledWith(
      'alert.trigger',
      expect.objectContaining({ type: AlertType.SETTLEMENT_FAILED }),
    )
  })

  it('raises delayed settlement alert when an operation is delayed', async () => {
    const started = await service.startSettlement(
      5_000,
      SettlementScenario.DELAYED,
    )
    const operationId: string = started.operations[0].id

    const snapshot = await service.markDelayed(operationId)

    expect(snapshot.delayedSettlementAmount).toBe(5_000)
    expect(nats.publish).toHaveBeenCalledWith(
      'alert.trigger',
      expect.objectContaining({ type: AlertType.SETTLEMENT_DELAYED }),
    )
  })

  it('rejects closing an already closed operation', async () => {
    const started = await service.startSettlement(8_000)
    const operationId: string = started.operations[0].id

    await service.settleSettlement(operationId)

    await expect(service.failSettlement(operationId)).rejects.toThrow(
      BadRequestException,
    )
  })

  it('publishes settlement snapshots over websocket events', async () => {
    await service.startSettlement(7_000)

    expect(nats.publish).toHaveBeenCalledWith(
      WsEventType.SETTLEMENTS_UPDATED,
      expect.objectContaining({ pendingSettlementAmount: 7_000 }),
    )
  })

  it('creates unique operation ids for rapid starts', async () => {
    const first = await service.startSettlement(1_000)
    const second = await service.startSettlement(1_000)

    expect(first.operations[0].id).not.toBe(second.operations[0].id)
  })
})
