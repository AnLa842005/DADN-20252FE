import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import mqtt, { MqttClient } from "mqtt";
import { TelemetryService } from "../telemetry/telemetry.service";
import { CommandLogService } from "../command/command-log.service";
import {
  ALL_LOGICAL_KEYS,
  getAdafruitFeedTopic,
  getFeedKey,
  getSubscribeKeys,
  LogicalFeedKey,
} from "./mqtt.topics";

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;
  // Create a reverse mapping for efficient lookups
  private readonly reverseFeedKeyMap = new Map(
    ALL_LOGICAL_KEYS.map((lk) => [getFeedKey(lk), lk]),
  );

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly commandLogService: CommandLogService,
  ) {}

  onModuleInit() {
    const broker = process.env.ADAFRUIT_IO_BROKER ?? "io.adafruit.com";
    const port = Number(process.env.ADAFRUIT_IO_PORT ?? 1883);
    const useTls =
      String(process.env.ADAFRUIT_IO_USE_TLS ?? "false").toLowerCase() ===
      "true";
    const protocol = useTls ? "mqtts" : "mqtt";

    const username = process.env.ADAFRUIT_IO_USERNAME ?? "";
    const password = process.env.ADAFRUIT_IO_KEY ?? "";
    if (!username || !password) {
      this.logger.warn(
        "Missing ADAFRUIT_IO_USERNAME / ADAFRUIT_IO_KEY. MQTT will not connect.",
      );
      return;
    }

    const url = `${protocol}://${broker}:${port}`;
    this.client = mqtt.connect(url, {
      username,
      password,
      reconnectPeriod: 2000,
      keepalive: 30,
      clean: true,
    });

    this.client.on("connect", () => {
      this.logger.log(`MQTT connected: ${url}`);

      const keys = getSubscribeKeys();
      const topics = keys.map(getAdafruitFeedTopic);
      this.client?.subscribe(topics, { qos: 0 }, (err) => {
        if (err)
          this.logger.error(`MQTT subscribe error: ${err.message}`, err.stack);
        else this.logger.log(`MQTT subscribed: ${topics.join(", ")}`);
      });
    });

    this.client.on("reconnect", () => this.logger.warn("MQTT reconnecting..."));
    this.client.on("close", () => this.logger.warn("MQTT closed"));
    this.client.on("error", (err) =>
      this.logger.error(`MQTT error: ${err.message}`, err.stack),
    );

    this.client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload);
    });
  }

  async onModuleDestroy() {
    await new Promise<void>((resolve) => {
      if (!this.client) return resolve();
      this.client.end(true, {}, () => resolve());
    });
  }

  async publish(key: LogicalFeedKey, value: string) {
    if (!this.client) throw new Error("MQTT client not connected");
    const topic = getAdafruitFeedTopic(key);
    await new Promise<void>((resolve, reject) => {
      this.client?.publish(topic, value, { qos: 0, retain: false }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async publishWithRetry(key: LogicalFeedKey, value: string, retries = 3) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.publish(key, value);
        return;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `MQTT publish retry ${attempt}/${retries} failed for ${key}`,
        );
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("MQTT publish failed after retries");
  }

  private async handleMessage(topic: string, payload: Buffer) {
    const message = payload.toString("utf8");

    const username = process.env.ADAFRUIT_IO_USERNAME ?? "";
    const prefix = `${username}/feeds/`;
    if (!topic.startsWith(prefix)) {
      this.logger.debug(`Ignoring topic: ${topic}`);
      return;
    }

    const feedKey = topic.slice(prefix.length);
    const logical = this.resolveLogicalKeyFromFeedKey(feedKey);
    if (!logical) return;

    await this.telemetryService.ingestFromMqtt({
      logicalKey: logical,
      feedKey,
      topic,
      message,
      receivedAt: new Date(),
    });

    if (logical === "status") {
      await this.tryHandleAckMessage(message);
    }
  }

  private resolveLogicalKeyFromFeedKey(feedKey: string): LogicalFeedKey | null {
    return this.reverseFeedKeyMap.get(feedKey) ?? null;
  }

  private async tryHandleAckMessage(message: string) {
    const trimmed = message.trim();
    // Support ACK payload formats:
    // 1) ACK:<commandId>
    // 2) ACK:<commandId>:<anything>
    // 3) {"ackCommandId":"...","status":"ok"}
    if (trimmed.startsWith("ACK:")) {
      const parts = trimmed.split(":");
      const commandId = parts[1]?.trim();
      if (commandId) {
        await this.commandLogService.markAcked(commandId, trimmed, new Date());
      }
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as { ackCommandId?: string };
      if (parsed?.ackCommandId) {
        await this.commandLogService.markAcked(
          parsed.ackCommandId,
          trimmed,
          new Date(),
        );
      }
    } catch {
      // ignore non-JSON status messages
    }
  }
}
