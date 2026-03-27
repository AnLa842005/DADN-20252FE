import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SetPumpDto {
  @IsString()
  value!: 'ON' | 'OFF' | '1' | '0';
}

export class SetToggleDto {
  @IsString()
  value!: 'ON' | 'OFF' | '1' | '0';
}

export class SetRgbDto {
  @IsInt()
  @Min(0)
  @Max(255)
  r!: number;

  @IsInt()
  @Min(0)
  @Max(255)
  g!: number;

  @IsInt()
  @Min(0)
  @Max(255)
  b!: number;

  @IsOptional()
  @IsString()
  format?: 'csv' | 'json';
}

