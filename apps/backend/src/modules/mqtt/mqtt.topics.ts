export type LogicalFeedKey =
  | 'temp'
  | 'air_humidity'
  | 'soil_humidity'
  | 'light'
  | 'fan'
  | 'pump'
  | 'speaker'
  | 'rgb'
  | 'status'
  | 'stream';

export function logicalKeyToEnvFeedKey(key: LogicalFeedKey): string {
  switch (key) {
    case 'temp':
      return process.env.FEED_TEMP_KEY ?? 'yolo-farm-temp';
    case 'air_humidity':
      return process.env.FEED_AIR_HUMIDITY_KEY ?? 'yolo-farm-air-humidity';
    case 'soil_humidity':
      return process.env.FEED_SOIL_HUMIDITY_KEY ?? 'yolo-farm-soil-humidity';
    case 'light':
      return process.env.FEED_LIGHT_KEY ?? 'yolo-farm-light';
    case 'fan':
      return process.env.FEED_FAN_KEY ?? 'yolo-farm-fan';
    case 'pump':
      return process.env.FEED_PUMP_KEY ?? 'yolo-farm-pump';
    case 'speaker':
      return process.env.FEED_SPEAKER_KEY ?? 'yolo-farm-speaker';
    case 'rgb':
      return process.env.FEED_RGB_KEY ?? 'yolo-farm-rgb';
    case 'status':
      return process.env.FEED_STATUS_KEY ?? 'yolo-farm-status';
    case 'stream':
      return process.env.FEED_STREAM_KEY ?? 'yolo-farm-stream';
  }
}

export function getAdafruitFeedTopic(key: LogicalFeedKey): string {
  const username = process.env.ADAFRUIT_IO_USERNAME ?? '';
  const feedKey = logicalKeyToEnvFeedKey(key);
  return `${username}/feeds/${feedKey}`;
}

export function getSubscribeKeys(): LogicalFeedKey[] {
  const raw =
    process.env.SUBSCRIBE_FEEDS ??
    'temp,air_humidity,soil_humidity,light,fan,pump,speaker,rgb,status,stream';
  const keys = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as LogicalFeedKey[];

  const allowed: LogicalFeedKey[] = [
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
  ];
  return keys.filter((k) => allowed.includes(k));
}

