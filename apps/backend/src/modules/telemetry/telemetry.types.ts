import { LogicalFeedKey } from "../mqtt/mqtt.topics";

export type TelemetryType =
  | "temp"
  | "air_humidity"
  | "soil_humidity"
  | "light"
  | "fan"
  | "pump"
  | "speaker"
  | "rgb"
  | "status"
  | "stream";

export const SENSOR_TYPES = [
  "temp",
  "air_humidity",
  "soil_humidity",
  "light",
] as const;

export type SensorType = (typeof SENSOR_TYPES)[number];

export type ThresholdLevel = "low" | "normal" | "high" | "unknown";

export type IngestMqttMessage = {
  logicalKey: LogicalFeedKey;
  feedKey: string;
  topic: string;
  message: string;
  receivedAt: Date;
};
