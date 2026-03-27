import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IngestMqttMessage, TelemetryType } from './telemetry.types';
import { Telemetry } from './telemetry.schema';
import { Alert } from './alert.schema';
import { classifyThreshold, isSensorType } from './thresholds';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectModel(Telemetry.name) private readonly telemetryModel: Model<Telemetry>,
    @InjectModel(Alert.name) private readonly alertModel: Model<Alert>,
    private readonly realtimeService: RealtimeService,
  ) {}

  async ingestFromMqtt(msg: IngestMqttMessage) {
    const numericValue = this.tryParseNumber(msg.message);
    const thresholdLevel = classifyThreshold(msg.logicalKey as TelemetryType, numericValue);

    await this.telemetryModel.create({
      type: msg.logicalKey as TelemetryType,
      feedKey: msg.feedKey,
      topic: msg.topic,
      raw: msg.message,
      numericValue,
      thresholdLevel,
      receivedAt: msg.receivedAt,
    });

    this.realtimeService.publishTelemetry({
      type: msg.logicalKey as TelemetryType,
      feedKey: msg.feedKey,
      topic: msg.topic,
      raw: msg.message,
      numericValue,
      thresholdLevel,
      receivedAt: msg.receivedAt.toISOString(),
    });

    if (
      isSensorType(msg.logicalKey as TelemetryType) &&
      numericValue !== undefined &&
      (thresholdLevel === 'low' || thresholdLevel === 'high')
    ) {
      await this.alertModel.create({
        type: msg.logicalKey,
        level: thresholdLevel,
        value: numericValue,
        feedKey: msg.feedKey,
        topic: msg.topic,
        triggeredAt: msg.receivedAt,
      });
    }
  }

  async getLatest(type?: TelemetryType) {
    const filter = type ? { type } : {};
    return this.telemetryModel.findOne(filter).sort({ receivedAt: -1 }).lean().exec();
  }

  async query(params: { type?: TelemetryType; from?: Date; to?: Date }) {
    const filter: Record<string, unknown> = {};
    if (params.type) filter.type = params.type;
    if (params.from || params.to) {
      filter.receivedAt = {};
      if (params.from) (filter.receivedAt as Record<string, unknown>).$gte = params.from;
      if (params.to) (filter.receivedAt as Record<string, unknown>).$lte = params.to;
    }

    return this.telemetryModel.find(filter).sort({ receivedAt: -1 }).limit(1000).lean().exec();
  }

  async getLatestAlerts(limit = 50) {
    return this.alertModel.find({}).sort({ triggeredAt: -1 }).limit(limit).lean().exec();
  }

  private tryParseNumber(raw: string): number | undefined {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
}

