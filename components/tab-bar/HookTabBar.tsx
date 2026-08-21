import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { getCartItems, useCartQuery } from "@/lib/mobile-api";
import { useLocalSessionQuery } from "@/lib/auth-api";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import {
  HOOK_TAB_BAR_BOTTOM_GAP,
  HOOK_TAB_BAR_HEIGHT,
} from "@/components/tab-bar/layout";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type TabItemConfig = {
  label: string;
  icon: IconName;
  active: IconName;
};

const tabs: Record<string, TabItemConfig> = {
  index: { label: "Home", icon: "home-outline", active: "home" },
  discover: { label: "Discover", icon: "search-outline", active: "search" },
  messages: { label: "Messages", icon: "chatbubble-ellipses-outline", active: "chatbubble-ellipses" },
  profile: { label: "Profile", icon: "person-outline", active: "person" },
};

const spring = {
  damping: 22,
  stiffness: 240,
  mass: 0.7,
};

function AnimatedTabItem({
  selected,
  item,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  selected: boolean;
  item: TabItemConfig;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.03 : 1, spring);
    lift.value = withSpring(selected ? -1 : 0, spring);
  }, [lift, scale, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel || item.label}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.94, spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(selected ? 1.03 : 1, spring);
      }}
      className="z-10 flex-1 items-center justify-center"
      style={styles.tabSlot}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Ionicons
          name={selected ? item.active : item.icon}
          size={21}
          color={selected ? "#111" : "#B2B2B5"}
        />
        <Text
          allowFontScaling={false}
          style={[styles.tabLabel, { color: selected ? "#111" : "#B2B2B5" }]}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function HookTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const cart = useCartQuery();
  const session = useLocalSessionQuery();
  const { openAuth } = useAuthSheet();
  const cartCount = getCartItems(cart.data).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const [width, setWidth] = useState(0);
  const slot = width && state.routes.length ? width / state.routes.length : 0;
  const activeWidth = Math.max(66, Math.min(slot - 5, 94));
  const activeOffset = useSharedValue(0);

  useEffect(() => {
    if (!slot) return;
    activeOffset.value = withSpring(
      state.index * slot + (slot - activeWidth) / 2,
      spring,
    );
  }, [activeOffset, activeWidth, slot, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeOffset.value }],
  }));

  const measure = (event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width));
  };

  return (
    <View
      pointerEvents="box-none"
      style={styles.safeArea}
    >
      <View pointerEvents="box-none" className="flex-row items-center gap-2 px-3">
        <View
          onLayout={measure}
          className="relative flex-1 flex-row overflow-hidden rounded-[31px] bg-white px-1"
          style={[styles.navigation, styles.shadow]}
        >
          {slot ? (
            <Animated.View
              pointerEvents="none"
              className="absolute bottom-1 top-1 rounded-[25px] bg-[#FFC809]"
              style={[{ width: activeWidth }, indicatorStyle]}
            />
          ) : null}
          {state.routes.map((route) => {
            const selected = state.routes[state.index].key === route.key;
            const item = tabs[route.name] || tabs.index;
            const options = descriptors[route.key].options;

            return (
              <AnimatedTabItem
                key={route.key}
                selected={selected}
                item={item}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onLongPress={() =>
                  navigation.emit({ type: "tabLongPress", target: route.key })
                }
                onPress={() => {
                  if (route.name === 'profile' && !session.data?.session) {
                    void Haptics.selectionAsync();
                    openAuth('/(tabs)/profile');
                    return;
                  }
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!selected && !event.defaultPrevented) {
                    void Haptics.selectionAsync();
                    navigation.navigate(route.name, route.params);
                  }
                }}
              />
            );
          })}
        </View>
        <Pressable
          accessibilityLabel={`Open cart${cartCount ? `, ${cartCount} items` : ""}`}
          accessibilityRole="button"
          onPress={() => router.push("/cart" as never)}
          className="items-center justify-center rounded-full bg-white"
          style={[styles.cartButton, styles.shadow]}
        >
          <Ionicons name="bag-handle-outline" size={23} color="#111" />
          {cartCount > 0 ? (
            <View className="absolute right-0.5 top-0.5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#FFC809] px-1">
              <Text className="text-[10px] font-black text-black">
                {cartCount > 99 ? "99+" : cartCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    bottom: HOOK_TAB_BAR_BOTTOM_GAP,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 30,
  },
  navigation: { height: HOOK_TAB_BAR_HEIGHT },
  tabSlot: {
    minWidth: 0,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    width: 76,
  },
  tabLabel: {
    fontFamily: "NunitoSans-SemiBold",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textAlign: "center",
    includeFontPadding: false,
    flexShrink: 0,
  },
  cartButton: {
    width: HOOK_TAB_BAR_HEIGHT,
    height: HOOK_TAB_BAR_HEIGHT,
    borderRadius: HOOK_TAB_BAR_HEIGHT / 2,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 14,
  },
});
