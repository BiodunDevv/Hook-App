import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { useBannersQuery, type PublicBanner } from "@/lib/mobile-api";

const TONES: Record<string, { bg: string; fg: string }> = {
  gold: { bg: "#FFC809", fg: "#111111" },
  dark: { bg: "#18181B", fg: "#FFFFFF" },
  green: { bg: "#059669", fg: "#FFFFFF" },
  red: { bg: "#DC2626", fg: "#FFFFFF" },
};
const SPEED = 42; // points per second

function open(banner: PublicBanner) {
  if (!banner.linkTarget || banner.linkType === "none") return;
  if (banner.linkType === "category") router.push({ pathname: "/shop/[categoryId]", params: { categoryId: banner.linkTarget } } as never);
  else if (banner.linkType === "product") router.push({ pathname: "/products/[id]", params: { id: banner.linkTarget } } as never);
  else if (banner.linkType === "market") router.push({ pathname: "/markets/[id]", params: { id: banner.linkTarget } } as never);
}

/** Slim scrolling strip of admin-managed messages. Static when the device asks for reduced motion. */
export function MarqueeBanner({ placement = "home" }: { placement?: "home" | "category" }) {
  const query = useBannersQuery(placement);
  const banners = query.data || [];
  const [reduceMotion, setReduceMotion] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    cancelAnimation(x);
    x.value = 0;
    if (reduceMotion || !contentWidth) return;
    x.value = withRepeat(withTiming(-contentWidth, { duration: (contentWidth / SPEED) * 1000, easing: Easing.linear }), -1);
    return () => cancelAnimation(x);
  }, [contentWidth, reduceMotion, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (!banners.length) return null;
  const tone = TONES[banners[0].tone] || TONES.gold;

  const items = banners.map((banner, index) => (
    <Pressable key={`${banner.id}-${index}`} accessibilityRole={banner.linkType !== "none" ? "link" : "text"} onPress={() => open(banner)} className="flex-row items-center px-6">
      {banner.imageUrl ? (
        <View className="mr-2 h-5 w-5 overflow-hidden rounded-full bg-white/30">
          <Image source={{ uri: banner.imageUrl }} style={{ width: 20, height: 20 }} contentFit="cover" />
        </View>
      ) : (
        <View className="mr-3 h-1 w-1 rounded-full" style={{ backgroundColor: tone.fg, opacity: 0.6 }} />
      )}
      <Text numberOfLines={1} style={{ color: TONES[banner.tone]?.fg || tone.fg }} className="text-[12px] font-semibold">
        {banner.text}
      </Text>
    </Pressable>
  ));

  if (reduceMotion) {
    return (
      <View style={{ backgroundColor: tone.bg }} className="min-h-8 justify-center px-4 py-1.5" accessibilityRole="header">
        <Text style={{ color: tone.fg }} className="text-center text-[12px] font-semibold">{banners[0].text}</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: tone.bg, height: 32 }} className="justify-center overflow-hidden" accessibilityLabel={banners.map((banner) => banner.text).join(". ")}>
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", width: 20000 }, style]}>
        <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)} className="flex-row items-center">{items}</View>
        <View className="flex-row items-center">{items}</View>
        <View className="flex-row items-center">{items}</View>
        <View className="flex-row items-center">{items}</View>
      </Animated.View>
    </View>
  );
}
