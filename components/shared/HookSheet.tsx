import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Canonical bottom sheet shell for the whole app — same rounded top, drag
 * handle, title row, backdrop, and spring animation everywhere. Every modal
 * in the app should render through this component instead of a one-off
 * Modal so spacing and motion never drift between screens. Sheets size to
 * their content by default (no forced minHeight) so a short confirmation
 * doesn't leave dead space under its buttons.
 */

const enterTransition = SlideInDown.springify()
  .damping(24)
  .stiffness(260)
  .mass(0.82);

const exitTransition = SlideOutDown.springify()
  .damping(26)
  .stiffness(300)
  .mass(0.86);

type HookSheetProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  dismissible?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  title?: string;
  message?: string;
  height?: number | `${number}%`;
  maxHeight?: number | `${number}%`;
  minHeight?: number | `${number}%`;
  contentClassName?: string;
}>;

export function HookSheet({
  visible,
  onClose,
  dismissible = true,
  busy = false,
  accessibilityLabel,
  title,
  message,
  height,
  maxHeight = "80%",
  minHeight,
  contentClassName,
  children,
}: HookSheetProps) {
  const insets = useSafeAreaInsets();
  const canDismiss = dismissible && !busy;

  function handleClose() {
    if (canDismiss) onClose();
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
        className="flex-1 bg-black/45"
      >
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          className="absolute inset-0"
          disabled={!canDismiss}
          onPress={handleClose}
        />
        <Animated.View
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityViewIsModal
          className="w-full self-end rounded-t-[28px] bg-[#F1F1F3] px-5 pt-3"
          entering={enterTransition}
          exiting={exitTransition}
          style={{
            marginTop: "auto",
            ...(height ? { height } : minHeight ? { minHeight } : null),
            maxHeight,
            paddingBottom: Math.max(insets.bottom, 20),
          }}
        >
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-black/15" />

          {title ? (
            <View className="min-h-9 justify-center">
              <Text className="px-10 text-center text-xl font-black text-[#111]" numberOfLines={1}>
                {title}
              </Text>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                className="absolute right-0 h-9 w-9 items-center justify-center rounded-full bg-black/5"
                disabled={!canDismiss}
                hitSlop={8}
                onPress={handleClose}
              >
                <Ionicons name="close" size={20} color="#111111" />
              </Pressable>
            </View>
          ) : null}

          {message ? (
            <Text className="mt-3 text-center text-[14px] leading-6 text-[#666]">{message}</Text>
          ) : null}

          <View className={contentClassName ?? (title || message ? "mt-5" : "mt-1")}>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
