import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import {
  AlertSeverity,
  AlertType,
  SettlementScenario,
  SettlementStatus,
} from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'
import {
  APP_CONSTANTS,
  SETTLEMENT_DELAYED_ALERT_TYPE,
  SETTLEMENT_EXPOSURE_BREACH_ALERT_TYPE,
  SETTLEMENT_FAILED_ALERT_TYPE,
  SETTLEMENTS_UPDATED_EVENT,
} from '../../config/constants'
import { AlertService } from '../alert/alert.service'
import { LiquidityService } from '../liquidity/liquidity.service'

const DELAYED_ALERT_TYPE: AlertType = SETTLEMENT_DELAYED_ALERT_TYPE
const FAILED_ALERT_TYPE: AlertType = SETTLEMENT_FAILED_ALERT_TYPE
const EXPOSURE_BREACH_ALERT_TYPE: AlertType =
  SETTLEMENT_EXPOSURE_BREACH_ALERT_TYPE
const SETTLEMENTS_UPDATED_SUBJECT: string = SETTLEMENTS_UPDATED_EVENT

type SettlementOperationRecord = {
  id: string
  amount: number
  currency: string
  status: SettlementStatus
  scenario: SettlementScenario
  createdAt: number
  bookedAt?: number
  lockedAt?: number
  submittedAt?: number
  expectedSettlementAt?: number
  settledAt?: number
  failedAt?: number
  exposureWindowMs: number
}

type SettlementSnapshotRecord = {
  operations: SettlementOperationRecord[]
  pendingSettlementAmount: number
  delayedSettlementAmount: number
  oldestPendingSettlementAgeMs: number
  settlementExposure: number
  updatedAt: number
}

@Injectable()
export class SettlementService implements OnModuleInit {
  private readonly logger = new Logger(SettlementService.name)
  private operations: SettlementOperationRecord[] = []
  private sequence = 0

  constructor(
    private readonly liquidityService: LiquidityService,
    private readonly alertService: AlertService,
    private readonly nats: NatsService,
  ) {}

  onModuleInit() {
    void this.pruneOrphanedSettlementAlerts()
  }

  getSnapshot(): SettlementSnapshotRecord {
    return this.buildSnapshot()
  }

  async startSettlement(
    amount: number,
    scenario: SettlementScenario = SettlementScenario.NORMAL,
  ): Promise<SettlementSnapshotRecord> {
    this.validateAmount(amount)

    const now = Date.now()
    const operation: SettlementOperationRecord = {
      id: this.nextOperationId(now),
      amount,
      currency: 'USD',
      status: SettlementStatus.PENDING_SETTLEMENT,
      scenario,
      createdAt: now,
      bookedAt: now,
      lockedAt: now,
      submittedAt: now,
      expectedSettlementAt:
        now +
        (scenario === SettlementScenario.DELAYED
          ? APP_CONSTANTS.settlement.delayedSettlementDelayMs
          : APP_CONSTANTS.settlement.normalSettlementDelayMs),
      exposureWindowMs: 0,
    }

    await this.liquidityService.startSettlement(amount)
    this.operations = [operation, ...this.operations].slice(0, 20)

    if (scenario === SettlementScenario.FAILED) {
      await this.failSettlement(operation.id)
      return this.getSnapshot()
    }

    await this.publishSnapshot()
    this.logger.log(
      JSON.stringify({
        event: 'settlement.started',
        id: operation.id,
        amount,
        scenario,
      }),
    )
    return this.getSnapshot()
  }

  async settleSettlement(id: string): Promise<SettlementSnapshotRecord> {
    const operation = this.getOpenOperation(id)

    operation.status = SettlementStatus.SETTLED
    operation.settledAt = Date.now()
    operation.exposureWindowMs = operation.settledAt - operation.submittedAt!

    await this.liquidityService.settleInFlight(operation.amount)
    await this.resolveSettlementAlerts(operation.id)
    await this.publishSnapshot()
    return this.getSnapshot()
  }

  async failSettlement(id: string): Promise<SettlementSnapshotRecord> {
    const operation = this.getOpenOperation(id)

    operation.status = SettlementStatus.FAILED
    operation.failedAt = Date.now()
    operation.exposureWindowMs = operation.failedAt - operation.submittedAt!

    await this.liquidityService.failSettlement(operation.amount)
    await this.resolveSettlementAlerts(operation.id)
    this.nats.publish('alert.trigger', {
      type: FAILED_ALERT_TYPE,
      severity: AlertSeverity.HIGH,
      assetId: operation.id,
      message: `Settlement ${operation.id} failed and funds were released back to available liquidity`,
    })
    await this.publishSnapshot()
    return this.getSnapshot()
  }

  async markDelayed(id: string): Promise<SettlementSnapshotRecord> {
    const operation = this.getOpenOperation(id)
    operation.expectedSettlementAt = Date.now() - 1
    await this.publishSnapshot()
    return this.getSnapshot()
  }

  private buildSnapshot(): SettlementSnapshotRecord {
    const now = Date.now()
    const operations: SettlementOperationRecord[] = this.operations.map(
      (operation) => this.withExposureWindow(operation, now),
    )
    const pending = operations.filter(
      (operation) => operation.status === SettlementStatus.PENDING_SETTLEMENT,
    )
    const delayed = pending.filter(
      (operation) =>
        operation.expectedSettlementAt !== undefined &&
        operation.expectedSettlementAt < now,
    )

    return {
      operations,
      pendingSettlementAmount: this.sum(pending),
      delayedSettlementAmount: this.sum(delayed),
      oldestPendingSettlementAgeMs:
        pending.length === 0
          ? 0
          : Math.max(
              ...pending.map((operation) => now - operation.submittedAt!),
            ),
      settlementExposure: this.sum(pending),
      updatedAt: now,
    }
  }

  private async publishSnapshot(): Promise<void> {
    const snapshot = this.buildSnapshot()
    await this.syncAlerts(snapshot)
    await this.liquidityService.updateSettlementMetrics({
      pendingSettlementAmount: snapshot.pendingSettlementAmount,
      delayedSettlementAmount: snapshot.delayedSettlementAmount,
      oldestPendingSettlementAgeMs: snapshot.oldestPendingSettlementAgeMs,
      settlementExposure: snapshot.settlementExposure,
    })
    this.nats.publish(SETTLEMENTS_UPDATED_SUBJECT, snapshot)
  }

  private async syncAlerts(snapshot: SettlementSnapshotRecord): Promise<void> {
    for (const operation of snapshot.operations) {
      if (operation.status !== SettlementStatus.PENDING_SETTLEMENT) {
        await this.resolveSettlementAlerts(operation.id)
        continue
      }

      const isDelayed =
        operation.expectedSettlementAt !== undefined &&
        operation.expectedSettlementAt < Date.now()
      const hasExposureBreach =
        operation.exposureWindowMs >
        APP_CONSTANTS.settlement.exposureBreachThresholdMs

      if (isDelayed) {
        this.nats.publish('alert.trigger', {
          type: DELAYED_ALERT_TYPE,
          severity: AlertSeverity.HIGH,
          assetId: operation.id,
          message: `Settlement ${operation.id} is delayed`,
        })
      } else {
        await this.alertService.resolveAllByTypeAndResource(
          DELAYED_ALERT_TYPE,
          operation.id,
        )
      }

      if (hasExposureBreach) {
        this.nats.publish('alert.trigger', {
          type: EXPOSURE_BREACH_ALERT_TYPE,
          severity: AlertSeverity.CRITICAL,
          assetId: operation.id,
          message: `Settlement ${operation.id} exposure window exceeded threshold`,
        })
      } else {
        await this.alertService.resolveAllByTypeAndResource(
          EXPOSURE_BREACH_ALERT_TYPE,
          operation.id,
        )
      }
    }
  }

  private async resolveSettlementAlerts(operationId: string): Promise<void> {
    await Promise.all([
      this.alertService.resolveAllByTypeAndResource(
        DELAYED_ALERT_TYPE,
        operationId,
      ),
      this.alertService.resolveAllByTypeAndResource(
        EXPOSURE_BREACH_ALERT_TYPE,
        operationId,
      ),
      this.alertService.resolveAllByTypeAndResource(
        FAILED_ALERT_TYPE,
        operationId,
      ),
    ])
  }

  private async pruneOrphanedSettlementAlerts(): Promise<void> {
    const activePendingIds = new Set(
      this.operations
        .filter(
          (operation) =>
            operation.status === SettlementStatus.PENDING_SETTLEMENT,
        )
        .map((operation) => operation.id),
    )

    const staleAlerts = await this.alertService.findActiveByTypes([
      DELAYED_ALERT_TYPE,
      FAILED_ALERT_TYPE,
      EXPOSURE_BREACH_ALERT_TYPE,
    ])

    await Promise.all(
      staleAlerts
        .filter((alert) => !activePendingIds.has(alert.resourceId))
        .map((alert) => this.alertService.resolve(alert.id)),
    )
  }

  private withExposureWindow(
    operation: SettlementOperationRecord,
    now: number,
  ): SettlementOperationRecord {
    if (operation.status !== SettlementStatus.PENDING_SETTLEMENT)
      return operation

    return {
      ...operation,
      exposureWindowMs: now - operation.submittedAt!,
    }
  }

  private getOpenOperation(id: string): SettlementOperationRecord {
    const operation = this.operations.find((item) => item.id === id)
    if (!operation) throw new BadRequestException('Settlement not found')
    if (operation.status !== SettlementStatus.PENDING_SETTLEMENT) {
      throw new BadRequestException('Settlement is already closed')
    }

    return operation
  }

  private validateAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number')
    }
  }

  private nextOperationId(timestamp: number): string {
    this.sequence += 1
    return `settlement-${timestamp}-${this.sequence}`
  }

  private sum(operations: SettlementOperationRecord[]): number {
    return parseFloat(
      operations
        .reduce((total, operation) => total + operation.amount, 0)
        .toFixed(2),
    )
  }
}
