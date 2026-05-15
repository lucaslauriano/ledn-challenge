import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DataConfidence } from '@ledn/shared';
import { RedisService } from '../../common/redis/redis.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { FeedService, PriceTick } from '../feed/feed.service';
import { PriceRecord, PriceDocument } from './price.schema';

const CACHE_TTL = 60;
const CACHE_KEY = (assetId: string) => `price:last_known:${assetId}`;

@Injectable()
export class PriceService implements OnModuleInit {
  private readonly logger = new Logger(PriceService.name);
  private readonly staleThresholdMs: number;

  constructor(
    @InjectModel(PriceRecord.name)
    private readonly priceModel: Model<PriceDocument>,
    private readonly redis: RedisService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly feed: FeedService,
    private readonly config: ConfigService,
  ) {
    this.staleThresholdMs = this.config.get<number>('STALE_THRESHOLD_MS', 5000);
  }

  onModuleInit() {
    this.feed.onTick((tick) => {
      void this.handleTick(tick);
    });
  }

  async getCurrentPrice(assetId: string): Promise<PriceRecord | null> {
    const isOpen = await this.circuitBreaker.isOpen(assetId);

    if (isOpen) {
      return this.getFallbackPrice(assetId);
    }

    const cached = await this.redis.get(CACHE_KEY(assetId));
    if (cached) {
      const parsed: PriceRecord = JSON.parse(cached);
      const ageMs = Date.now() - new Date(parsed.timestamp).getTime();
      const confidence =
        ageMs > this.staleThresholdMs
          ? DataConfidence.STALE
          : DataConfidence.FRESH;

      return { ...parsed, ageMs, confidence };
    }

    return this.getFallbackPrice(assetId);
  }

  async getLatestPrices(): Promise<Record<string, any>> {
    const assets = ['BTC', 'ETH'];
    const result: Record<string, any> = {};

    for (const assetId of assets) {
      result[assetId] = await this.getCurrentPrice(assetId);
    }

    return result;
  }

  private async handleTick(tick: PriceTick) {
    try {
      const circuitState = await this.circuitBreaker.getState(tick.assetId);
      const record = {
        assetId: tick.assetId,
        price: tick.price,
        timestamp: tick.timestamp,
        confidence: DataConfidence.FRESH,
        circuitState,
        source: 'LIVE',
        ageMs: 0,
      };

      await this.redis.set(
        CACHE_KEY(tick.assetId),
        JSON.stringify(record),
        CACHE_TTL,
      );

      await this.priceModel.create(record);
      await this.circuitBreaker.recordSuccess(tick.assetId);
    } catch (err) {
      this.logger.error(`Failed to handle tick for ${tick.assetId}`, err);
      await this.circuitBreaker.recordFailure(tick.assetId);
    }
  }

  private async getFallbackPrice(assetId: string): Promise<PriceRecord | null> {
    const cached = await this.redis.get(CACHE_KEY(assetId));
    if (cached) {
      const parsed: PriceRecord = JSON.parse(cached);
      const ageMs = Date.now() - new Date(parsed.timestamp).getTime();
      return {
        ...parsed,
        confidence: DataConfidence.STALE,
        source: 'CACHE',
        ageMs,
      };
    }

    const latest = await this.priceModel
      .findOne({ assetId })
      .sort({ timestamp: -1 });

    if (latest) {
      const ageMs = Date.now() - new Date(latest.timestamp).getTime();
      return {
        ...latest.toObject(),
        confidence: DataConfidence.ESTIMATED,
        source: 'FALLBACK',
        ageMs,
      };
    }

    return null;
  }
}
