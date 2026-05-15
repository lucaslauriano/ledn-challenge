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
import { WsEvent, FeedMode } from '@ledn/shared'
import { PriceService } from '../price/price.service'
import { LiquidityService } from '../liquidity/liquidity.service'
import { AlertService } from '../alert/alert.service'
import { FeedService } from '../feed/feed.service'
import { NatsService } from '../../common/nats/nats.service'

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
    private readonly nats: NatsService,
  ) {}

  onModuleInit() {
    this.nats.subscribe(WsEvent.PRICE_UPDATED, (data: unknown) => {
      this.server.emit(WsEvent.PRICE_UPDATED, data)
    })

    this.nats.subscribe(WsEvent.LIQUIDITY_UPDATED, (data: unknown) => {
      this.server.emit(WsEvent.LIQUIDITY_UPDATED, data)
    })

    this.nats.subscribe(WsEvent.ALERT_CREATED, (data: unknown) => {
      this.server.emit(WsEvent.ALERT_CREATED, data)
    })

    this.nats.subscribe(WsEvent.CIRCUIT_STATE_CHANGED, (data: unknown) => {
      this.server.emit(WsEvent.CIRCUIT_STATE_CHANGED, data)
    })

    this.nats.subscribe(WsEvent.FEED_STATUS_CHANGED, (data: unknown) => {
      this.server.emit(WsEvent.FEED_STATUS_CHANGED, data)
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
    this.nats.publish(WsEvent.FEED_STATUS_CHANGED, {
      assetId: data.assetId,
      mode: data.mode,
      timestamp: new Date().toISOString(),
    })
  }

  private async sendInitialState(client: Socket) {
    const [prices, liquidity, alerts] = await Promise.all([
      this.priceService.getLatestPrices(),
      Promise.resolve(this.liquidityService.getSnapshot()),
      this.alertService.findActive(),
    ])

    client.emit('initial_state', { prices, liquidity, alerts })
  }
}
