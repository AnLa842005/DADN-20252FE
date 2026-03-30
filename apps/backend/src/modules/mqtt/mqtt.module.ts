import { forwardRef, Module } from "@nestjs/common";
import { TelemetryModule } from "../telemetry/telemetry.module";
import { MqttService } from "./mqtt.service";
import { CommandModule } from "../command/command.module";

@Module({
  imports: [forwardRef(() => TelemetryModule), forwardRef(() => CommandModule)],
  controllers: [],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
