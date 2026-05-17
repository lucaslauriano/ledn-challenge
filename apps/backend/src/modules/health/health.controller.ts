import { Controller, Get } from '@nestjs/common'
import { CircuitState } from '@ledn/shared'
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
        pendingSettlementAmount: liquidity.pendingSettlementAmount ?? 0,
        delayedSettlementAmount: liquidity.delayedSettlementAmount ?? 0,
        oldestPendingSettlementAgeMs:
          liquidity.oldestPendingSettlementAgeMs ?? 0,
        settlementExposure: liquidity.settlementExposure ?? 0,
        confidence: liquidity.confidence,
      },
    }
  }

  private async getCircuitStates(): Promise<Record<string, CircuitState>> {
    const entries = await Promise.all(
      APP_CONSTANTS.assets.map(
        async (assetId) =>
          [assetId, await this.circuitBreaker.getState(assetId)] satisfies [
            string,
            CircuitState,
          ],
      ),
    )

    return Object.fromEntries(entries)
  }
}
