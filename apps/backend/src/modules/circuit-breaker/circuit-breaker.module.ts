import { Module } from '@nestjs/common'
import { CircuitBreakerService } from './circuit-breaker.service'
import { AlertModule } from '../alert/alert.module'

@Module({
  imports: [AlertModule],
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
