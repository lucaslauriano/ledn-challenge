import { Controller, Get } from '@nestjs/common'
import { APP_CONSTANTS } from '../../config/constants'
import { AlertService } from '../alert/alert.service'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { FeedService } from '../feed/feed.service'
import { LiquidityService } from '../liquidity/liquidity.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly alertService: AlertService,
    private readonly feedService: FeedService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly liquidityService: LiquidityService,
  ) {}

  @Get('metrics')
  async getMetrics() {
    const [activeAlerts, circuitStates] = await Promise.all([
      this.alertService.findActive(),
      this.getCircuitStates(),
    ])
    const liquidity = this.liquidityService.getSnapshot()

    return {
      timestamp: Date.now(),
      activeAlertsCount: activeAlerts.length,
      activeAlertsByType: activeAlerts.reduce<Record<string, number>>(
        (acc, alert) => {
          acc[alert.type] = (acc[alert.type] ?? 0) + 1
          return acc
        },
        {},
      ),
      feedModes: this.feedService.getModes(),
      circuitStates,
      liquidity: {
        conservativeMode: liquidity.conservativeMode,
        available: liquidity.available,
        availableAdjusted: liquidity.availableAdjusted,
        degradedAssets: liquidity.degradedAssets ?? [],
        confidence: liquidity.confidence,
      },
    }
  }

  private async getCircuitStates() {
    const entries = await Promise.all(
      APP_CONSTANTS.assets.map(async (assetId) => [
        assetId,
        await this.circuitBreaker.getState(assetId),
      ]),
    )

    return Object.fromEntries(entries)
  }
}
