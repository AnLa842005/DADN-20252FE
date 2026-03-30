import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { LogicalFeedKey } from "../../mqtt/mqtt.topics";

export type CommandLogDocument = HydratedDocument<CommandLog>;

@Schema({ timestamps: true })
export class CommandLog {
  @Prop({ required: true, unique: true, index: true })
  commandId!: string;

  @Prop({ required: true, index: true })
  target!: LogicalFeedKey;

  @Prop({ required: true })
  payload!: string;

  @Prop({
    required: true,
    type: String,
    enum: ["sent", "acked", "failed"],
    default: "sent",
    index: true,
  })
  status!: "sent" | "acked" | "failed";

  @Prop()
  error?: string;

  @Prop()
  ackPayload?: string;

  @Prop({ index: true })
  idempotencyKey?: string;

  @Prop({ required: true, index: true })
  issuedAt!: Date;

  @Prop()
  ackedAt?: Date;
}

export const CommandLogSchema = SchemaFactory.createForClass(CommandLog);
CommandLogSchema.index({ target: 1, issuedAt: -1 });
