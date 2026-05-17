import { Body, Controller, Get, Post } from '@nestjs/common'
import { LiquidityService } from './liquidity.service'

@Controller('liquidity')
export class LiquidityController {
  constructor(private readonly liquidityService: LiquidityService) {}

  @Get('snapshot')
  getSnapshot() {
    return this.liquidityService.getSnapshot()
  }

  @Get('audit')
  getAuditTrail() {
    return this.liquidityService.getAuditTrail()
  }

  @Post('lock')
  lockFunds(@Body() body: { amount: number }) {
    return this.liquidityService.lockFunds(body.amount)
  }

  @Post('release')
  releaseFunds(@Body() body: { amount: number }) {
    return this.liquidityService.releaseFunds(body.amount)
  }
}
