import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DataConfidence, CircuitState } from '@ledn/shared';

export type PriceDocument = PriceRecord & Document;

@Schema({ timestamps: true })
export class PriceRecord {
  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ enum: DataConfidence, default: DataConfidence.FRESH })
  confidence: DataConfidence;

  @Prop({ enum: CircuitState, default: CircuitState.CLOSED })
  circuitState: CircuitState;

  @Prop({ default: 'LIVE' })
  source: string;

  @Prop({ default: 0 })
  ageMs: number;
}

export const PriceSchema = SchemaFactory.createForClass(PriceRecord);
