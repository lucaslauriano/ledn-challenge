import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CircuitState } from '@ledn/shared'
import { RedisService } from '../../common/redis/redis.service'

const KEYS = {
  state: (assetId: string) => `circuit:${assetId}:state`,
  failures: (assetId: string) => `circuit:${assetId}:failures`,
  lastFailure: (assetId: string) => `circuit:${assetId}:last_failure`,
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name)
  private readonly failureThreshold: number
  private readonly successThreshold: number
  private readonly timeoutMs: number

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.failureThreshold = this.config.get<number>('CB_FAILURE_THRESHOLD', 3)
    this.successThreshold = this.config.get<number>('CB_SUCCESS_THRESHOLD', 2)
    this.timeoutMs = this.config.get<number>('CB_TIMEOUT_MS', 10000)
  }

  async getState(assetId: string): Promise<CircuitState> {
    const state = await this.redis.get(KEYS.state(assetId))

    if (state === CircuitState.OPEN) {
      const lastFailure = await this.redis.get(KEYS.lastFailure(assetId))
      if (lastFailure) {
        const elapsed = Date.now() - parseInt(lastFailure)
        if (elapsed >= this.timeoutMs) {
          await this.setState(assetId, CircuitState.HALF_OPEN)
          return CircuitState.HALF_OPEN
        }
      }
    }

    return (state as CircuitState) ?? CircuitState.CLOSED
  }

  async recordSuccess(assetId: string): Promise<CircuitState> {
    const state = await this.getState(assetId)

    if (state === CircuitState.HALF_OPEN) {
      const successes = await this.redis.incr(`circuit:${assetId}:successes`)
      if (successes >= this.successThreshold) {
        await this.reset(assetId)
        this.logger.log(`Circuit CLOSED for ${assetId}`)
        return CircuitState.CLOSED
      }
    }

    return state
  }

  async recordFailure(assetId: string): Promise<CircuitState> {
    const failures = await this.redis.incr(KEYS.failures(assetId))
    await this.redis.set(KEYS.lastFailure(assetId), Date.now().toString())

    if (failures >= this.failureThreshold) {
      await this.setState(assetId, CircuitState.OPEN)
      this.logger.warn(`Circuit OPEN for ${assetId} after ${failures} failures`)
      return CircuitState.OPEN
    }

    return CircuitState.CLOSED
  }

  async isOpen(assetId: string): Promise<boolean> {
    const state = await this.getState(assetId)
    return state === CircuitState.OPEN
  }

  async reset(assetId: string): Promise<void> {
    await this.setState(assetId, CircuitState.CLOSED)
    await this.redis.del(KEYS.failures(assetId))
    await this.redis.del(KEYS.lastFailure(assetId))
    await this.redis.del(`circuit:${assetId}:successes`)
  }

  private async setState(assetId: string, state: CircuitState): Promise<void> {
    await this.redis.set(KEYS.state(assetId), state)
  }
}
