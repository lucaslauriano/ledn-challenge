import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  AlertSeverity,
  AlertType,
  CircuitState,
  WsEventType,
} from '@ledn/shared'
import { RedisService } from '../../common/redis/redis.service'
import { NatsService } from '../../common/nats/nats.service'
import { AlertService } from '../alert/alert.service'
import {
  APP_CONSTANTS,
  CB_FAILURE_THRESHOLD_ENV,
  CB_SUCCESS_THRESHOLD_ENV,
  CB_TIMEOUT_MS_ENV,
} from '../../config/constants'

const KEYS = {
  state: (assetId: string) => `circuit:${assetId}:state`,
  failures: (assetId: string) => `circuit:${assetId}:failures`,
  lastFailure: (assetId: string) => `circuit:${assetId}:last_failure`,
}

@Injectable()
export class CircuitBreakerService implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name)
  private readonly failureThreshold: number
  private readonly successThreshold: number
  private readonly timeoutMs: number

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly nats: NatsService,
    private readonly alertService: AlertService,
  ) {
    this.failureThreshold = this.config.get<number>(
      CB_FAILURE_THRESHOLD_ENV,
      APP_CONSTANTS.circuitBreaker.failureThreshold,
    )
    this.successThreshold = this.config.get<number>(
      CB_SUCCESS_THRESHOLD_ENV,
      APP_CONSTANTS.circuitBreaker.successThreshold,
    )
    this.timeoutMs = this.config.get<number>(
      CB_TIMEOUT_MS_ENV,
      APP_CONSTANTS.circuitBreaker.timeoutMs,
    )
  }

  onModuleInit() {
    this.nats.subscribe<{ assetId: string }>('circuit.reset', ({ assetId }) => {
      void this.reset(assetId).then(() => {
        this.logger.log(`Circuit manually reset for ${assetId}`)
      })
    })
  }

  async getState(assetId: string): Promise<CircuitState> {
    const state = await this.redis.get(KEYS.state(assetId))

    if (state === CircuitState.OPEN) {
      const lastFailure = await this.redis.get(KEYS.lastFailure(assetId))
      if (lastFailure) {
        const elapsed = Date.now() - parseInt(lastFailure)
        if (elapsed >= this.timeoutMs) {
          await this.setState(assetId, CircuitState.HALF_OPEN)
          this.logger.warn(
            JSON.stringify({
              event: 'circuit.state_changed',
              assetId,
              previousState: CircuitState.OPEN,
              state: CircuitState.HALF_OPEN,
              elapsedMs: elapsed,
            }),
          )
          this.nats.publish(WsEventType.CIRCUIT_STATE_CHANGED, {
            assetId,
            state: CircuitState.HALF_OPEN,
            timestamp: Date.now(),
          })
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
        return CircuitState.CLOSED
      }
    }

    return state
  }

  async recordFailure(assetId: string): Promise<CircuitState> {
    const currentState = await this.getState(assetId)
    const failures = await this.redis.incr(KEYS.failures(assetId))
    await this.redis.set(KEYS.lastFailure(assetId), Date.now().toString())

    if (
      failures >= this.failureThreshold &&
      currentState === CircuitState.CLOSED
    ) {
      await this.setState(assetId, CircuitState.OPEN)
      this.logger.warn(
        JSON.stringify({
          event: 'circuit.state_changed',
          assetId,
          previousState: currentState,
          state: CircuitState.OPEN,
          failures,
        }),
      )

      this.nats.publish(WsEventType.CIRCUIT_STATE_CHANGED, {
        assetId,
        state: CircuitState.OPEN,
        timestamp: Date.now(),
      })

      this.nats.publish('alert.trigger', {
        type: AlertType.CIRCUIT_OPEN,
        severity: AlertSeverity.HIGH,
        assetId,
        message: `Circuit breaker OPEN for ${assetId} — serving cached data`,
      })

      return CircuitState.OPEN
    }

    return currentState === CircuitState.OPEN
      ? CircuitState.OPEN
      : CircuitState.CLOSED
  }

  async isOpen(assetId: string): Promise<boolean> {
    const state = await this.getState(assetId)
    return state === CircuitState.OPEN
  }

  async reset(assetId: string): Promise<void> {
    const previousState = await this.redis.get(KEYS.state(assetId))
    await this.setState(assetId, CircuitState.CLOSED)
    await this.redis.del(KEYS.failures(assetId))
    await this.redis.del(KEYS.lastFailure(assetId))
    await this.redis.del(`circuit:${assetId}:successes`)

    this.logger.log(
      JSON.stringify({
        event: 'circuit.state_changed',
        assetId,
        previousState: previousState ?? CircuitState.CLOSED,
        state: CircuitState.CLOSED,
      }),
    )

    this.nats.publish(WsEventType.CIRCUIT_STATE_CHANGED, {
      assetId,
      state: CircuitState.CLOSED,
      timestamp: Date.now(),
    })
    await this.alertService.resolveAllByTypeAndResource(
      AlertType.CIRCUIT_OPEN,
      assetId,
    )
  }

  private async setState(assetId: string, state: CircuitState): Promise<void> {
    await this.redis.set(KEYS.state(assetId), state)
  }
}
