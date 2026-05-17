import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import {
  AlertSeverity,
  AlertType,
  DataConfidence,
  LiquidityConfidence,
  LiquiditySnapshot,
  LiquiditySourceState,
  LiquiditySourceStatus,
  PriceRecord,
  WsEventType,
} from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'
import { APP_CONSTANTS } from '../../config/constants'
import { AlertService } from '../alert/alert.service'
import { applyLiquidityPolicy } from './liquidity-policy'

interface SourceRuntimeState {
  sourceId: string
  amount: number
  updatedAt: number
  status: LiquiditySourceState
}

export interface AuditEntry {
  id: string
  type:
    | 'LOCK'
    | 'RELEASE'
    | 'SETTLEMENT_START'
    | 'SETTLEMENT_SETTLE'
    | 'SETTLEMENT_FAIL'
  amount: number
  operatorId: string
  timestamp: number
}

export interface SettlementLiquidityMetrics {
  pendingSettlementAmount: number
  delayedSettlementAmount: number
  oldestPendingSettlementAgeMs: number
  settlementExposure: number
}

@Injectable()
export class LiquidityService implements OnModuleInit {
  private readonly logger = new Logger(LiquidityService.name)
  private readonly intervalMs = APP_CONSTANTS.liquidity.intervalMs
  private readonly lowAvailableRatio = APP_CONSTANTS.liquidity.lowAvailableRatio
  private readonly staleSourceThresholdMs =
    APP_CONSTANTS.liquidity.staleSourceThresholdMs

  private tick = 0
  private auditTrail: AuditEntry[] = []
  private readonly degradedAssets = new Set<string>()
  private lastConservativeMode = false
  private settlementMetrics: SettlementLiquidityMetrics = {
    pendingSettlementAmount: 0,
    delayedSettlementAmount: 0,
    oldestPendingSettlementAgeMs: 0,
    settlementExposure: 0,
  }

  private readonly sources: Record<string, SourceRuntimeState> = {
    [APP_CONSTANTS.liquidity.sources.internalLedger.sourceId]: {
      sourceId: APP_CONSTANTS.liquidity.sources.internalLedger.sourceId,
      amount: APP_CONSTANTS.liquidity.sources.internalLedger.baseAmount,
      updatedAt: Date.now(),
      status: LiquiditySourceState.HEALTHY,
    },
    [APP_CONSTANTS.liquidity.sources.custodian.sourceId]: {
      sourceId: APP_CONSTANTS.liquidity.sources.custodian.sourceId,
      amount: APP_CONSTANTS.liquidity.sources.custodian.baseAmount,
      updatedAt: Date.now(),
      status: LiquiditySourceState.HEALTHY,
    },
    [APP_CONSTANTS.liquidity.sources.settlementRail.sourceId]: {
      sourceId: APP_CONSTANTS.liquidity.sources.settlementRail.sourceId,
      amount: APP_CONSTANTS.liquidity.sources.settlementRail.baseAmount,
      updatedAt: Date.now(),
      status: LiquiditySourceState.HEALTHY,
    },
  }

  private snapshot: LiquiditySnapshot = this.buildSnapshot()

  constructor(
    private readonly nats: NatsService,
    private readonly alertService: AlertService,
  ) {}

  onModuleInit() {
    this.nats.subscribe<PriceRecord>(WsEventType.PRICE_UPDATED, (price) => {
      void this.handlePriceConfidence(price)
    })

    setInterval(() => {
      this.simulateSourceUpdates()
      void this.refreshSnapshot()
    }, this.intervalMs)
  }

  getSnapshot() {
    return this.snapshot
  }

  getAuditTrail() {
    return this.auditTrail.slice(0, 20)
  }

  async lockFunds(amount: number) {
    this.validateAmount(amount)

    this.snapshot = this.buildSnapshot()
    const availableForLock =
      this.snapshot.availableAdjusted ?? this.snapshot.available

    if (amount > availableForLock) {
      if (this.snapshot.conservativeMode) {
        this.logger.warn(
          JSON.stringify({
            event: 'liquidity.lock_blocked',
            reason: 'CONSERVATIVE_MODE',
            amount,
            availableAdjusted: availableForLock,
            degradedAssets: this.snapshot.degradedAssets,
          }),
        )
        throw new BadRequestException(
          `Insufficient conservative liquidity. Max available while pricing is degraded: ${availableForLock}`,
        )
      }

      throw new BadRequestException('Insufficient available funds')
    }

    this.sources['internal-ledger'].amount -= amount
    this.sources.custodian.amount += amount
    this.touchSource('internal-ledger')
    this.touchSource('custodian')
    this.recordAudit('LOCK', amount)
    this.logger.log(
      JSON.stringify({
        event: 'liquidity.locked',
        amount,
        operatorId: 'demo-operator',
        available: this.sources['internal-ledger'].amount,
        locked: this.sources.custodian.amount,
      }),
    )

    await this.refreshSnapshot()
    return this.snapshot
  }

  async releaseFunds(amount: number) {
    this.validateAmount(amount)

    if (amount > this.sources.custodian.amount) {
      throw new BadRequestException('Insufficient locked funds')
    }

    this.sources.custodian.amount -= amount
    this.sources['internal-ledger'].amount += amount
    this.touchSource('internal-ledger')
    this.touchSource('custodian')
    this.recordAudit('RELEASE', amount)
    this.logger.log(
      JSON.stringify({
        event: 'liquidity.released',
        amount,
        operatorId: 'demo-operator',
        available: this.sources['internal-ledger'].amount,
        locked: this.sources.custodian.amount,
      }),
    )

    await this.refreshSnapshot()
    return this.snapshot
  }

  async startSettlement(amount: number) {
    this.validateAmount(amount)

    this.snapshot = this.buildSnapshot()
    const availableForSettlement =
      this.snapshot.availableAdjusted ?? this.snapshot.available

    if (amount > availableForSettlement) {
      throw new BadRequestException(
        'Insufficient available funds for settlement',
      )
    }

    this.sources['internal-ledger'].amount -= amount
    this.sources['settlement-rail'].amount += amount
    this.touchSource('internal-ledger')
    this.touchSource('settlement-rail')
    this.recordAudit('SETTLEMENT_START', amount)

    await this.refreshSnapshot()
    return this.snapshot
  }

  async settleInFlight(amount: number) {
    this.validateAmount(amount)

    if (amount > this.sources['settlement-rail'].amount) {
      throw new BadRequestException('Insufficient in-flight funds')
    }

    this.sources['settlement-rail'].amount -= amount
    this.touchSource('settlement-rail')
    this.recordAudit('SETTLEMENT_SETTLE', amount)

    await this.refreshSnapshot()
    return this.snapshot
  }

  async failSettlement(amount: number) {
    this.validateAmount(amount)

    if (amount > this.sources['settlement-rail'].amount) {
      throw new BadRequestException('Insufficient in-flight funds')
    }

    this.sources['settlement-rail'].amount -= amount
    this.sources['internal-ledger'].amount += amount
    this.touchSource('settlement-rail')
    this.touchSource('internal-ledger')
    this.recordAudit('SETTLEMENT_FAIL', amount)

    await this.refreshSnapshot()
    return this.snapshot
  }

  async updateSettlementMetrics(metrics: SettlementLiquidityMetrics) {
    this.setSettlementMetrics(metrics)
    await this.refreshSnapshot()
    return this.snapshot
  }

  private async refreshSnapshot() {
    const nextSnapshot = this.buildSnapshot()
    this.logConservativeModeTransition(nextSnapshot)
    this.snapshot = nextSnapshot
    await this.syncAlerts(this.snapshot)
    this.nats.publish(WsEventType.LIQUIDITY_SNAPSHOT, this.snapshot)
  }

  private buildSnapshot(): LiquiditySnapshot {
    const now = Date.now()
    const sources = Object.values(this.sources).map((source) =>
      this.toSourceStatus(source, now),
    )
    const available = this.sources['internal-ledger'].amount
    const locked = this.sources.custodian.amount
    const inFlight = this.sources['settlement-rail'].amount
    const total = available + locked + inFlight
    const degradedAssets = [...this.degradedAssets].sort()
    const policy = applyLiquidityPolicy({ available, degradedAssets })
    const confidence = sources.some(
      (source) => source.status !== LiquiditySourceState.HEALTHY,
    )
      ? LiquidityConfidence.DEGRADED
      : LiquidityConfidence.FRESH

    return {
      available,
      locked,
      inFlight,
      total,
      sources,
      confidence,
      conservativeMode: policy.conservativeMode,
      availableAdjusted: policy.availableAdjusted,
      degradedAssets,
      pendingSettlementAmount: this.settlementMetrics.pendingSettlementAmount,
      delayedSettlementAmount: this.settlementMetrics.delayedSettlementAmount,
      oldestPendingSettlementAgeMs:
        this.settlementMetrics.oldestPendingSettlementAgeMs,
      settlementExposure: this.settlementMetrics.settlementExposure,
      timestamp: now,
      updatedAt: Math.max(...sources.map((source) => source.updatedAt)),
      schemaVersion: APP_CONSTANTS.schemaVersion,
    }
  }

  private toSourceStatus(
    source: SourceRuntimeState,
    now: number,
  ): LiquiditySourceStatus {
    const ageMs = now - source.updatedAt
    const status =
      ageMs > this.staleSourceThresholdMs
        ? LiquiditySourceState.OFFLINE
        : source.status

    return {
      sourceId: source.sourceId,
      amount: source.amount,
      updatedAt: source.updatedAt,
      status,
    }
  }

  private simulateSourceUpdates() {
    this.tick += 1

    // Keep available/locked stable so operator lock/release actions are obvious.
    this.applyWave('settlement-rail', 0.012)

    if (this.tick % 4 === 0) {
      this.sources.custodian.status = LiquiditySourceState.DELAYED
    } else {
      this.sources.custodian.status = LiquiditySourceState.HEALTHY
      this.touchSource('custodian')
    }
  }

  private applyWave(sourceId: string, factor: number) {
    const source = this.sources[sourceId]
    const delta = source.amount * factor * Math.sin(this.tick / 2)
    source.amount = Math.max(0, parseFloat((source.amount + delta).toFixed(2)))
    source.status = LiquiditySourceState.HEALTHY
    this.touchSource(sourceId)
  }

  private touchSource(sourceId: string) {
    this.sources[sourceId].updatedAt = Date.now()
  }

  private recordAudit(type: AuditEntry['type'], amount: number) {
    this.auditTrail = [
      {
        id: `${type.toLowerCase()}-${Date.now()}`,
        type,
        amount,
        operatorId: 'demo-operator',
        timestamp: Date.now(),
      },
      ...this.auditTrail,
    ].slice(0, 20)
  }

  private validateAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number')
    }
  }

  private setSettlementMetrics(metrics: SettlementLiquidityMetrics) {
    this.settlementMetrics = {
      pendingSettlementAmount: parseFloat(
        metrics.pendingSettlementAmount.toFixed(2),
      ),
      delayedSettlementAmount: parseFloat(
        metrics.delayedSettlementAmount.toFixed(2),
      ),
      oldestPendingSettlementAgeMs: Math.max(
        0,
        Math.round(metrics.oldestPendingSettlementAgeMs),
      ),
      settlementExposure: parseFloat(metrics.settlementExposure.toFixed(2)),
    }
  }

  private async handlePriceConfidence(price: PriceRecord) {
    if (price.confidence === DataConfidence.FRESH) {
      this.degradedAssets.delete(price.assetId)
    } else {
      this.degradedAssets.add(price.assetId)
    }

    await this.refreshSnapshot()
  }

  private logConservativeModeTransition(snapshot: LiquiditySnapshot) {
    if (snapshot.conservativeMode === this.lastConservativeMode) return

    this.logger.warn(
      JSON.stringify({
        event: snapshot.conservativeMode
          ? 'liquidity.conservative_mode_entered'
          : 'liquidity.conservative_mode_exited',
        conservativeMode: snapshot.conservativeMode,
        available: snapshot.available,
        availableAdjusted: snapshot.availableAdjusted,
        degradedAssets: snapshot.degradedAssets,
      }),
    )

    this.lastConservativeMode = snapshot.conservativeMode
  }

  private async syncAlerts(snapshot: LiquiditySnapshot) {
    const availableRatio =
      snapshot.total === 0 ? 0 : snapshot.available / snapshot.total

    if (availableRatio < this.lowAvailableRatio) {
      this.nats.publish('alert.trigger', {
        type: AlertType.LIQUIDITY_LOW,
        severity: AlertSeverity.HIGH,
        assetId: 'liquidity',
        message: `Available liquidity dropped to ${(availableRatio * 100).toFixed(1)}%`,
      })
    } else {
      await this.alertService.resolveByTypeAndResource(
        AlertType.LIQUIDITY_LOW,
        'liquidity',
      )
    }

    const staleSource = snapshot.sources.find(
      (source) => source.status !== LiquiditySourceState.HEALTHY,
    )

    if (staleSource) {
      this.nats.publish('alert.trigger', {
        type: AlertType.LIQUIDITY_SOURCE_STALE,
        severity: AlertSeverity.HIGH,
        assetId: staleSource.sourceId,
        message: `${staleSource.sourceId} is ${staleSource.status.toLowerCase()}`,
      })
    } else {
      for (const source of snapshot.sources) {
        await this.alertService.resolveByTypeAndResource(
          AlertType.LIQUIDITY_SOURCE_STALE,
          source.sourceId,
        )
      }
    }
  }
}
