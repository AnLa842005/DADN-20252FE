import type { AlertItem, ControlItem, DashboardData, NavKey, StatItem } from "../types/dashboard";
import { apiFetch } from "./auth";
import {
  buildManagedDevicePowerRequest,
  getDashboardControlRgbColor,
  getDashboardControlTarget,
  listDashboardControlIdsByTarget,
  type DevicePowerValue,
} from "./deviceRegistry";
import {
  createDashboardSeed,
  createDeviceSettingsSeed,
  createFeaturesSeed,
} from "./mockData";
import { getApiBaseUrl, shouldUseMocks } from "./runtimeConfig";

type DeviceSettings = Record<string, boolean>;
type TelemetryType = "temp" | "air_humidity" | "soil_humidity" | "light";

export type UserProfile = {
  displayName: string;
  email?: string;
  id?: string;
};

export type EditableSettings = DeviceSettings;

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
  desiredPower: boolean;
  actualPower: boolean | null;
  lastCommandStatus: "idle" | "sent" | "acked" | "timeout" | "failed";
  lastCommandAt: string | null;
  lastAckAt: string | null;
  lastSeenAt: string | null;
  connectionStatus: "online" | "offline" | "unknown";
};

export type AutomationSensorKey = "soilMoisture" | "temperature" | "light";

export type AutomationThreshold = {
  operator: "<" | ">";
  value: number;
};

export type AutomationRule = {
  deviceId: string;
  target: "pump" | "fan" | "rgb";
  sensorKey: AutomationSensorKey;
  enabled: boolean;
  turnOnWhen: AutomationThreshold;
  turnOffWhen: AutomationThreshold;
  onPayload?: string;
  offPayload?: string;
};

export type AutomationLog = {
  id: string;
  deviceId: string;
  target: "pump" | "fan" | "rgb";
  sensorKey: AutomationSensorKey;
  sensorValue: number;
  action: "ON" | "OFF";
  payload: string;
  reason: string;
  status: "sent" | "failed";
  createdAt: string;
  commandId?: string;
  error?: string;
};

export type AppFeatures = ReturnType<typeof createFeaturesSeed>;

let deviceSettings: DeviceSettings = createDeviceSettingsSeed();
let managedDevices: ManagedDevice[] = [
  {
    id: "fan",
    name: "Fan",
    autoMode: true,
    power: false,
    desiredPower: false,
    actualPower: null,
    lastCommandStatus: "idle",
    lastCommandAt: null,
    lastAckAt: null,
    lastSeenAt: null,
    connectionStatus: "unknown",
  },
  {
    id: "pump",
    name: "Pump (Water)",
    autoMode: true,
    power: true,
    desiredPower: true,
    actualPower: null,
    lastCommandStatus: "idle",
    lastCommandAt: null,
    lastAckAt: null,
    lastSeenAt: null,
    connectionStatus: "unknown",
  },
  {
    id: "speaker",
    name: "Speaker",
    autoMode: false,
    power: false,
    desiredPower: false,
    actualPower: null,
    lastCommandStatus: "idle",
    lastCommandAt: null,
    lastAckAt: null,
    lastSeenAt: null,
    connectionStatus: "unknown",
  },
  {
    id: "rgb",
    name: "Grow Light",
    autoMode: false,
    power: false,
    desiredPower: false,
    actualPower: null,
    lastCommandStatus: "idle",
    lastCommandAt: null,
    lastAckAt: null,
    lastSeenAt: null,
    connectionStatus: "unknown",
  },
];

/** Dashboard rows that share the single `pump` MQTT feed — ON if any row is on. */
const PUMP_CONTROL_IDS = listDashboardControlIdsByTarget("pump");

/** Cooling fan row on Analytics → `fan` command. */
const FAN_CONTROL_IDS = listDashboardControlIdsByTarget("fan");

/**
 * Light rows mapped to one RGB feed (`/commands/rgb`). When multiple are on, RGB channels add (capped at 255).
 */
const RGB_LED_COLORS = Object.fromEntries(
  listDashboardControlIdsByTarget("rgb")
    .map((id) => [id, getDashboardControlRgbColor(id)])
    .filter((entry): entry is [string, { r: number; g: number; b: number }] => Boolean(entry[1]))
);

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

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const res = await apiFetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PATCH ${url} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

function cloneDashboard(): Record<NavKey, DashboardData> {
  return createDashboardSeed();
}

function sanitizeSettingsPatch(
  payload: Partial<EditableSettings>
): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(payload).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
  );
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
  if (shouldUseMocks()) {
    return cloneDashboard();
  }
  try {
    return await apiGet<Record<NavKey, DashboardData>>("/dashboard");
  } catch {
    return cloneDashboard();
  }
}

export async function getUser(): Promise<UserProfile> {
  if (shouldUseMocks()) {
    return { displayName: "User" };
  }
  try {
    const me = await apiGet<{ id: string; email: string; displayName: string }>("/me");
    return { id: me.id, email: me.email, displayName: me.displayName };
  } catch {
    return { displayName: "User" };
  }
}

export async function updateUserProfile(
  payload: Pick<UserProfile, "displayName">
): Promise<UserProfile> {
  if (shouldUseMocks()) {
    return { displayName: payload.displayName.trim() || "User" };
  }
  return apiPatch<UserProfile>("/me", payload);
}

export async function getFeatures(): Promise<AppFeatures> {
  if (shouldUseMocks()) {
    return createFeaturesSeed();
  }
  try {
    return await apiGet<AppFeatures>("/features");
  } catch {
    return createFeaturesSeed();
  }
}

export async function getSettings(): Promise<DeviceSettings> {
  if (shouldUseMocks()) {
    return { ...deviceSettings };
  }
  try {
    const nextSettings = await apiGet<DeviceSettings>("/settings");
    deviceSettings = { ...deviceSettings, ...nextSettings };
  } catch {
    // Keep local fallback for non-wired environments.
  }
  return { ...deviceSettings };
}

export async function updateUserSettings(
  payload: Partial<EditableSettings>
): Promise<EditableSettings> {
  const sanitizedPayload = sanitizeSettingsPatch(payload);
  if (shouldUseMocks()) {
    deviceSettings = { ...deviceSettings, ...sanitizedPayload };
    return { ...deviceSettings };
  }
  const nextSettings = await apiPatch<EditableSettings>("/settings", sanitizedPayload);
  deviceSettings = { ...deviceSettings, ...nextSettings };
  return { ...deviceSettings };
}

export async function updateSetting(key: string, value: boolean): Promise<boolean> {
  const snapshot: DeviceSettings = { ...deviceSettings };
  deviceSettings = { ...deviceSettings, [key]: value };
  try {
    if (shouldUseMocks()) {
      return value;
    }
    const target = getDashboardControlTarget(key);
    if (target === "pump") {
      await postPumpAggregate();
    } else if (target === "fan") {
      await postFanAggregate();
    } else if (target === "rgb") {
      await postRgbMerged();
    }
    await apiPatch("/settings", { [key]: value });
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
  if (shouldUseMocks()) {
    return managedDevices.map((device) => ({ ...device }));
  }
  try {
    managedDevices = await apiGet<ManagedDevice[]>("/devices");
  } catch {
    // Keep local fallback for non-wired environments.
  }
  return managedDevices.map((device) => ({ ...device }));
}

export async function updateManagedDevicePower(
  id: string,
  value: DevicePowerValue
): Promise<boolean> {
  if (shouldUseMocks()) {
    managedDevices = managedDevices.map((device) =>
      device.id === id
        ? {
            ...device,
            power: value === "ON",
            desiredPower: value === "ON",
            lastCommandStatus: "sent",
            lastCommandAt: new Date().toISOString(),
          }
        : device
    );
    return value === "ON";
  }

  const request = buildManagedDevicePowerRequest(id, value);
  if (!request) {
    throw new Error(`No device power endpoint configured for ${id}`);
  }

  await apiPost(request.path, request.body);
  return value === "ON";
}

export async function toggleManagedDeviceAutoMode(id: string): Promise<ManagedDevice[]> {
  if (shouldUseMocks()) {
    managedDevices = managedDevices.map((device) =>
      device.id === id ? { ...device, autoMode: !device.autoMode } : device
    );
    return managedDevices.map((device) => ({ ...device }));
  }
  managedDevices = await apiPatch<ManagedDevice[]>("/devices/auto-mode", { id });
  return managedDevices.map((device) => ({ ...device }));
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  if (shouldUseMocks()) {
    return [];
  }
  return apiGet<AutomationRule[]>("/automation/rules");
}

export async function getAutomationLogs(): Promise<AutomationLog[]> {
  if (shouldUseMocks()) {
    return [];
  }
  return apiGet<AutomationLog[]>("/automation/logs");
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
