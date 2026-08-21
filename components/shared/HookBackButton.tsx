import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";

type HookBackButtonProps = {
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function HookBackButton({ onPress, className = "", style }: HookBackButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      className={`h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm ${className}`}
      style={style}
      onPress={onPress || (() => router.back())}
    >
      <Ionicons name="chevron-back" size={21} color="#111" />
    </Pressable>
  );
}
