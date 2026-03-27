import { IsIn, IsISO8601, IsOptional } from 'class-validator';

const allowed = [
  'temp',
  'air_humidity',
  'soil_humidity',
  'light',
  'fan',
  'pump',
  'speaker',
  'rgb',
  'status',
  'stream',
] as const;
export type TelemetryTypeDto = (typeof allowed)[number];

export class TelemetryQueryDto {
  @IsOptional()
  @IsIn(allowed)
  type?: TelemetryTypeDto;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

