import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { HealthModule } from '../health/health.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../../../.env')],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI')?.trim() ||
          'mongodb://127.0.0.1:27017/yolo_farm',
      }),
    }),
    MqttModule,
    TelemetryModule,
    RealtimeModule,
    HealthModule,
  ],
})
export class AppModule {}

