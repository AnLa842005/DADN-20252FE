import { dashboardPayload } from "../mock/dashboard";
import { features } from "../mock/features";
import { initialDeviceSettings } from "../mock/settings";
import type { AlertItem, ControlItem, DashboardData, NavKey, StatItem } from "../types/dashboard";
import { apiFetch } from "./auth";

type DeviceSettings = Record<string, boolean>;
type DevicePowerValue = "ON" | "OFF";
type TelemetryType = "temp" | "air_humidity" | "soil_humidity" | "light";

export type UserProfile = {
  displayName: string;
  email?: string;
  id?: string;
};

type LatestTelemetry = {
  _id: string;
  type: TelemetryType;
  numericValue?: number;
  raw: string;
  receivedAt: string;
};

type AlertDto = {
  _id: string;
  type: TelemetryType;
  level: "low" | "high";
  value: number;
  triggeredAt: string;
};

const QUICK_STAT_SENSOR_LABEL: Record<TelemetryType, string> = {
  temp: "Temperature",
  air_humidity: "Air Humidity",
  soil_humidity: "Soil Humidity",
  light: "Light Intensity",
};

const QUICK_STAT_ICON: Record<TelemetryType, StatItem["icon"]> = {
  temp: "thermometer-outline",
  air_humidity: "cloud-outline",
  soil_humidity: "water-outline",
  light: "sunny-outline",
};

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

/** Dashboard rows that share the single `pump` MQTT feed — ON if any row is on. */
const PUMP_CONTROL_IDS = new Set([
  "pump-1",
  "pump-2",
  "schedule-1",
  "dev-1",
  "dev-2",
]);

/** Cooling fan row on Analytics → `fan` command. */
const FAN_CONTROL_IDS = new Set(["schedule-2"]);

/**
 * Light rows mapped to one RGB feed (`/commands/rgb`). When multiple are on, RGB channels add (capped at 255).
 */
const RGB_LED_COLORS: Record<string, { r: number; g: number; b: number }> = {
  "led-1": { r: 255, g: 0, b: 0 },
  "led-2": { r: 0, g: 255, b: 0 },
  "led-3": { r: 0, g: 0, b: 255 },
  "schedule-3": { r: 200, g: 200, b: 255 },
  "dev-3": { r: 255, g: 255, b: 0 },
  "dev-4": { r: 255, g: 128, b: 0 },
};

function pumpAnyOn(): boolean {
  for (const id of PUMP_CONTROL_IDS) {
    if (deviceSettings[id]) return true;
  }
  return false;
}

function fanAnyOn(): boolean {
  for (const id of FAN_CONTROL_IDS) {
    if (deviceSettings[id]) return true;
  }
  return false;
}

async function postPumpAggregate(): Promise<void> {
  const value: DevicePowerValue = pumpAnyOn() ? "ON" : "OFF";
  await apiPost("/commands/pump", { value });
}

async function postFanAggregate(): Promise<void> {
  const value: DevicePowerValue = fanAnyOn() ? "ON" : "OFF";
  await apiPost("/commands/fan", { value });
}

async function postRgbMerged(): Promise<void> {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [id, add] of Object.entries(RGB_LED_COLORS)) {
    if (deviceSettings[id]) {
      r = Math.min(255, r + add.r);
      g = Math.min(255, g + add.g);
      b = Math.min(255, b + add.b);
    }
  }
  await apiPost("/commands/rgb", { r, g, b, format: "csv" });
}

function getApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env && process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  return "http://localhost:3001";
}

async function apiGet<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), getApiBaseUrl().replace(/\/$/, "") + "/");
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, value);
      }
    });
  }
  const res = await apiFetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${url.toString()} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function apiPost<T>(
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(extraHeaders ?? {}),
  };
  const res = await apiFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${url} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
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
  return cloneDashboard();
}

export async function getUser(): Promise<UserProfile> {
  try {
    const me = await apiGet<{ id: string; email: string; displayName: string }>("/me");
    return { id: me.id, email: me.email, displayName: me.displayName };
  } catch {
    return { displayName: "User" };
  }
}

export async function getFeatures(): Promise<typeof features> {
  return { ...features };
}

export async function getSettings(): Promise<DeviceSettings> {
  return { ...deviceSettings };
}

export async function updateSetting(key: string, value: boolean): Promise<boolean> {
  const snapshot: DeviceSettings = { ...deviceSettings };
  deviceSettings = { ...deviceSettings, [key]: value };
  try {
    if (PUMP_CONTROL_IDS.has(key)) {
      await postPumpAggregate();
    } else if (FAN_CONTROL_IDS.has(key)) {
      await postFanAggregate();
    } else if (Object.hasOwn(RGB_LED_COLORS, key)) {
      await postRgbMerged();
    }
    return value;
  } catch (e) {
    deviceSettings = snapshot;
    throw e;
  }
}

type TelemetryRecord = {
  _id: string;
  numericValue?: number;
  receivedAt: string;
};

export async function getTelemetrySeries(type: TelemetryType): Promise<TelemetryPoint[]> {
  const now = new Date();
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const to = now;
  const records = await apiGet<TelemetryRecord[]>("/telemetry", {
    type,
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return records
    .filter((item) => typeof item.numericValue === "number")
    .map((item) => ({
      id: item._id,
      numericValue: item.numericValue as number,
      receivedAt: item.receivedAt,
    }));
}

async function getLatestTelemetry(type: TelemetryType): Promise<LatestTelemetry | null> {
  try {
    return await apiGet<LatestTelemetry | null>("/telemetry/latest", { type });
  } catch {
    return null;
  }
}

function formatQuickStatValue(type: TelemetryType, doc: LatestTelemetry | null): string {
  if (!doc || typeof doc.numericValue !== "number" || !Number.isFinite(doc.numericValue)) {
    return "—";
  }
  const n = Math.round(doc.numericValue);
  if (type === "temp") return String(n);
  return `${n}%`;
}

/** Latest readings for the four dashboard sensors (MQTT → DB → GET /telemetry/latest). */
export async function getQuickStatsLive(): Promise<StatItem[]> {
  const types: TelemetryType[] = ["temp", "air_humidity", "soil_humidity", "light"];
  const docs = await Promise.all(types.map((t) => getLatestTelemetry(t)));
  return types.map((type, i) => ({
    label: QUICK_STAT_SENSOR_LABEL[type],
    value: formatQuickStatValue(type, docs[i]),
    icon: QUICK_STAT_ICON[type],
  }));
}

/** Threshold alerts from MQTT ingest (GET /alerts). */
export async function getAlertsLive(limit = 50): Promise<AlertItem[]> {
  try {
    const rows = await apiGet<AlertDto[]>("/alerts");
    return rows.slice(0, limit).map((a) => {
      const label = QUICK_STAT_SENSOR_LABEL[a.type] ?? a.type.replace(/_/g, " ");
      return {
        id: a._id,
        text: `${label} ${a.level} (${a.value})`,
        time: new Date(a.triggeredAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
    });
  } catch {
    return [];
  }
}

export async function getManagedDevices(): Promise<ManagedDevice[]> {
  return managedDevices.map((device) => ({ ...device }));
}

function commandPathFromDeviceId(id: string): string | null {
  if (id === "fan") return "/commands/fan";
  if (id === "pump") return "/commands/pump";
  if (id === "speaker") return "/commands/speaker";
  return null;
}

export async function updateManagedDevicePower(
  id: string,
  value: DevicePowerValue
): Promise<boolean> {
  const path = commandPathFromDeviceId(id);
  if (!path) {
    managedDevices = managedDevices.map((device) =>
      device.id === id ? { ...device, power: value === "ON" } : device
    );
    return value === "ON";
  }

  await apiPost(path, { value });
  managedDevices = managedDevices.map((device) =>
    device.id === id ? { ...device, power: value === "ON" } : device
  );
  return value === "ON";
}

export async function toggleManagedDeviceAutoMode(id: string): Promise<ManagedDevice[]> {
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
