import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import passwordIcon from "@/assets/images/auth/password.png";
import { AuthGlowBackground } from "@/components/shared/glow-background";
import { GlassButton } from "@/components/shared/GlassButton";
import { Button } from "@/components/ui/button";

export function AuthScreenShell({
  children,
  description,
  footer,
  icon = passwordIcon,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  footer?: ReactNode;
  icon?: number;
  title: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <AuthGlowBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="px-4" style={{ paddingTop: insets.top + 8 }}>
            <AuthBackButton />
          </View>

          <View className="flex-1 px-4 pb-4 pt-[45px]">
            <Image
              source={icon}
              resizeMode="contain"
              style={{ height: 49, width: 49 }}
            />

            <View className="mt-[34px] gap-1.5">
              <Text className="text-[28px] font-bold leading-9 text-black">
                {title}
              </Text>
              <Text className="text-base leading-[22px] text-hook-text">
                {description}
              </Text>
            </View>

            <View className="mt-[34px]">{children}</View>
          </View>

          {footer ? (
            <View
              className="px-4"
              style={{ paddingBottom: insets.bottom + 20 }}
            >
              {footer}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function AuthBackButton({ onPress }: { onPress?: () => void }) {
  return (
    <GlassButton
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={8}
      className="h-[49px] w-[49px] items-center justify-center"
      onPress={onPress || (() => router.back())}
    >
      <Ionicons name="chevron-back" size={22} color="#000000" />
    </GlassButton>
  );
}

export function AuthPrimaryButton({
  disabled,
  label,
  loading,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const isDisabled = disabled || loading;
  return <Button title={label} disabled={isDisabled} loading={loading} onPress={onPress} />;
}
