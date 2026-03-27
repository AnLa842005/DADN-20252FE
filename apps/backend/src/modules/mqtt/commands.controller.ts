import { randomUUID } from 'crypto';
import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { CommandLogService } from './command-log.service';
import { SetPumpDto, SetRgbDto, SetToggleDto } from '../telemetry/dto/command.dto';
import { MqttService } from './mqtt.service';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly mqttService: MqttService,
    private readonly commandLogService: CommandLogService,
  ) {}

  @Post('pump')
  async setPump(@Body() dto: SetPumpDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.sendCommand('pump', dto.value, idempotencyKey);
  }

  @Post('rgb')
  async setRgb(@Body() dto: SetRgbDto, @Headers('idempotency-key') idempotencyKey?: string) {
    const format = dto.format ?? 'csv';
    const payload =
      format === 'json' ? JSON.stringify({ r: dto.r, g: dto.g, b: dto.b }) : `${dto.r},${dto.g},${dto.b}`;
    return this.sendCommand('rgb', payload, idempotencyKey);
  }

  @Post('fan')
  async setFan(@Body() dto: SetToggleDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.sendCommand('fan', dto.value, idempotencyKey);
  }

  @Post('speaker')
  async setSpeaker(@Body() dto: SetToggleDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.sendCommand('speaker', dto.value, idempotencyKey);
  }

  @Get('logs')
  async logs() {
    return this.commandLogService.listLatest();
  }

  private async sendCommand(
    target: 'fan' | 'pump' | 'speaker' | 'rgb',
    payload: string,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const existed = await this.commandLogService.findByIdempotencyKey(idempotencyKey);
      if (existed) {
        return { ok: true, deduplicated: true, command: existed };
      }
    }

    const commandId = randomUUID();
    const issuedAt = new Date();

    await this.commandLogService.createSent({
      commandId,
      target,
      payload,
      issuedAt,
      idempotencyKey,
    });

    try {
      // Publish retries are useful for brief broker/network hiccups.
      await this.mqttService.publishWithRetry(target, payload, 3);
      return { ok: true, commandId, status: 'sent' };
    } catch (err) {
      await this.commandLogService.markFailed(
        commandId,
        err instanceof Error ? err.message : 'Unknown MQTT publish error',
      );
      throw err;
    }
  }
}

