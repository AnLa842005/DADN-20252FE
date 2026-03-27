import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TelemetryType } from '../telemetry/telemetry.types';
import { TelemetryRealtimeEvent } from './realtime.types';

@Injectable()
export class RealtimeService {
  private readonly telemetrySubject = new Subject<TelemetryRealtimeEvent>();

  publishTelemetry(event: TelemetryRealtimeEvent) {
    this.telemetrySubject.next(event);
  }

  // Observer pattern: each SSE client subscribes to stream.
  telemetry$(type?: TelemetryType): Observable<TelemetryRealtimeEvent> {
    if (!type) return this.telemetrySubject.asObservable();
    return this.telemetrySubject.asObservable().pipe(filter((event) => event.type === type));
  }
}

