import { Module } from '@nestjs/common'
import { LiquidityService } from './liquidity.service'
import { LiquidityController } from './liquidity.controller'
import { AlertModule } from '../alert/alert.module'

@Module({
  imports: [AlertModule],
  providers: [LiquidityService],
  controllers: [LiquidityController],
  exports: [LiquidityService],
})
export class LiquidityModule {}
