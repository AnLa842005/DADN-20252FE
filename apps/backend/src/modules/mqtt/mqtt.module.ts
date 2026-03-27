import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { CommandLog, CommandLogSchema } from './command-log.schema';
import { CommandLogService } from './command-log.service';
import { CommandsController } from './commands.controller';
import { MqttService } from './mqtt.service';

@Module({
  imports: [
    forwardRef(() => TelemetryModule),
    MongooseModule.forFeature([{ name: CommandLog.name, schema: CommandLogSchema }]),
  ],
  controllers: [CommandsController],
  providers: [MqttService, CommandLogService],
  exports: [MqttService, CommandLogService],
})
export class MqttModule {}

