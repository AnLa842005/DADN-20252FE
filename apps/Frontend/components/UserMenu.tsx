import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type View as RNView,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const ANIM_MS = 240;
const MENU_GAP = 8;
const ITEM_H = 44;
const MENU_PAD_V = 8;
const MENU_MIN_W = 152;

type Anchor = { x: number; y: number; w: number; h: number };

type UserMenuProps = {
  userName: string;
};

export function UserMenu({ userName }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<RNView>(null);
  const progress = useSharedValue(0);

  const itemCount = 3;
  const menuHeight = MENU_PAD_V * 2 + ITEM_H * itemCount;

  const finishClose = useCallback(() => {
    setIsOpen(false);
    setAnchor(null);
  }, []);

  const closeMenu = useCallback(() => {
    progress.value = withTiming(0, { duration: ANIM_MS }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [finishClose, progress]);

  const openMenu = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setIsOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !anchor) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: ANIM_MS });
  }, [isOpen, anchor, progress]);

  useEffect(() => {
    if (Platform.OS !== "web" || !isOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    globalThis.addEventListener?.("keydown", onKeyDown);
    return () => globalThis.removeEventListener?.("keydown", onKeyDown);
  }, [isOpen, closeMenu]);

  const toggle = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  const menuTop = anchor ? anchor.y - menuHeight - MENU_GAP : 0;
  const menuLeft = anchor?.x ?? 0;
  const menuWidth = anchor ? Math.max(anchor.w, MENU_MIN_W) : MENU_MIN_W;

  const goProfileOrSettings = () => {
    console.log("go to profile/settings");
    closeMenu();
  };

  const goLogout = () => {
    router.replace("/");
    closeMenu();
  };

  return (
    <>
      <Modal visible={isOpen} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close menu"
            onPress={closeMenu}
            style={styles.backdrop}
          />
          {anchor ? (
            <Animated.View
              pointerEvents="box-none"
              style={[
                menuAnimatedStyle,
                {
                  position: "absolute",
                  left: menuLeft,
                  top: menuTop,
                  width: menuWidth,
                  zIndex: 10,
                  elevation: 12,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                },
              ]}
              className="rounded-xl bg-white py-2"
            >
              <Pressable
                onPress={goProfileOrSettings}
                className="mx-1 flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:bg-[rgba(34,255,102,0.12)] web:cursor-pointer web:hover:bg-[rgba(34,255,102,0.12)]"
              >
                <Feather name="user" size={18} color="#111111" />
                <Text className="text-[14px] font-semibold text-neutral-900">Profile</Text>
              </Pressable>
              <Pressable
                onPress={goProfileOrSettings}
                className="mx-1 flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:bg-[rgba(34,255,102,0.12)] web:cursor-pointer web:hover:bg-[rgba(34,255,102,0.12)]"
              >
                <Feather name="settings" size={18} color="#111111" />
                <Text className="text-[14px] font-semibold text-neutral-900">Settings</Text>
              </Pressable>
              <Pressable
                onPress={goLogout}
                className="mx-1 flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:bg-red-50 web:cursor-pointer web:hover:bg-red-50"
              >
                <Feather name="log-out" size={18} color="#b91c1c" />
                <Text className="text-[14px] font-semibold text-red-700">Logout</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      <View ref={triggerRef} collapsable={false} className="w-full">
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel="User menu"
          className={`h-[54px] w-full flex-row items-center gap-2 border-t border-[#d5d5d5] px-2 web:cursor-pointer ${
            isOpen ? "bg-[rgba(34,255,102,0.14)]" : "bg-transparent"
          }`}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#ececec]">
            <Feather name="user" size={18} color="#888888" />
          </View>
          <Text className="flex-1 text-left text-[14px] text-neutral-900" numberOfLines={1}>
            {userName}
          </Text>
          <Feather
            name={isOpen ? "chevron-down" : "chevron-up"}
            size={18}
            color="#111111"
          />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
