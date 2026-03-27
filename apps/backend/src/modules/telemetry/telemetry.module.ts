import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeModule } from '../realtime/realtime.module';
import { TelemetryController } from './telemetry.controller';
import { Alert, AlertSchema } from './alert.schema';
import { Telemetry, TelemetrySchema } from './telemetry.schema';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Telemetry.name, schema: TelemetrySchema },
      { name: Alert.name, schema: AlertSchema },
    ]),
    RealtimeModule,
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}

