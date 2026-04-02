import { IsIn, IsISO8601, IsOptional } from "class-validator";
import { ALL_LOGICAL_KEYS, LogicalFeedKey } from "../../mqtt/mqtt.topics";

export class TelemetryQueryDto {
  @IsOptional()
  // Use the single source of truth for validation
  @IsIn(ALL_LOGICAL_KEYS as unknown as string[])
  // Use the central type definition
  type?: LogicalFeedKey;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
