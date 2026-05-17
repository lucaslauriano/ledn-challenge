import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { AlertType, AlertSeverity } from '@ledn/shared'

export type AlertDocument = AlertRecord & Document

@Schema({ timestamps: true })
export class AlertRecord {
  @Prop({ type: String, enum: AlertType, required: true })
  type: AlertType

  @Prop({ type: String, enum: AlertSeverity, required: true })
  severity: AlertSeverity

  @Prop()
  assetId?: string

  @Prop({ required: true })
  message: string

  @Prop({ default: () => new Date() })
  timestamp: Date

  @Prop({ default: false })
  resolved: boolean

  @Prop()
  resolvedAt?: Date
}

export const AlertSchema = SchemaFactory.createForClass(AlertRecord)
