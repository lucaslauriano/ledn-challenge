import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { RedisModule } from './common/redis/redis.module'
import { FeedModule } from './modules/feed/feed.module'
import { CircuitBreakerModule } from './modules/circuit-breaker/circuit-breaker.module'
import { PriceModule } from './modules/price/price.module'
import { LiquidityModule } from './modules/liquidity/liquidity.module'
import { AlertModule } from './modules/alert/alert.module'
import { GatewayModule } from './modules/gateway/gateway.module'
import { NatsModule } from 'src/common/nats/nats.module'
import { HealthModule } from './modules/health/health.module'
import { MONGODB_URI_ENV } from './config/constants'
import { SettlementModule } from './modules/settlement/settlement.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(MONGODB_URI_ENV as string),
      }),
      inject: [ConfigService],
    }),
    NatsModule,
    RedisModule,
    FeedModule,
    CircuitBreakerModule,
    PriceModule,
    LiquidityModule,
    AlertModule,
    SettlementModule,
    GatewayModule,
    HealthModule,
  ],
})
export class AppModule {}
