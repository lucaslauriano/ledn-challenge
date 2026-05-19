import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, OnModuleInit } from '@nestjs/common'
import {
  CircuitState,
  FeedMode,
  FeedScenario,
  WS_EVENT_CHANNEL,
  WsEvent,
  WsEventType,
} from '@ledn/shared'
import { APP_CONSTANTS } from '../../config/constants'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { PriceService } from '../price/price.service'
import { LiquidityService } from '../liquidity/liquidity.service'
import { AlertService } from '../alert/alert.service'
import { FeedService } from '../feed/feed.service'
import { NatsService } from '../../common/nats/nats.service'
import { SettlementService } from '../settlement/settlement.service'

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(DashboardGateway.name)

  constructor(
    private readonly priceService: PriceService,
    private readonly liquidityService: LiquidityService,
    private readonly alertService: AlertService,
    private readonly feedService: FeedService,
    private readonly settlementService: SettlementService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly nats: NatsService,
  ) {}

  onModuleInit() {
    this.nats.subscribe(WsEventType.PRICE_UPDATED, (data: unknown) => {
      this.emitEvent({
        type: WsEventType.PRICE_UPDATED,
        payload: data,
      })
    })

    this.nats.subscribe(WsEventType.LIQUIDITY_SNAPSHOT, (data: unknown) => {
      this.emitEvent({
        type: WsEventType.LIQUIDITY_SNAPSHOT,
        payload: data,
      })
    })

    this.nats.subscribe(WsEventType.ALERT_CREATED, (data: unknown) => {
      this.emitEvent({
        type: WsEventType.ALERT_CREATED,
        payload: data,
      })
    })

    this.nats.subscribe(WsEventType.ALERT_RESOLVED, (data: unknown) => {
      this.emitEvent({
        type: WsEventType.ALERT_RESOLVED,
        payload: data,
      })
    })

    this.nats.subscribe(WsEventType.CIRCUIT_STATE_CHANGED, (data: unknown) => {
      this.emitEvent({
        type: WsEventType.CIRCUIT_STATE_CHANGED,
        payload: data,
      })
    })

    this.nats.subscribe(WsEventType.FEED_STATUS_CHANGED, (data: unknown) => {
      this.emitEvent({
        type: WsEventType.FEED_STATUS_CHANGED,
        payload: data,
      })
    })

    this.nats.subscribe(WsEventType.SETTLEMENTS_UPDATED, (data: unknown) => {
      this.emitEvent({
        type: WsEventType.SETTLEMENTS_UPDATED,
        payload: data,
      })
    })

    this.logger.log('Subscribed to all NATS subjects')
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
    void this.sendInitialState(client)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('set_feed_mode')
  handleSetFeedMode(@MessageBody() data: { assetId: string; mode: FeedMode }) {
    this.feedService.setMode(data.assetId, data.mode)
  }

  @SubscribeMessage('run_feed_scenario')
  handleRunFeedScenario(@MessageBody() data: { scenario: FeedScenario }) {
    this.feedService.runScenario(data.scenario)
  }

  private async sendInitialState(client: Socket) {
    const [prices, liquidity, alerts, settlements, circuitStates, feedModes] =
      await Promise.all([
        this.priceService.getLatestPrices(),
        Promise.resolve(this.liquidityService.getSnapshot()),
        this.alertService.findActive(),
        Promise.resolve(this.settlementService.getSnapshot()),
        this.getCircuitStates(),
        Promise.resolve(this.getFeedModes()),
      ])

    client.emit(WS_EVENT_CHANNEL, {
      type: WsEventType.INITIAL_STATE,
      payload: {
        prices,
        liquidity,
        alerts,
        settlements,
        circuitStates,
        feedModes,
      },
    } satisfies WsEvent)
  }

  private async getCircuitStates(): Promise<Record<string, CircuitState>> {
    const entries = await Promise.all(
      APP_CONSTANTS.assets.map(async (assetId) => [
        assetId,
        await this.circuitBreakerService.getState(assetId),
      ]),
    )

    return Object.fromEntries(entries) as Record<string, CircuitState>
  }

  private getFeedModes(): Record<string, FeedMode> {
    return Object.fromEntries(
      APP_CONSTANTS.assets.map((assetId) => [
        assetId,
        this.feedService.getMode(assetId),
      ]),
    )
  }

  private emitEvent(event: WsEvent) {
    this.server.emit(WS_EVENT_CHANNEL, event)
  }
}
