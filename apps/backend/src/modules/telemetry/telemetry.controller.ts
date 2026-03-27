import { Controller, Get, Query } from '@nestjs/common';
import { TelemetryQueryDto } from './dto/telemetry-query.dto';
import { TelemetryService } from './telemetry.service';
import { TelemetryType } from './telemetry.types';

@Controller()
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('telemetry/latest')
  async latest(@Query() query: TelemetryQueryDto) {
    const type = (query.type as TelemetryType | undefined) ?? undefined;
    return this.telemetryService.getLatest(type);
  }

  @Get('telemetry')
  async list(@Query() query: TelemetryQueryDto) {
    const type = (query.type as TelemetryType | undefined) ?? undefined;
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.telemetryService.query({ type, from, to });
  }

  @Get('alerts')
  async alerts() {
    return this.telemetryService.getLatestAlerts();
  }
}

