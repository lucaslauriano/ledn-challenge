import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { connect, NatsConnection, JSONCodec, Subscription } from 'nats'

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name)
  private connection: NatsConnection
  private readonly codec = JSONCodec()

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('NATS_URL', 'nats://localhost:4222')
    this.connection = await connect({ servers: url })
    this.logger.log(`Connected to NATS at ${url}`)
  }

  async onModuleDestroy() {
    await this.connection?.drain()
  }

  publish<T>(subject: string, data: T): void {
    this.connection.publish(subject, this.codec.encode(data))
  }

  subscribe<T>(subject: string, handler: (data: T) => void): Subscription {
    const sub = this.connection.subscribe(subject)
    void (async () => {
      for await (const msg of sub) {
        handler(this.codec.decode(msg.data) as T)
      }
    })()
    return sub
  }
}
