import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  get(key: string) {
    return this.client.get(key);
  }

  set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  setIfNotExists(key: string, value: string) {
    return this.client.set(key, value, 'NX');
  }

  del(key: string) {
    return this.client.del(key);
  }

  incr(key: string) {
    return this.client.incr(key);
  }

  expire(key: string, ttlSeconds: number) {
    return this.client.expire(key, ttlSeconds);
  }
}
