import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "../../users/entity/user.schema";

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, index: true })
  sessionId!: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  // Hash of the refresh token string we issued (SHA-256).
  @Prop({ required: true, index: true })
  refreshTokenHash!: string;

  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @Prop()
  revokedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
SessionSchema.index({ userId: 1, expiresAt: -1 });
