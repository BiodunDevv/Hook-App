import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptics } from "@/lib/haptics";
import { checkNetworkNow, useNetworkState } from "@/lib/network-status";

const LOOK = {
  offline: { bg: "#1F1F23", fg: "#FFFFFF", icon: "cloud-offline-outline" as const, title: "You are offline", body: "Waiting for a connection. We will reconnect on our own." },
  slow: { bg: "#FFF4CC", fg: "#4D3A00", icon: "cellular-outline" as const, title: "Weak connection", body: "Things may load slowly until your signal improves." },
  restored: { bg: "#12B76A", fg: "#FFFFFF", icon: "checkmark-circle-outline" as const, title: "Back online", body: "Refreshing what you were looking at." },
};

/**
 * Stays pinned to the top for as long as the network is unusable, then turns
 * green for a moment when it returns. It never blocks touches beneath it.
 */
export function NetworkBanner() {
  const state = useNetworkState();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (state === "offline") haptics.warning();
    else if (state === "restored") haptics.success();
  }, [state]);
  if (state === "online") return null;
  const look = LOOK[state];
  return (
    <Animated.View
      pointerEvents="box-none"
      entering={FadeInUp.duration(260)}
      exiting={FadeOutUp.duration(220)}
      layout={LinearTransition}
      style={{ position: "absolute", left: 12, right: 12, top: insets.top + 6, zIndex: 9999 }}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: look.bg, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}
      >
        <Ionicons name={look.icon} size={22} color={look.fg} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: look.fg, fontSize: 13.5, fontWeight: "800" }}>{look.title}</Text>
          <Text style={{ color: look.fg, opacity: 0.8, fontSize: 12, marginTop: 1 }}>{look.body}</Text>
        </View>
        {state === "offline" ? (
          <Pressable accessibilityRole="button" onPress={checkNetworkNow} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)" }}>
            <Text style={{ color: look.fg, fontSize: 12, fontWeight: "800" }}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
