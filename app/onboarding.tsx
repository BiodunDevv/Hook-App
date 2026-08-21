import { router } from "expo-router";
import { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BackButton,
  NextButton,
  PaginationDots,
  SkipButton,
} from "@/components/onboarding/controls";
import {
  DESIGN_WIDTH,
  ONBOARDING_SLIDES,
} from "@/components/onboarding/data";
import { OnboardingVisual } from "@/components/onboarding/visuals";
import { AuthGlowBackground } from "@/components/shared/glow-background";
import { setOnboardingComplete } from "@/lib/session";

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const activeSlide = ONBOARDING_SLIDES[activeIndex];
  const compact = height < 700;
  const horizontalPadding = Math.max(16, Math.min(24, width * 0.05));
  const contentHeight = compact ? 210 : 230;
  const availableVisualHeight = Math.max(
    280,
    height - insets.top - insets.bottom - contentHeight,
  );
  const scale = Math.min(width / DESIGN_WIDTH, availableVisualHeight / 590, 1.08);
  const visualWidth = DESIGN_WIDTH * scale;
  const visualHeight = 590 * scale;

  const finishOnboarding = async () => {
    await setOnboardingComplete(true);
    router.replace("/(tabs)");
  };

  const goNext = () => {
    if (activeIndex === ONBOARDING_SLIDES.length - 1) {
      finishOnboarding();
      return;
    }

    setActiveIndex((index) => index + 1);
  };

  return (
    <View
      className="flex-1 overflow-hidden bg-hook-surface"
      style={{ paddingBottom: Math.max(insets.bottom, 12), paddingTop: insets.top }}
    >
      <AuthGlowBackground />
      <View className="flex-1 items-center justify-end overflow-hidden">
        <View style={{ height: visualHeight, width: visualWidth }}>
          <OnboardingVisual activeIndex={activeIndex} scale={scale} />
        </View>
      </View>

      <View
        className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between"
        style={{ paddingHorizontal: horizontalPadding, paddingTop: insets.top + 10 }}
      >
        <View className="h-9 w-9">
          {activeIndex > 0 && (
            <BackButton onPress={() => setActiveIndex((index) => index - 1)} />
          )}
        </View>
        <SkipButton onPress={finishOnboarding} />
      </View>

      <View
        className="shrink-0"
        style={{
          height: contentHeight,
          paddingHorizontal: horizontalPadding,
          paddingTop: compact ? 4 : 10,
        }}
      >
        <PaginationDots activeIndex={activeIndex} />
        <View className={compact ? "mt-3" : "mt-4"}>
          <Text className="font-bold text-[30px] leading-9 text-black">
            {activeSlide.title}
          </Text>
          <Text className="mt-1 font-medium text-[15px] leading-5 text-hook-text">
            {activeSlide.description}
          </Text>
        </View>
        <View className="mt-auto pt-3">
          <NextButton
            isLast={activeIndex === ONBOARDING_SLIDES.length - 1}
            onPress={goNext}
          />
        </View>
      </View>
    </View>
  );
}
