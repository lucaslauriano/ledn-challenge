import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ConfigService } from '@nestjs/config'
import {
  AlertSeverity,
  AlertType,
  DataConfidence,
  FeedMode,
  PriceRecord as SharedPriceRecord,
  PriceSource,
  WsEventType,
} from '@ledn/shared'
import { RedisService } from '../../common/redis/redis.service'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { FeedService, PriceTick } from '../feed/feed.service'
import { PriceRecord, PriceDocument } from './price.schema'
import { NatsService } from '../../common/nats/nats.service'
import { APP_CONSTANTS, STALE_THRESHOLD_MS_ENV } from '../../config/constants'
import { AlertService } from '../alert/alert.service'

const CACHE_TTL = 60
const CACHE_KEY = (assetId: string) => `price:last_known:${assetId}`

@Injectable()
export class PriceService implements OnModuleInit {
  private readonly logger = new Logger(PriceService.name)
  private readonly staleThresholdMs: number
  private readonly confidenceByAsset = new Map<string, DataConfidence>()

  constructor(
    @InjectModel(PriceRecord.name)
    private readonly priceModel: Model<PriceDocument>,
    private readonly redis: RedisService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly feed: FeedService,
    private readonly config: ConfigService,
    private readonly nats: NatsService,
    private readonly alertService: AlertService,
  ) {
    this.staleThresholdMs = this.config.get<number>(
      STALE_THRESHOLD_MS_ENV,
      APP_CONSTANTS.feed.staleThresholdMs,
    )
  }

  onModuleInit() {
    this.feed.onTick((tick) => {
      void this.handleTick(tick)
    })

    setInterval(() => {
      void this.checkStaleness()
    }, 2000)
  }

  private async checkStaleness() {
    const assets = APP_CONSTANTS.assets
    for (const assetId of assets) {
      const cached = await this.redis.get(CACHE_KEY(assetId))
      if (!cached) continue

      const parsed = JSON.parse(cached) as SharedPriceRecord
      const ageMs = Date.now() - parsed.timestamp

      if (ageMs > this.staleThresholdMs) {
        const feedMode = this.feed.getMode(assetId)
        const staleRecord = {
          ...parsed,
          confidence: DataConfidence.STALE,
          feedMode,
          ageMs,
        }
        this.logConfidenceChange(assetId, DataConfidence.STALE, {
          ageMs,
          feedMode,
          source: staleRecord.source,
        })
        this.nats.publish(WsEventType.PRICE_UPDATED, staleRecord)
        this.raiseHealthAlert(assetId, feedMode, ageMs)

        const isOpen = await this.circuitBreaker.isOpen(assetId)
        if (!isOpen) {
          await this.circuitBreaker.recordFailure(assetId)
        }
      } else {
        await this.resolveHealthAlerts(assetId)
      }
    }
  }

  async getCurrentPrice(assetId: string): Promise<SharedPriceRecord | null> {
    const isOpen = await this.circuitBreaker.isOpen(assetId)

    if (isOpen) {
      return this.getFallbackPrice(assetId)
    }

    const cached = await this.redis.get(CACHE_KEY(assetId))

    if (cached) {
      const parsed: SharedPriceRecord = JSON.parse(cached)
      const ageMs = Date.now() - parsed.timestamp
      const confidence =
        ageMs > this.staleThresholdMs
          ? DataConfidence.STALE
          : DataConfidence.FRESH

      return { ...parsed, ageMs, confidence }
    }

    return this.getFallbackPrice(assetId)
  }

  async getLatestPrices(): Promise<Record<string, any>> {
    const assets = APP_CONSTANTS.assets
    const result: Record<string, any> = {}

    for (const assetId of assets) {
      result[assetId] = await this.getCurrentPrice(assetId)
    }

    return result
  }

  private async handleTick(tick: PriceTick) {
    try {
      const receivedAt = Date.now()
      const confidence =
        tick.mode === FeedMode.DRIFTED
          ? DataConfidence.ESTIMATED
          : DataConfidence.FRESH
      const record = {
        assetId: tick.assetId,
        value: tick.price,
        timestamp: tick.timestamp.getTime(),
        publishedAt: tick.timestamp.getTime(),
        receivedAt,
        confidence,
        source: PriceSource.LIVE,
        feedMode: tick.mode,
        ageMs: 0,
        schemaVersion: APP_CONSTANTS.schemaVersion,
      }

      await this.redis.set(
        CACHE_KEY(tick.assetId),
        JSON.stringify(record),
        CACHE_TTL,
      )

      await this.priceModel.create(record)
      await this.circuitBreaker.recordSuccess(tick.assetId)
      await this.resolveHealthAlerts(tick.assetId)
      if (tick.mode === FeedMode.DRIFTED) {
        this.nats.publish('alert.trigger', {
          type: AlertType.PRICE_DRIFT,
          severity: AlertSeverity.HIGH,
          assetId: tick.assetId,
          message: `${tick.assetId} price diverged from reference policy`,
        })
      } else {
        await this.alertService.resolveByTypeAndResource(
          AlertType.PRICE_DRIFT,
          tick.assetId,
        )
      }

      this.logConfidenceChange(tick.assetId, confidence, {
        feedMode: tick.mode,
        source: PriceSource.LIVE,
        ageMs: 0,
      })
      this.nats.publish(WsEventType.PRICE_UPDATED, record)
    } catch (err) {
      this.logger.error(`Failed to handle tick for ${tick.assetId}`, err)
      await this.circuitBreaker.recordFailure(tick.assetId)
    }
  }

  private async getFallbackPrice(
    assetId: string,
  ): Promise<SharedPriceRecord | null> {
    const cached = await this.redis.get(CACHE_KEY(assetId))
    if (cached) {
      const parsed: SharedPriceRecord = JSON.parse(cached)
      const ageMs = Date.now() - parsed.timestamp
      return {
        ...parsed,
        confidence: DataConfidence.STALE,
        source: PriceSource.CACHE,
        feedMode: parsed.feedMode ?? FeedMode.OFFLINE,
        ageMs,
      }
    }

    const latest = await this.priceModel
      .findOne({ assetId })
      .sort({ timestamp: -1 })

    if (latest) {
      const ageMs = Date.now() - latest.timestamp
      return {
        ...latest.toObject(),
        confidence: DataConfidence.ESTIMATED,
        source: PriceSource.FALLBACK,
        feedMode: latest.feedMode ?? FeedMode.OFFLINE,
        ageMs,
      }
    }

    return null
  }

  private raiseHealthAlert(assetId: string, feedMode: FeedMode, ageMs: number) {
    const payload =
      feedMode === FeedMode.OFFLINE
        ? {
            type: AlertType.FEED_OFFLINE,
            severity: AlertSeverity.HIGH,
            message: `${assetId} feed is offline; last price is ${ageMs}ms old`,
          }
        : {
            type: AlertType.DATA_STALE,
            severity: AlertSeverity.MEDIUM,
            message: `${assetId} price is stale at ${ageMs}ms old`,
          }

    this.nats.publish('alert.trigger', {
      ...payload,
      assetId,
    })
  }

  private async resolveHealthAlerts(assetId: string) {
    await Promise.all([
      this.alertService.resolveByTypeAndResource(AlertType.DATA_STALE, assetId),
      this.alertService.resolveByTypeAndResource(
        AlertType.FEED_OFFLINE,
        assetId,
      ),
    ])
  }

  private logConfidenceChange(
    assetId: string,
    confidence: DataConfidence,
    context: Record<string, unknown>,
  ) {
    const previousConfidence = this.confidenceByAsset.get(assetId)
    if (previousConfidence === confidence) return

    this.confidenceByAsset.set(assetId, confidence)
    this.logger.log(
      JSON.stringify({
        event: 'price.confidence_changed',
        assetId,
        previousConfidence,
        confidence,
        ...context,
      }),
    )
  }
}
