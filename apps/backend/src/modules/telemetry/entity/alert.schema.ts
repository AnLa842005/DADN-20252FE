import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { SENSOR_TYPES, SensorType, ThresholdLevel } from "../telemetry.types";

export type AlertDocument = HydratedDocument<Alert>;

@Schema({ timestamps: true })
export class Alert {
  @Prop({
    required: true,
    type: String,
    enum: SENSOR_TYPES,
    index: true,
  })
  type!: SensorType;

  @Prop({
    required: true,
    type: String,
    enum: ["low", "high"],
    index: true,
  })
  level!: Exclude<ThresholdLevel, "normal" | "unknown">;

  @Prop({ required: true })
  value!: number;

  @Prop({ required: true })
  feedKey!: string;

  @Prop({ required: true })
  topic!: string;

  @Prop({ required: true, index: true })
  triggeredAt!: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
AlertSchema.index({ type: 1, triggeredAt: -1 });
