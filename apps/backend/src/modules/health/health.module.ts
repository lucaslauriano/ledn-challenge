import { Module } from '@nestjs/common'
import { AlertModule } from '../alert/alert.module'
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module'
import { FeedModule } from '../feed/feed.module'
import { LiquidityModule } from '../liquidity/liquidity.module'
import { HealthController } from './health.controller'

@Module({
  imports: [AlertModule, FeedModule, CircuitBreakerModule, LiquidityModule],
  controllers: [HealthController],
})
export class HealthModule {}
