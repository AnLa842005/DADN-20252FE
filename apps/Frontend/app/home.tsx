import { Feather, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Toggle } from "../components/Toggle";
import { UserMenu } from "../components/UserMenu";
import { dashboardPayload, sidebarItems } from "../mock/dashboard";
import { initialDeviceSettings } from "../mock/settings";
import { userProfile } from "../mock/user";
import {
  buildControlMapFromDashboard,
  getAlertsLive,
  getDashboard,
  getFeatures,
  getQuickStatsLive,
  getSettings,
  getUser,
  updateSetting,
} from "../services/api";
import { getTokens } from "../services/auth";
import type { ControlItem, DashboardData, DeviceType, NavKey } from "../types/dashboard";

const ACCENT_GREEN = "#22ff66";
const PAGE_BG = "#e5e5e5";

function paginationItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, 2, 3, total - 1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push("ellipsis");
    }
    out.push(sorted[i]);
  }
  return out;
}

const alertsPerPage = 6;
const controlsPerPage = 5;

function DeviceIcon({ type }: { type: DeviceType }) {
  if (type === "pump") {
    return <FontAwesome6 name="pump-soap" size={22} color="#111111" />;
  }

  return <Feather name="sun" size={22} color="#111111" />;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isTablet = width >= 640;
  const statsPerRow = isDesktop ? 4 : isTablet ? 2 : 1;
  const statWidth = `${100 / statsPerRow - (statsPerRow > 1 ? 2 : 0)}%` as const;

  const [dashboard, setDashboard] = useState<Record<NavKey, DashboardData>>(dashboardPayload);
  const [controlMap, setControlMap] = useState<Record<NavKey, ControlItem[]>>(() =>
    buildControlMapFromDashboard(dashboardPayload, initialDeviceSettings)
  );
  const [userName, setUserName] = useState(userProfile.displayName);
  const [bootstrapPending, setBootstrapPending] = useState(true);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavKey>("home");
  const [alertPageMap, setAlertPageMap] = useState<Record<NavKey, number>>({
    home: 1,
    analytics: 1,
    devices: 1,
  });
  const [controlPageMap, setControlPageMap] = useState<Record<NavKey, number>>({
    home: 1,
    analytics: 1,
    devices: 1,
  });

  const formatLabel = useCallback(
    (key: NavKey) => dashboard[key].title,
    [dashboard]
  );

  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const tokens = await getTokens();
      if (mounted && !tokens) {
        router.replace("/");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const hydrateLiveHome = async () => {
      try {
        const [stats, alerts] = await Promise.all([getQuickStatsLive(), getAlertsLive(40)]);
        if (cancelled) return;
        setDashboard((prev) => ({
          ...prev,
          home: {
            ...prev.home,
            stats,
            alerts,
          },
        }));
      } catch (e) {
        console.log("Live dashboard refresh failed", e);
      }
    };

    void (async () => {
      try {
        const [dash, settings, profile] = await Promise.all([
          getDashboard(),
          getSettings(),
          getUser(),
        ]);
        if (cancelled) return;
        setDashboard(dash);
        setControlMap(buildControlMapFromDashboard(dash, settings));
        setUserName(profile.displayName);
        await hydrateLiveHome();
        await getFeatures().catch(() => undefined);
      } catch (e) {
        console.log("Initial dashboard load failed", e);
        await hydrateLiveHome();
      } finally {
        if (!cancelled) setBootstrapPending(false);
      }

      if (!cancelled) {
        pollTimer = setInterval(() => {
          void hydrateLiveHome();
        }, 10_000);
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const handleDevicePower = useCallback(
    async (id: string, next: boolean) => {
      const snapshot = JSON.parse(JSON.stringify(controlMap)) as Record<NavKey, ControlItem[]>;
      setControlMap((current) => ({
        ...current,
        [activeNav]: current[activeNav].map((item) =>
          item.id === id
            ? {
                ...item,
                enabled: next,
                state: next ? "online" : item.mode === "auto" ? "online" : "offline",
              }
            : item
        ),
      }));
      setPendingToggleId(id);
      try {
        await updateSetting(id, next);
      } catch (e) {
        console.log("updateSetting failed", e);
        setControlMap(snapshot);
      } finally {
        setPendingToggleId(null);
      }
    },
    [activeNav, controlMap]
  );

  const activeData = dashboard[activeNav];
  const activeControls = controlMap[activeNav];
  const totalAlertPages = Math.max(
    1,
    Math.ceil(activeData.alerts.length / alertsPerPage)
  );
  const totalControlPages = Math.max(
    1,
    Math.ceil(activeControls.length / controlsPerPage)
  );
  const activeAlertPage = Math.min(alertPageMap[activeNav], totalAlertPages);
  const activeControlPage = Math.min(controlPageMap[activeNav], totalControlPages);
  const pagedAlerts = useMemo(() => {
    const start = (activeAlertPage - 1) * alertsPerPage;
    return activeData.alerts.slice(start, start + alertsPerPage);
  }, [activeAlertPage, activeData.alerts]);
  const pagedControls = useMemo(() => {
    const start = (activeControlPage - 1) * controlsPerPage;
    return activeControls.slice(start, start + controlsPerPage);
  }, [activeControlPage, activeControls]);

  const alertPageItems = useMemo(
    () => paginationItems(activeAlertPage, totalAlertPages),
    [activeAlertPage, totalAlertPages]
  );
  const controlPageItems = useMemo(
    () => paginationItems(activeControlPage, totalControlPages),
    [activeControlPage, totalControlPages]
  );

  const updateControl = (
    controlId: string,
    updater: (item: ControlItem) => ControlItem
  ) => {
    setControlMap((current) => ({
      ...current,
      [activeNav]: current[activeNav].map((item) =>
        item.id === controlId ? updater(item) : item
      ),
    }));
  };

  const toggleMode = (controlId: string) => {
    updateControl(controlId, (item) => ({
      ...item,
      mode: item.mode === "auto" ? "manually" : "auto",
      state: item.enabled ? "online" : "offline",
    }));
  };

  const handleNavPress = (key: NavKey) => {
    if (key === "analytics" || key === "devices") {
      router.push(`/${key}`);
      return;
    }
    setActiveNav(key);
    const maxAlert = Math.max(1, Math.ceil(dashboard[key].alerts.length / alertsPerPage));
    const maxControl = Math.max(1, Math.ceil(controlMap[key].length / controlsPerPage));
    setAlertPageMap((current) => ({
      ...current,
      [key]: Math.min(current[key], maxAlert),
    }));
    setControlPageMap((current) => ({
      ...current,
      [key]: Math.min(current[key], maxControl),
    }));
  };

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View>
        <View style={styles.brandRow}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.brandLogo}
            contentFit="contain"
          />
          <Text style={styles.brandText}>Smart Farm</Text>
        </View>

        <View style={styles.sidebarDivider} />

        <View style={styles.navList}>
          {sidebarItems.map((item) => {
            const isActive = item.key === activeNav;
            return (
              <Pressable
                key={item.key}
                onPress={() => handleNavPress(item.key)}
                style={[styles.navItem, isActive && styles.navItemActive]}
              >
                <Feather
                  name={item.icon}
                  size={20}
                  color={isActive ? "#ffffff" : "#111111"}
                />
                <Text style={[styles.navText, isActive && styles.navTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <UserMenu userName={userName} />
    </View>
  );

  const renderMobileNav = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.mobileNav}
    >
      {sidebarItems.map((item) => {
        const isActive = item.key === activeNav;
        return (
          <Pressable
            key={item.key}
            onPress={() => handleNavPress(item.key)}
            style={[styles.mobileNavItem, isActive && styles.mobileNavItemActive]}
          >
            <Feather
              name={item.icon}
              size={16}
              color={isActive ? "#ffffff" : "#111111"}
            />
            <Text
              style={[styles.mobileNavText, isActive && styles.mobileNavTextActive]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {isDesktop ? renderSidebar() : null}

        <View style={styles.mainArea}>
          <View style={styles.topBar}>
            <View style={styles.topBarTitleRow}>
              <Text style={styles.pageTitle}>{formatLabel(activeNav)}</Text>
              {bootstrapPending ? (
                <ActivityIndicator size="small" color="#2f37ff" />
              ) : null}
            </View>
            <View style={styles.timeWrap}>
              <Text style={styles.timeText}>
                {clock.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </Text>
              <Text style={styles.dateText}>
                {clock.toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                })}
              </Text>
            </View>
          </View>

          {!isDesktop ? renderMobileNav() : null}

          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              {activeData.stats.map((item) => (
                <Pressable key={item.label} style={[styles.statCard, { width: statWidth }]}>
                  <Text style={styles.statLabel}>{item.label}</Text>
                  <Ionicons name={item.icon} size={46} color="#111111" />
                  <Text style={styles.statValue}>{item.value}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.sectionRow, !isTablet && styles.sectionRowStack]}>
              <View style={styles.leftColumn}>
                <Text style={styles.sectionTitle}>Quick Control</Text>
                <View style={styles.panel}>
                  {pagedControls.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.controlRow,
                        index !== pagedControls.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <View style={styles.controlLeft}>
                        <View style={styles.deviceIcon}>
                          <DeviceIcon type={item.type} />
                        </View>
                        <View style={styles.controlTextWrap}>
                          <Text style={styles.controlNameLine}>
                            <Text style={styles.controlName}>{item.name}</Text>
                            <Text style={styles.controlStateInline}> {item.state}</Text>
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => toggleMode(item.id)}
                        style={styles.modeButton}
                      >
                        <Text style={styles.controlMode}>{item.mode}</Text>
                      </Pressable>

                      <Toggle
                        checked={item.enabled}
                        disabled={bootstrapPending}
                        loading={pendingToggleId === item.id}
                        onChange={(next) => {
                          void handleDevicePower(item.id, next);
                        }}
                      />
                    </View>
                  ))}
                  <View style={styles.panelPagination}>
                    {controlPageItems.map((entry, idx) =>
                      entry === "ellipsis" ? (
                        <Text key={`c-el-${idx}`} style={styles.pageEllipsis}>
                          ...
                        </Text>
                      ) : (
                        <Pressable
                          key={`${activeNav}-c-${entry}`}
                          onPress={() =>
                            setControlPageMap((current) => ({
                              ...current,
                              [activeNav]: entry,
                            }))
                          }
                          style={[
                            styles.pageDot,
                            entry === activeControlPage && styles.pageDotActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pageDotText,
                              entry === activeControlPage && styles.pageDotTextActive,
                            ]}
                          >
                            {entry}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.rightColumn}>
                <Text style={styles.sectionTitle}>Alert log</Text>

                <View style={styles.panel}>
                  {pagedAlerts.map((item, index) => (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.alertRow,
                        index !== pagedAlerts.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <Text style={styles.alertText}>{item.text}</Text>
                      <Text style={styles.alertTime}>{item.time}</Text>
                    </Pressable>
                  ))}
                  <View style={styles.panelPagination}>
                    {alertPageItems.map((entry, idx) =>
                      entry === "ellipsis" ? (
                        <Text key={`a-el-${idx}`} style={styles.pageEllipsis}>
                          ...
                        </Text>
                      ) : (
                        <Pressable
                          key={`${activeNav}-a-${entry}`}
                          onPress={() =>
                            setAlertPageMap((current) => ({
                              ...current,
                              [activeNav]: entry,
                            }))
                          }
                          style={[
                            styles.pageDot,
                            entry === activeAlertPage && styles.pageDotActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pageDotText,
                              entry === activeAlertPage && styles.pageDotTextActive,
                            ]}
                          >
                            {entry}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  page: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: PAGE_BG,
  },
  sidebar: {
    width: 176,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#d5d5d5",
    justifyContent: "space-between",
  },
  brandRow: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  brandLogo: {
    width: 38,
    height: 38,
  },
  brandText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: "#d5d5d5",
  },
  navList: {
    paddingTop: 54,
  },
  navItem: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 10,
  },
  navItemActive: {
    backgroundColor: ACCENT_GREEN,
  },
  navText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  navTextActive: {
    fontWeight: "700",
    color: "#ffffff",
  },
  mainArea: {
    flex: 1,
  },
  topBar: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#d5d5d5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  topBarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111111",
  },
  timeWrap: {
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
  },
  dateText: {
    marginTop: 2,
    fontSize: 11,
    color: "#505050",
  },
  mobileNav: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: PAGE_BG,
    borderBottomWidth: 1,
    borderBottomColor: "#d5d5d5",
  },
  mobileNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9d9d9",
  },
  mobileNavItemActive: {
    backgroundColor: ACCENT_GREEN,
  },
  mobileNavText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },
  mobileNavTextActive: {
    color: "#ffffff",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 18,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 22,
  },
  statCard: {
    minHeight: 150,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111111",
    textAlign: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "500",
    color: "#111111",
  },
  sectionRow: {
    flexDirection: "row",
    gap: 28,
    alignItems: "flex-start",
  },
  sectionRowStack: {
    flexDirection: "column",
  },
  leftColumn: {
    flex: 1.1,
    minWidth: 0,
  },
  rightColumn: {
    flex: 0.95,
    minWidth: 0,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d9d9d9",
  },
  controlRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 14,
  },
  controlLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  deviceIcon: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  controlTextWrap: {
    justifyContent: "center",
  },
  controlName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },
  controlNameLine: {
    flexShrink: 1,
  },
  controlStateInline: {
    fontSize: 14,
    fontWeight: "400",
    color: "#111111",
    textTransform: "capitalize",
  },
  modeButton: {
    minWidth: 82,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d3d3d3",
    backgroundColor: "#fafafa",
    alignItems: "center",
  },
  controlMode: {
    fontSize: 13,
    color: "#111111",
    textTransform: "capitalize",
  },
  alertRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: "#111111",
  },
  alertTime: {
    fontSize: 12,
    color: "#444444",
  },
  panelPagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#efefef",
  },
  pageEllipsis: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666666",
    paddingHorizontal: 2,
  },
  pageDot: {
    minWidth: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  pageDotActive: {
    backgroundColor: ACCENT_GREEN,
  },
  pageDotText: {
    fontSize: 12,
    color: "#111111",
  },
  pageDotTextActive: {
    fontWeight: "700",
  },
});
