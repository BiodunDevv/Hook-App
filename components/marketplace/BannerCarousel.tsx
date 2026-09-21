import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, runOnJS, useAnimatedStyle, useFrameCallback, useSharedValue, withDecay } from "react-native-reanimated";

import { haptics } from "@/lib/haptics";
import { useBannersQuery, type PublicBanner } from "@/lib/mobile-api";

const TONES: Record<string, { bg: string; fg: string }> = {
  gold: { bg: "#FFC809", fg: "#111111" },
  dark: { bg: "#18181B", fg: "#FFFFFF" },
  green: { bg: "#047857", fg: "#FFFFFF" },
  red: { bg: "#B91C1C", fg: "#FFFFFF" },
};
const HEIGHT = 44;
const SPEED = 40; // points per second while drifting on its own

function open(banner: PublicBanner) {
  if (!banner.linkTarget || banner.linkType === "none") return;
  haptics.tap();
  if (banner.linkType === "category") router.push({ pathname: "/shop/[categoryId]", params: { categoryId: banner.linkTarget } } as never);
  else if (banner.linkType === "product") router.push({ pathname: "/products/[id]", params: { id: banner.linkTarget } } as never);
  else if (banner.linkType === "market") router.push({ pathname: "/markets/[id]", params: { id: banner.linkTarget } } as never);
}

/**
 * Edge-to-edge marquee. It drifts on its own; put a finger on it and it follows
 * the finger, and on release it glides on with the swipe's momentum and eases to
 * a stop before drifting again. A tap opens the message under the finger.
 * It holds still on a single message when the device asks for reduced motion.
 */
export function BannerCarousel({ placement = "home", className = "mt-4" }: { placement?: "home" | "category"; className?: string }) {
  const query = useBannersQuery(placement);
  const banners = query.data || [];
  const [reduceMotion, setReduceMotion] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const busy = useSharedValue(false); // finger down or gliding
  const spans = useRef<Array<{ x: number; width: number } | undefined>>([]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);
  useEffect(() => {
    width.value = contentWidth;
  }, [contentWidth, width]);

  // Drift: advance a little every frame unless the finger or a glide is in control.
  useFrameCallback((frame) => {
    if (busy.value || !width.value || reduceMotion) return;
    x.value -= (SPEED * (frame.timeSincePreviousFrame ?? 16)) / 1000;
  });

  const style = useAnimatedStyle(() => {
    const w = width.value || 1;
    const wrapped = x.value % w;
    return { transform: [{ translateX: wrapped > 0 ? wrapped - w : wrapped }] };
  });

  function openAt(locationX: number) {
    if (!banners.length) return;
    if (!contentWidth) return open(banners[0]);
    const offset = reduceMotion ? 0 : x.value;
    const position = (((-offset + locationX) % contentWidth) + contentWidth) % contentWidth;
    const hit = spans.current.findIndex((span) => span && position >= span.x && position < span.x + span.width);
    open(banners[hit >= 0 ? hit : 0]);
  }

  const pan = Gesture.Pan()
    .enabled(!reduceMotion && contentWidth > 0)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      busy.value = true;
      x.value = x.value; // stops any glide in progress
    })
    .onChange((event) => {
      x.value += event.changeX;
    })
    .onEnd((event) => {
      // Momentum with friction: keeps moving with the swipe, then eases to a stop.
      x.value = withDecay({ velocity: event.velocityX, deceleration: 0.997 }, () => {
        busy.value = false;
      });
    })
    .onFinalize((_event, success) => {
      if (!success) busy.value = false;
    });
  const tap = Gesture.Tap()
    .maxDuration(300)
    .onEnd((event, success) => {
      if (success) runOnJS(openAt)(event.x);
    });
  const gesture = Gesture.Race(pan, tap);

  if (!banners.length) return null;

  const renderItems = (measure: boolean) =>
    banners.map((banner, index) => {
      const tone = TONES[banner.tone] || TONES.gold;
      return (
        <View
          key={banner.id}
          onLayout={measure ? (event) => { spans.current[index] = { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width }; } : undefined}
          style={{ flexDirection: "row", alignItems: "center", height: HEIGHT, paddingHorizontal: 24, backgroundColor: tone.bg }}
        >
          {banner.imageUrl ? (
            <Image source={{ uri: banner.imageUrl }} contentFit="cover" style={{ width: 28, height: 28, borderRadius: 14, marginRight: 10, backgroundColor: "rgba(255,255,255,0.25)" }} />
          ) : null}
          <Text numberOfLines={1} style={{ color: tone.fg, fontSize: 14, fontWeight: "800" }}>{banner.text}</Text>
        </View>
      );
    });

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      className={className}
      accessibilityRole={banners.some((banner) => banner.linkType !== "none") ? "link" : "text"}
      accessibilityLabel={banners.map((banner) => banner.text).join(". ")}
      style={{ height: HEIGHT, overflow: "hidden", justifyContent: "center", alignSelf: "stretch" }}
    >
      <GestureDetector gesture={gesture}>
        <View style={{ height: HEIGHT, justifyContent: "center" }}>
          {reduceMotion ? (
            <View style={{ flexDirection: "row" }} onLayout={(event) => { spans.current[0] = { x: 0, width: event.nativeEvent.layout.width }; }}>{renderItems(false).slice(0, 1)}</View>
          ) : (
            <Animated.View style={[{ flexDirection: "row", alignItems: "center", width: 40000 }, style]}>
              <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)} style={{ flexDirection: "row", alignItems: "center" }}>{renderItems(true)}</View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>{renderItems(false)}</View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>{renderItems(false)}</View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>{renderItems(false)}</View>
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
