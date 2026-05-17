import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { SettlementScenario, type SettlementSnapshot } from '@ledn/shared'
import { SettlementService } from './settlement.service'

@Controller('settlements')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  getSettlements(): SettlementSnapshot {
    return this.settlementService.getSnapshot()
  }

  @Post('start')
  startSettlement(
    @Body()
    body: {
      amount: number
      scenario?: SettlementScenario
    },
  ): Promise<SettlementSnapshot> {
    return this.settlementService.startSettlement(body.amount, body.scenario)
  }

  @Patch(':id/settle')
  settleSettlement(@Param('id') id: string): Promise<SettlementSnapshot> {
    return this.settlementService.settleSettlement(id)
  }

  @Patch(':id/fail')
  failSettlement(@Param('id') id: string): Promise<SettlementSnapshot> {
    return this.settlementService.failSettlement(id)
  }

  @Patch(':id/delay')
  delaySettlement(@Param('id') id: string): Promise<SettlementSnapshot> {
    return this.settlementService.markDelayed(id)
  }
}
