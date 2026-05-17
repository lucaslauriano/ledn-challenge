import { Body, Controller, Get, Param, Patch } from '@nestjs/common'
import { FeedMode, FeedScenario } from '@ledn/shared'
import { FeedService } from './feed.service'

@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get('status')
  getStatus() {
    return this.feed.getModes()
  }

  @Patch(':assetId/mode')
  setMode(@Param('assetId') assetId: string, @Body() body: { mode: FeedMode }) {
    this.feed.setMode(assetId, body.mode)
    return { assetId, mode: body.mode }
  }

  @Patch('scenarios/:scenario/start')
  runScenario(@Param('scenario') scenario: FeedScenario) {
    this.feed.runScenario(scenario)
    return { scenario, status: 'started' }
  }
}
