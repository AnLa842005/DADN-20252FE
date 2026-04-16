import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UserMenu } from "../components/UserMenu";
import { dashboardPayload, sidebarItems } from "../mock/dashboard";
import { userProfile } from "../mock/user";
import {
  getManagedDevices,
  getUser,
  toggleManagedDeviceAutoMode,
  type ManagedDevice,
  updateManagedDevicePower,
} from "../services/api";
import type { NavKey } from "../types/dashboard";

const ACCENT_GREEN = "#22ff66";
const PAGE_BG = "#e5e5e5";

const activeNav: NavKey = "devices";

function CustomSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <Switch
      trackColor={{ false: "#767577", true: "#bfdbfe" }}
      thumbColor={value ? "#1d4ed8" : "#f4f3f4"}
      ios_backgroundColor="#3e3e3e"
      onValueChange={onValueChange}
      value={value}
      style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
    />
  );
}

export default function DevicesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [userName, setUserName] = useState(userProfile.displayName);
  const [devices, setDevices] = useState<ManagedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUser();
        if (!cancelled) setUserName(profile.displayName);
      } catch {
        /* keep mock name */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getManagedDevices();
        if (mounted) {
          setDevices(data);
        }
      } catch (error) {
        console.log("Failed to load devices", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredDevices = useMemo(
    () =>
      devices.filter(
        (device) =>
          device.name.toLowerCase().includes(search.toLowerCase()) ||
          device.id.toLowerCase().includes(search.toLowerCase())
      ),
    [devices, search]
  );

  const handleToggleAutoMode = async (id: string) => {
    const snapshot = devices;
    setDevices((current) =>
      current.map((device) =>
        device.id === id ? { ...device, autoMode: !device.autoMode } : device
      )
    );
    try {
      const next = await toggleManagedDeviceAutoMode(id);
      setDevices(next);
    } catch (error) {
      console.log("Failed to update auto mode", error);
      setDevices(snapshot);
    }
  };

  const handleTogglePower = async (id: string, currentValue: boolean) => {
    const nextValue = !currentValue;
    setPendingId(id);
    setDevices((current) =>
      current.map((device) =>
        device.id === id ? { ...device, power: nextValue } : device
      )
    );

    try {
      await updateManagedDevicePower(id, nextValue ? "ON" : "OFF");
    } catch (error) {
      console.log("Failed to update power", error);
      setDevices((current) =>
        current.map((device) =>
          device.id === id ? { ...device, power: currentValue } : device
        )
      );
    } finally {
      setPendingId(null);
    }
  };

  const handleNavPress = (key: NavKey) => {
    if (key === "home") {
      router.push("/home");
      return;
    }
    if (key === "analytics") {
      router.push("/analytics");
      return;
    }
    router.push("/devices");
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
            <Text style={[styles.mobileNavText, isActive && styles.mobileNavTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const pageTitle = dashboardPayload[activeNav].title;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {isDesktop ? renderSidebar() : null}

        <View style={styles.mainArea}>
          <View style={styles.topBar}>
            <Text style={styles.pageTitle}>{pageTitle}</Text>
            <View style={styles.timeWrap}>
              <Text style={styles.timeText}>7:00 AM</Text>
              <Text style={styles.dateText}>20/03/26</Text>
            </View>
          </View>

          {!isDesktop ? renderMobileNav() : null}

          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.introText}>Search and control connected farm devices.</Text>

            <View style={styles.topBarRow}>
              <View style={styles.dropdown}>
                <Text style={styles.dropdownText}>All</Text>
                <Ionicons name="chevron-down" size={16} color="#000000" />
              </View>

              <View style={styles.searchContainer}>
                <Ionicons
                  name="options-outline"
                  size={20}
                  color="#9ca3af"
                  style={styles.filterIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search"
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#93a0a7"
                />
                <View style={styles.searchButton}>
                  <Ionicons name="search" size={20} color="#000000" />
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 0.8 }]}>ID</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Device name</Text>
                <Text style={[styles.headerCell, styles.headerCellCentered]}>Auto mode</Text>
                <Text style={[styles.headerCell, styles.headerCellCentered]}>Power</Text>
              </View>

              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color="#22c55e" />
                </View>
              ) : (
                filteredDevices.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.tableRow,
                      index !== filteredDevices.length - 1 && styles.separator,
                    ]}
                  >
                    <Text style={[styles.cell, { flex: 0.8 }]}>{item.id}</Text>
                    <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
                    <View style={[styles.cellWrap, { flex: 1 }]}>
                      <CustomSwitch
                        value={item.autoMode}
                        onValueChange={() => {
                          void handleToggleAutoMode(item.id);
                        }}
                      />
                    </View>
                    <View style={[styles.cellWrap, { flex: 1 }]}>
                      <Pressable
                        disabled={pendingId === item.id}
                        onPress={() => {
                          void handleTogglePower(item.id, item.power);
                        }}
                        style={styles.powerWrap}
                      >
                        <CustomSwitch
                          value={item.power}
                          onValueChange={() => {
                            void handleTogglePower(item.id, item.power);
                          }}
                        />
                        {pendingId === item.id ? (
                          <ActivityIndicator size="small" color="#1d4ed8" />
                        ) : null}
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              {!loading && filteredDevices.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No devices match your search.</Text>
                </View>
              ) : null}
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
  introText: {
    fontSize: 14,
    color: "#505050",
    marginBottom: 18,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  dropdownText: {
    marginRight: 8,
    fontSize: 14,
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 260,
    maxWidth: 460,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  filterIcon: {
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: "#111827",
  },
  searchButton: {
    backgroundColor: ACCENT_GREEN,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
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
  tableHeader: {
    flexDirection: "row",
    backgroundColor: ACCENT_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },
  headerCellCentered: {
    flex: 1,
    textAlign: "center",
  },
  loadingWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  cell: {
    fontSize: 14,
    color: "#111827",
  },
  cellWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  powerWrap: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#d9d9d9",
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
