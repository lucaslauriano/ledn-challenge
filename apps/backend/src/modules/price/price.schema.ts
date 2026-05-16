import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { DataConfidence, FeedMode, PriceSource } from '@ledn/shared'

export type PriceDocument = PriceRecord & Document

@Schema({ timestamps: true })
export class PriceRecord {
  @Prop({ required: true })
  assetId: string

  @Prop({ required: true })
  value: number

  @Prop({ required: true })
  timestamp: number

  @Prop({ required: true })
  publishedAt: number

  @Prop({ required: true })
  receivedAt: number

  @Prop({ type: String, enum: DataConfidence, default: DataConfidence.FRESH })
  confidence: DataConfidence

  @Prop({ type: String, enum: PriceSource, default: PriceSource.LIVE })
  source: PriceSource

  @Prop({ type: String, enum: FeedMode, default: FeedMode.HEALTHY })
  feedMode: FeedMode

  @Prop({ default: 0 })
  ageMs: number

  @Prop({ default: 1 })
  schemaVersion: number
}

export const PriceSchema = SchemaFactory.createForClass(PriceRecord)
