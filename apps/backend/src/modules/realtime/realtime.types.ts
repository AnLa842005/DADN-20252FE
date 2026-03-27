import { TelemetryType, ThresholdLevel } from '../telemetry/telemetry.types';

export type TelemetryRealtimeEvent = {
  type: TelemetryType;
  feedKey: string;
  topic: string;
  raw: string;
  numericValue?: number;
  thresholdLevel?: ThresholdLevel;
  receivedAt: string;
};

