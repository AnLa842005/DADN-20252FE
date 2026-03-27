import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TelemetryType, ThresholdLevel } from './telemetry.types';

export type TelemetryDocument = HydratedDocument<Telemetry>;

@Schema({ timestamps: true })
export class Telemetry {
  @Prop({
    required: true,
    index: true,
    type: String,
    enum: [
      'temp',
      'air_humidity',
      'soil_humidity',
      'light',
      'fan',
      'pump',
      'speaker',
      'rgb',
      'status',
      'stream',
    ],
  })
  type!: TelemetryType;

  @Prop({ required: true })
  feedKey!: string;

  @Prop({ required: true })
  topic!: string;

  @Prop({ required: true })
  raw!: string;

  @Prop()
  numericValue?: number;

  @Prop({
    type: String,
    enum: ['low', 'normal', 'high', 'unknown'],
    default: 'unknown',
  })
  thresholdLevel?: ThresholdLevel;

  @Prop({ required: true, index: true })
  receivedAt!: Date;
}

export const TelemetrySchema = SchemaFactory.createForClass(Telemetry);
TelemetrySchema.index({ type: 1, receivedAt: -1 });

