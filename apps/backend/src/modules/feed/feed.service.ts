import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FeedMode, FeedScenario, WsEventType } from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'
import {
  APP_CONSTANTS,
  FEED_DELAYED_EVERY_NTH_TICK_ENV,
  FEED_DRIFT_MULTIPLIER_ENV,
  FEED_INTERVAL_MS_ENV,
} from '../../config/constants'
import { FEED_SCENARIOS } from './scenarios'

export interface PriceTick {
  assetId: string
  price: number
  timestamp: Date
  mode: FeedMode
}

const BASE_PRICES: Record<string, number> = {
  BTC: 65000,
  ETH: 3200,
}

@Injectable()
export class FeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeedService.name)
  private modes: Record<string, FeedMode> = {
    BTC: FeedMode.HEALTHY,
    ETH: FeedMode.HEALTHY,
  }
  private intervalMs: number
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private scenarioTimeouts: NodeJS.Timeout[] = []
  private handlers: Array<(tick: PriceTick) => void> = []
  private sequenceByAsset: Record<string, number> = {
    BTC: 0,
    ETH: 0,
  }
  private readonly delayedEveryNthTick: number
  private readonly driftMultiplier: number

  constructor(
    private readonly config: ConfigService,
    private readonly nats: NatsService,
  ) {
    this.intervalMs = this.config.get<number>(
      FEED_INTERVAL_MS_ENV,
      APP_CONSTANTS.feed.intervalMs,
    )
    this.delayedEveryNthTick = this.config.get<number>(
      FEED_DELAYED_EVERY_NTH_TICK_ENV,
      APP_CONSTANTS.feed.delayedEveryNthTick,
    )
    this.driftMultiplier = this.config.get<number>(
      FEED_DRIFT_MULTIPLIER_ENV,
      APP_CONSTANTS.feed.driftMultiplier,
    )
  }

  onModuleInit() {
    for (const assetId of Object.keys(BASE_PRICES)) {
      this.startFeed(assetId)
    }
  }

  onModuleDestroy() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.clearScenarioTimeouts()
  }

  setMode(assetId: string, mode: FeedMode) {
    const previousMode = this.getMode(assetId)
    this.modes[assetId] = mode
    this.logger.log(
      JSON.stringify({
        event: 'feed.mode_changed',
        assetId,
        previousMode,
        mode,
      }),
    )
    this.nats.publish(WsEventType.FEED_STATUS_CHANGED, {
      assetId,
      mode,
      timestamp: Date.now(),
    })

    if (mode === FeedMode.HEALTHY) {
      this.nats.publish('circuit.reset', { assetId })
    }
  }

  getMode(assetId: string): FeedMode {
    return this.modes[assetId] ?? FeedMode.HEALTHY
  }

  getModes(): Record<string, FeedMode> {
    return { ...this.modes }
  }

  onTick(handler: (tick: PriceTick) => void) {
    this.handlers.push(handler)
  }

  runScenario(scenario: FeedScenario) {
    const steps = FEED_SCENARIOS[scenario]
    if (!steps) {
      this.logger.warn(`Ignoring unknown scenario ${scenario}`)
      return
    }

    this.clearScenarioTimeouts()
    this.logger.log(
      JSON.stringify({
        event: 'feed.scenario_started',
        scenario,
        steps: steps.length,
      }),
    )

    for (const step of steps) {
      const timeout = setTimeout(() => {
        this.setMode(step.assetId, step.mode)
      }, step.afterMs)
      this.scenarioTimeouts.push(timeout)
    }
  }

  private startFeed(assetId: string) {
    const interval = setInterval(() => {
      const tick = this.generateTick(assetId)
      if (tick) {
        this.handlers.forEach((h) => h(tick))
      }
    }, this.intervalMs)

    this.intervals.set(assetId, interval)
  }

  private generateTick(assetId: string): PriceTick | null {
    const mode = this.modes[assetId]
    this.sequenceByAsset[assetId] = (this.sequenceByAsset[assetId] ?? 0) + 1
    const sequence = this.sequenceByAsset[assetId]

    if (mode === FeedMode.OFFLINE) return null
    if (
      mode === FeedMode.DELAYED &&
      sequence % this.delayedEveryNthTick !== 0
    ) {
      return null
    }

    const base = BASE_PRICES[assetId]
    const wave = Math.sin(sequence / 3) * 0.0035
    const healthyPrice = base * (1 + wave)
    const price =
      mode === FeedMode.DRIFTED
        ? healthyPrice * this.driftMultiplier
        : healthyPrice

    return {
      assetId,
      price: parseFloat(price.toFixed(2)),
      timestamp: new Date(),
      mode,
    }
  }

  private clearScenarioTimeouts() {
    for (const timeout of this.scenarioTimeouts) {
      clearTimeout(timeout)
    }
    this.scenarioTimeouts = []
  }
}
