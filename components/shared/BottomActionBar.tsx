import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookLoader } from "@/components/shared/HookLoader";
import { designTokens } from "@/constants/design-tokens";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function BottomActionBar({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, designTokens.control.bottomInset) }]}>{children}</View>;
}

export function BottomActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  busy = false,
  tone = "primary",
  icon,
  flex = 1,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  busy?: boolean;
  tone?: "primary" | "secondary";
  icon?: IconName;
  flex?: number;
}) {
  const inactive = disabled || loading || busy;
  const backgroundColor = inactive
    ? designTokens.color.disabled
    : tone === "primary"
      ? designTokens.color.brand
      : designTokens.color.surfaceMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading || busy }}
      className="active:opacity-80"
      disabled={inactive}
      onPress={onPress}
      style={[styles.button, { flex, backgroundColor }]}
    >
      {loading ? (
        <HookLoader size="button" />
      ) : (
        <>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.buttonLabel}>
            {label}
          </Text>
          {icon ? <Ionicons name={icon} size={18} color={designTokens.color.ink} style={styles.icon} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: designTokens.control.actionHeight + designTokens.spacing.sm * 2,
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.sm,
    paddingBottom: designTokens.control.bottomInset,
    backgroundColor: 'transparent',
  },
  button: {
    height: designTokens.control.actionHeight,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: designTokens.radius.control,
    paddingHorizontal: designTokens.spacing.lg,
  },
  buttonLabel: {
    color: designTokens.color.ink,
    fontFamily: designTokens.typography.buttonFont,
    fontSize: designTokens.typography.buttonSize,
    lineHeight: 20,
    textAlign: "center",
    includeFontPadding: false,
  },
  icon: { marginLeft: designTokens.spacing.sm },
});
