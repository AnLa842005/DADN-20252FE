import { ThresholdLevel, TelemetryType } from './telemetry.types';

export function classifyThreshold(type: TelemetryType, numericValue?: number): ThresholdLevel {
  if (numericValue === undefined || Number.isNaN(numericValue)) return 'unknown';

  switch (type) {
    case 'temp':
      if (numericValue < 20) return 'low';
      if (numericValue < 40) return 'normal';
      return 'high';
    case 'air_humidity':
      if (numericValue < 40) return 'low';
      if (numericValue < 60) return 'normal';
      return 'high';
    case 'soil_humidity':
      if (numericValue < 40) return 'low';
      if (numericValue < 70) return 'normal';
      return 'high';
    case 'light':
      if (numericValue < 60) return 'low';
      return 'high';
    default:
      return 'unknown';
  }
}

export function isSensorType(type: TelemetryType): boolean {
  return type === 'temp' || type === 'air_humidity' || type === 'soil_humidity' || type === 'light';
}

