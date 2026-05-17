import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AlertService } from './alert.service'
import { AlertRecord, AlertSchema } from './alert.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlertRecord.name, schema: AlertSchema },
    ]),
  ],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
