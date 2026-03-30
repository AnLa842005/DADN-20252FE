import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MqttModule } from "../mqtt/mqtt.module";
import { CommandLog, CommandLogSchema } from "./entity/command-log.schema";
import { CommandLogService } from "./command-log.service";
import { CommandsController } from "./commands.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommandLog.name, schema: CommandLogSchema },
    ]),
    forwardRef(() => MqttModule),
  ],
  controllers: [CommandsController],
  providers: [CommandLogService],
  exports: [CommandLogService],
})
export class CommandModule {}
