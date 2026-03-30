import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommandLog } from "./entity/command-log.schema";
import { LogicalFeedKey } from "./mqtt.topics";

@Injectable()
export class CommandLogService {
  constructor(
    @InjectModel(CommandLog.name)
    private readonly commandLogModel: Model<CommandLog>,
  ) {}

  async createSent(params: {
    commandId: string;
    target: LogicalFeedKey;
    payload: string;
    issuedAt: Date;
    idempotencyKey?: string;
  }) {
    return this.commandLogModel.create({
      commandId: params.commandId,
      target: params.target,
      payload: params.payload,
      status: "sent",
      issuedAt: params.issuedAt,
      idempotencyKey: params.idempotencyKey,
    });
  }

  async markFailed(commandId: string, error: string) {
    await this.commandLogModel
      .updateOne(
        { commandId },
        {
          $set: {
            status: "failed",
            error,
          },
        },
      )
      .exec();
  }

  async markAcked(commandId: string, ackPayload: string, ackedAt: Date) {
    const res = await this.commandLogModel
      .findOneAndUpdate(
        { commandId },
        {
          $set: {
            status: "acked",
            ackPayload,
            ackedAt,
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    return res;
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return this.commandLogModel
      .findOne({ idempotencyKey })
      .sort({ issuedAt: -1 })
      .lean()
      .exec();
  }

  async listLatest(limit = 100) {
    return this.commandLogModel
      .find({})
      .sort({ issuedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
