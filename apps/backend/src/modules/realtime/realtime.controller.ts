import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TelemetryType } from '../telemetry/telemetry.types';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse('telemetry')
  telemetry(@Query('type') type?: TelemetryType): Observable<MessageEvent> {
    return this.realtimeService.telemetry$(type).pipe(
      map((data) => ({
        type: 'telemetry',
        data,
      })),
    );
  }
}

