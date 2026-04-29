import { dashboardPayload, sidebarItems } from "../mock/dashboard";
import { features } from "../mock/features";
import { initialDeviceSettings } from "../mock/settings";
import type { DashboardData, NavKey } from "../types/dashboard";

export { sidebarItems };

export function createDashboardSeed(): Record<NavKey, DashboardData> {
  return JSON.parse(JSON.stringify(dashboardPayload)) as Record<NavKey, DashboardData>;
}

export function createDeviceSettingsSeed(): Record<string, boolean> {
  return { ...initialDeviceSettings };
}

export function createFeaturesSeed() {
  return { ...features };
}

export function getSeedPageTitle(key: NavKey): string {
  return dashboardPayload[key].title;
}
