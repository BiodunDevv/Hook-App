import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptics } from "@/lib/haptics";
import { HOOK_TAB_BAR_BOTTOM_GAP, HOOK_TAB_BAR_HEIGHT } from "@/components/tab-bar/layout";
import { usePendingApprovalsQuery } from "@/lib/mobile-api";

const MASCOT = require("../../assets/images/replacement-mascot.png");
const SIZE = 84;
const MARGIN = 12;

function openApproval(orderId: string) {
  haptics.tap();
  router.push({ pathname: "/orders/[id]", params: { id: orderId } } as never);
}

/**
 * A fixed mascot shown only while the customer has an item replacement
 * awaiting their decision — pinned right above the cart tab, tap it to jump
 * straight to the approval. Not draggable by design: its one job is to sit
 * in that same spot every time so it's always where you expect it.
 * Introduces itself with a little shake the first time it appears, then
 * settles into a gentle idle float.
 */
export function ReplacementFab({ hidden = false }: { hidden?: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const query = usePendingApprovalsQuery();
  const items = query.data?.items || [];
  const count = query.data?.count || 0;
  const firstOrderId = items[0]?.orderId;
  const paymentDue = items[0]?.status === "PAYMENT_PENDING";

  // Right-aligned with the cart tab's own right margin, bottom edge touching
  // the tab bar's top edge — perched directly above the cart tab, always.
  const right = MARGIN;
  const bottom = insets.bottom + HOOK_TAB_BAR_BOTTOM_GAP + HOOK_TAB_BAR_HEIGHT;

  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const bob = useSharedValue(0);
  const introduced = useRef(false);

  // Pop in with a little overshoot, shake to catch the eye, then settle into
  // a slow continuous bob — plays once per app open, the first time this
  // mounts with something pending.
  useEffect(() => {
    if (!count || introduced.current) return;
    introduced.current = true;
    scale.value = withSequence(
      withTiming(1.1, { duration: 260, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 140 }),
    );
    rotate.value = withDelay(
      260,
      withSequence(
        withTiming(-9, { duration: 70 }),
        withTiming(9, { duration: 90 }),
        withTiming(-7, { duration: 90 }),
        withTiming(6, { duration: 90 }),
        withTiming(-3, { duration: 80 }),
        withTiming(0, { duration: 80 }),
      ),
    );
    bob.value = withDelay(
      760,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [count, bob, rotate, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: withTiming(hidden ? 0 : 1, { duration: 180 }),
    transform: [
      { translateY: bob.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  if (!count || !firstOrderId || width <= 0 || height <= 0) return null;

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "auto"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      style={[{ position: "absolute", right, bottom, width: SIZE, height: SIZE, zIndex: 50 }, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${count} order${count === 1 ? "" : "s"} ${paymentDue ? "still need a replacement top-up payment" : "need your approval"}. Opens the first one.`}
        onPress={() => openApproval(firstOrderId)}
        style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 8 }}
      >
        <Image source={MASCOT} contentFit="contain" style={{ width: SIZE, height: SIZE }} />
        <View className="absolute -right-0.5 -top-0.5 h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1">
          <Text allowFontScaling={false} className="text-[11px] font-black leading-none text-white">{count > 9 ? "9+" : count}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
