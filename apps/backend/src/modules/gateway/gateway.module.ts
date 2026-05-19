import { Module } from '@nestjs/common'
import { DashboardGateway } from './dashboard.gateway'
import { PriceModule } from '../price/price.module'
import { LiquidityModule } from '../liquidity/liquidity.module'
import { AlertModule } from '../alert/alert.module'
import { FeedModule } from '../feed/feed.module'
import { SettlementModule } from '../settlement/settlement.module'
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module'

@Module({
  imports: [
    PriceModule,
    LiquidityModule,
    AlertModule,
    FeedModule,
    SettlementModule,
    CircuitBreakerModule,
  ],
  providers: [DashboardGateway],
  exports: [DashboardGateway],
})
export class GatewayModule {}
