import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

export function SkipButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Button
      accessibilityLabel="Skip onboarding"
      accessibilityRole="button"
      className="h-9 min-w-16"
      size="auto"
      style={{
        shadowColor: "rgba(0,0,0,0.25)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      }}
      variant="blurredPill"
      onPress={onPress}
    >
      <Text className="font-semibold text-sm text-black">
        Skip
      </Text>
    </Button>
  );
}

export function BackButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Button
      accessibilityLabel="Go back"
      accessibilityRole="button"
      className="h-9 w-9"
      size="auto"
      style={{
        shadowColor: "rgba(0,0,0,0.25)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      }}
      variant="blurredPill"
      onPress={onPress}
    >
      <Ionicons name="chevron-back" size={18} color="#000" />
    </Button>
  );
}

export function PaginationDots({
  activeIndex,
}: {
  activeIndex: number;
}) {
  return (
    <View
      className="flex-row items-center gap-2"
    >
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={{
            backgroundColor: index === activeIndex ? "#FFC809" : "#fff",
            borderRadius: 6,
            height: 10,
            width: index === activeIndex ? 24 : 10,
          }}
        />
      ))}
    </View>
  );
}

export function NextButton({
  isLast,
  onPress,
}: {
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      accessibilityLabel={isLast ? "Get started" : "Next onboarding screen"}
      accessibilityRole="button"
      className="h-14 w-full flex-row rounded-full bg-[#111111] px-0"
      style={{
        backgroundColor: "#111111",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 9,
      }}
      variant="ghost"
      onPress={onPress}
    >
      <View
        className="absolute items-center justify-center rounded-full bg-hook"
        style={{ backgroundColor: "#FFC809", height: 50, left: 3, width: 50 }}
      >
        <Ionicons
          name="checkmark"
          size={34}
          color="black"
        />
      </View>

      <Text className="font-semibold text-base text-white">
        {isLast ? "Get Started" : "Next"}
      </Text>

      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          position: "absolute",
          right: 16,
        }}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color="rgba(255,255,255,0.28)"
        />
        <Ionicons
          name="chevron-forward"
          size={24}
          color="rgba(255,255,255,0.55)"
          style={{ marginLeft: -12 }}
        />
        <Ionicons
          name="chevron-forward"
          size={24}
          color="white"
          style={{ marginLeft: -12 }}
        />
      </View>
    </Button>
  );
}
