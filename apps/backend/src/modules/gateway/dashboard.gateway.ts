import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WsEvent, FeedMode } from '@ledn/shared';
import { PriceService } from '../price/price.service';
import { LiquidityService } from '../liquidity/liquidity.service';
import { AlertService } from '../alert/alert.service';
import { FeedService } from '../feed/feed.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DashboardGateway.name);

  constructor(
    private readonly priceService: PriceService,
    private readonly liquidityService: LiquidityService,
    private readonly alertService: AlertService,
    private readonly feedService: FeedService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    void this.sendInitialState(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('set_feed_mode')
  handleSetFeedMode(@MessageBody() data: { assetId: string; mode: FeedMode }) {
    this.feedService.setMode(data.assetId, data.mode);
    this.server.emit(WsEvent.FEED_STATUS_CHANGED, {
      assetId: data.assetId,
      mode: data.mode,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastPriceUpdate(payload: unknown) {
    this.server.emit(WsEvent.PRICE_UPDATED, payload);
  }

  broadcastLiquidityUpdate(payload: unknown) {
    this.server.emit(WsEvent.LIQUIDITY_UPDATED, payload);
  }

  broadcastAlert(payload: unknown) {
    this.server.emit(WsEvent.ALERT_CREATED, payload);
  }

  broadcastCircuitStateChanged(payload: unknown) {
    this.server.emit(WsEvent.CIRCUIT_STATE_CHANGED, payload);
  }

  private async sendInitialState(client: Socket) {
    const [prices, liquidity, alerts] = await Promise.all([
      this.priceService.getLatestPrices(),
      Promise.resolve(this.liquidityService.getSnapshot()),
      this.alertService.findActive(),
    ]);

    client.emit('initial_state', { prices, liquidity, alerts });
  }
}
