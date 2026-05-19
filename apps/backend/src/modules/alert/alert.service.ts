import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AlertEvent, AlertSeverity, AlertType, WsEventType } from '@ledn/shared'
import { AlertRecord, AlertDocument } from './alert.schema'
import { NatsService } from '../../common/nats/nats.service'
import { RedisService } from '../../common/redis/redis.service'
import { APP_CONSTANTS } from '../../config/constants'

@Injectable()
export class AlertService implements OnModuleInit {
  private readonly logger = new Logger(AlertService.name)

  constructor(
    @InjectModel(AlertRecord.name)
    private readonly alertModel: Model<AlertDocument>,
    private readonly nats: NatsService,
    private readonly redis: RedisService,
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
  ): Promise<AlertEvent> {
    const resourceId = assetId ?? 'system'
    const dedupKey = this.getDedupKey(type, resourceId)
    const existingId = await this.redis.get(dedupKey)
    if (existingId) {
      const existing = await this.alertModel.findById(existingId)
      if (existing && !existing.resolved) {
        return this.toAlertEvent(existing)
      }
    }

    this.logger.warn(
      JSON.stringify({
        event: 'alert.created',
        type,
        severity,
        resourceId,
        message,
      }),
    )
    const alert = await this.alertModel.create({
      type,
      severity,
      message,
      assetId,
    })
    const wasStored = await this.redis.setIfNotExists(
      dedupKey,
      alert._id.toString(),
    )
    if (!wasStored) {
      const winnerId = await this.redis.get(dedupKey)
      const winner = winnerId ? await this.alertModel.findById(winnerId) : null

      await this.alertModel.findByIdAndDelete(alert._id)

      if (winner) {
        return this.toAlertEvent(winner)
      }

      await this.redis.set(dedupKey, alert._id.toString())
    }
    const event = this.toAlertEvent(alert)
    this.nats.publish(WsEventType.ALERT_CREATED, event)
    return event
  }

  async resolve(id: string): Promise<void> {
    const resolved = await this.alertModel.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedAt: new Date(),
      },
      { new: true },
    )

    if (resolved) {
      await this.redis.del(
        this.getDedupKey(resolved.type, resolved.assetId ?? 'system'),
      )
      const event = this.toAlertEvent(resolved)
      this.logger.log(
        JSON.stringify({
          event: 'alert.resolved',
          id: event.id,
          type: event.type,
          resourceId: event.resourceId,
        }),
      )
      this.nats.publish(WsEventType.ALERT_RESOLVED, event)
    }
  }

  async resolveByTypeAndResource(
    type: AlertType,
    resourceId: string,
  ): Promise<void> {
    const alertId = await this.redis.get(this.getDedupKey(type, resourceId))
    if (!alertId) {
      return
    }

    await this.resolve(alertId)
  }

  async resolveAllByTypeAndResource(
    type: AlertType,
    resourceId: string,
  ): Promise<void> {
    const alerts = await this.alertModel.find({
      type,
      assetId: resourceId,
      resolved: false,
    })

    await Promise.all(alerts.map((alert) => this.resolve(alert._id.toString())))
  }

  async findActive(): Promise<AlertEvent[]> {
    const alerts = await this.alertModel
      .find({ resolved: false })
      .sort({ createdAt: -1 })
      .limit(50)

    return alerts.map((alert) => this.toAlertEvent(alert))
  }

  async findActiveByTypes(types: AlertType[]): Promise<AlertEvent[]> {
    const alerts = await this.alertModel
      .find({ resolved: false, type: { $in: types } })
      .sort({ createdAt: -1 })
      .limit(100)

    return alerts.map((alert) => this.toAlertEvent(alert))
  }

  async findAll(): Promise<AlertEvent[]> {
    const alerts = await this.alertModel
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
    return alerts.map((alert) => this.toAlertEvent(alert))
  }

  private toAlertEvent(alert: AlertDocument): AlertEvent {
    return {
      id: alert._id.toString(),
      resourceId: alert.assetId ?? 'system',
      type: alert.type,
      severity: alert.severity,
      payload: {
        message: alert.message,
        assetId: alert.assetId,
      },
      isActive: !alert.resolved,
      createdAt: alert.timestamp.getTime(),
      resolvedAt: alert.resolvedAt?.getTime(),
    }
  }

  private getDedupKey(type: AlertType, resourceId: string) {
    return `${APP_CONSTANTS.alerting.dedupKeyPrefix}:${type}:${resourceId}`
  }
}
