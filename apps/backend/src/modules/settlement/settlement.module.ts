import { Module } from '@nestjs/common'
import { AlertModule } from '../alert/alert.module'
import { LiquidityModule } from '../liquidity/liquidity.module'
import { SettlementController } from './settlement.controller'
import { SettlementService } from './settlement.service'

@Module({
  imports: [AlertModule, LiquidityModule],
  providers: [SettlementService],
  controllers: [SettlementController],
  exports: [SettlementService],
})
export class SettlementModule {}
