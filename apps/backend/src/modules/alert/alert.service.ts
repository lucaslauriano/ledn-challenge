import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AlertType, AlertSeverity } from '@ledn/shared'
import { AlertRecord, AlertDocument } from './alert.schema'
import { NatsService } from '../../common/nats/nats.service'

@Injectable()
export class AlertService implements OnModuleInit {
  private readonly logger = new Logger(AlertService.name)

  constructor(
    @InjectModel(AlertRecord.name)
    private readonly alertModel: Model<AlertDocument>,
    private readonly nats: NatsService,
  ) {}

  onModuleInit() {
    this.nats.subscribe<{
      type: AlertType
      severity: AlertSeverity
      assetId?: string
      message: string
    }>('alert.trigger', (data) => {
      void this.create(data.type, data.severity, data.message, data.assetId)
    })
  }

  async create(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    assetId?: string,
  ): Promise<AlertRecord> {
    this.logger.warn(`[${severity}] ${type} — ${message}`)
    const alert = await this.alertModel.create({
      type,
      severity,
      message,
      assetId,
    })
    this.nats.publish('alert.created', alert)
    return alert
  }

  async resolve(id: string): Promise<void> {
    await this.alertModel.findByIdAndUpdate(id, {
      resolved: true,
      resolvedAt: new Date(),
    })
  }

  async findActive(): Promise<AlertRecord[]> {
    return this.alertModel
      .find({ resolved: false })
      .sort({ createdAt: -1 })
      .limit(50)
  }

  async findAll(): Promise<AlertRecord[]> {
    return this.alertModel.find().sort({ createdAt: -1 }).limit(100)
  }
}
