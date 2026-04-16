import { dashboardPayload } from "../mock/dashboard";
import { features } from "../mock/features";
import { initialDeviceSettings } from "../mock/settings";
import { userProfile, type UserProfile } from "../mock/user";
import type { ControlItem, DashboardData, NavKey } from "../types/dashboard";

type DeviceSettings = Record<string, boolean>;
type TelemetryType = "temp" | "air_humidity" | "soil_humidity" | "light";
type DevicePowerValue = "ON" | "OFF";

export type TelemetryPoint = {
  id: string;
  numericValue: number;
  receivedAt: string;
};

export type ManagedDevice = {
  id: string;
  name: string;
  autoMode: boolean;
  power: boolean;
};

let deviceSettings: DeviceSettings = { ...initialDeviceSettings };
let managedDevices: ManagedDevice[] = [
  { id: "fan", name: "Fan", autoMode: true, power: false },
  { id: "pump", name: "Pump (Water)", autoMode: true, power: true },
  { id: "speaker", name: "Speaker", autoMode: false, power: false },
];

const telemetrySeed: Record<TelemetryType, number[]> = {
  temp: [28, 29, 30, 31, 29, 30, 32, 31, 30, 29, 28, 30],
  air_humidity: [58, 60, 62, 61, 63, 64, 62, 61, 59, 60, 58, 57],
  soil_humidity: [33, 35, 36, 37, 35, 38, 39, 40, 38, 37, 36, 35],
  light: [42, 45, 50, 53, 55, 58, 61, 59, 56, 52, 48, 44],
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomDelay(min: number, max: number) {
  return delay(min + Math.floor(Math.random() * (max - min + 1)));
}

function cloneDashboard(): Record<NavKey, DashboardData> {
  return JSON.parse(JSON.stringify(dashboardPayload)) as Record<NavKey, DashboardData>;
}

function applySettingsToControls(
  controls: ControlItem[],
  settings: DeviceSettings
): ControlItem[] {
  return controls.map((item) => {
    const nextEnabled = settings[item.id];
    if (nextEnabled === undefined) {
      return item;
    }
    return {
      ...item,
      enabled: nextEnabled,
      state: nextEnabled
        ? "online"
        : item.mode === "auto"
          ? "online"
          : "offline",
    };
  });
}

export async function getDashboard(): Promise<Record<NavKey, DashboardData>> {
  await randomDelay(320, 620);
  return cloneDashboard();
}

export async function getUser(): Promise<UserProfile> {
  await randomDelay(200, 450);
  return { ...userProfile };
}

export async function getFeatures(): Promise<typeof features> {
  await randomDelay(200, 400);
  return { ...features };
}

export async function getSettings(): Promise<DeviceSettings> {
  await randomDelay(300, 720);
  return { ...deviceSettings };
}

export async function updateSetting(key: string, value: boolean): Promise<boolean> {
  await randomDelay(380, 780);
  deviceSettings = { ...deviceSettings, [key]: value };
  return value;
}

export async function getTelemetrySeries(type: TelemetryType): Promise<TelemetryPoint[]> {
  await randomDelay(220, 480);
  const now = Date.now();
  return telemetrySeed[type].map((numericValue, index, list) => ({
    id: `${type}-${index}`,
    numericValue,
    receivedAt: new Date(now - (list.length - index) * 10 * 60 * 1000).toISOString(),
  }));
}

export async function getManagedDevices(): Promise<ManagedDevice[]> {
  await randomDelay(240, 520);
  return managedDevices.map((device) => ({ ...device }));
}

export async function updateManagedDevicePower(
  id: string,
  value: DevicePowerValue
): Promise<boolean> {
  await randomDelay(250, 560);
  managedDevices = managedDevices.map((device) =>
    device.id === id ? { ...device, power: value === "ON" } : device
  );
  return value === "ON";
}

export async function toggleManagedDeviceAutoMode(id: string): Promise<ManagedDevice[]> {
  await randomDelay(180, 420);
  managedDevices = managedDevices.map((device) =>
    device.id === id ? { ...device, autoMode: !device.autoMode } : device
  );
  return managedDevices.map((device) => ({ ...device }));
}

export function buildControlMapFromDashboard(
  data: Record<NavKey, DashboardData>,
  settings: DeviceSettings
): Record<NavKey, ControlItem[]> {
  const keys: NavKey[] = ["home", "analytics", "devices"];
  return keys.reduce(
    (acc, navKey) => {
      acc[navKey] = applySettingsToControls(data[navKey].controls, settings);
      return acc;
    },
    {} as Record<NavKey, ControlItem[]>
  );
}
