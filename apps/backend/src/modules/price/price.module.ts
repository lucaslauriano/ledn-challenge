import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PriceService } from './price.service'
import { PriceRecord, PriceSchema } from './price.schema'
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module'
import { FeedModule } from '../feed/feed.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PriceRecord.name, schema: PriceSchema },
    ]),
    CircuitBreakerModule,
    FeedModule,
  ],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
