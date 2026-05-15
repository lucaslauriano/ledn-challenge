import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FeedMode } from '@ledn/shared'
import { NatsService } from '../../common/nats/nats.service'

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
  private handlers: Array<(tick: PriceTick) => void> = []

  constructor(
    private readonly config: ConfigService,
    private readonly nats: NatsService,
  ) {
    this.intervalMs = this.config.get<number>('FEED_INTERVAL_MS', 1000)
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
  }

  setMode(assetId: string, mode: FeedMode) {
    this.modes[assetId] = mode
    this.logger.log(`Feed mode for ${assetId} set to ${mode}`)

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

    if (mode === FeedMode.OFFLINE) return null

    const base = BASE_PRICES[assetId]
    let price = base

    if (mode === FeedMode.DRIFTED) {
      price = base * (1 + (Math.random() - 0.3) * 0.1)
    } else if (mode === FeedMode.DELAYED) {
      price = base * (1 + (Math.random() - 0.5) * 0.02)
    } else {
      price = base * (1 + (Math.random() - 0.5) * 0.005)
    }

    BASE_PRICES[assetId] = price

    return {
      assetId,
      price: parseFloat(price.toFixed(2)),
      timestamp: new Date(),
      mode,
    }
  }
}
