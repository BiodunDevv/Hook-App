import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SPRING_PANEL } from "@/constants/motion";

/**
 * Canonical bottom sheet shell for the whole app — same rounded top, drag
 * handle, title row, backdrop, and spring animation everywhere. Every modal
 * in the app should render through this component instead of a one-off
 * Modal so spacing and motion never drift between screens. Sheets size to
 * their content by default (no forced minHeight) so a short confirmation
 * doesn't leave dead space under its buttons.
 */

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
  const reducedMotion = useReducedMotion();
  const canDismiss = dismissible && !busy;
  // The Modal stays mounted while the sheet slides away, so closing animates as smoothly as opening.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  // The close animation finishes on another thread. If the sheet was reopened meanwhile, the late "unmount" must be ignored,
  // otherwise the sheet vanishes while the screen believes it is open and nothing can be tapped.
  const wantsOpen = useRef(visible);
  wantsOpen.current = visible;
  const finishClose = useCallback(() => {
    if (!wantsOpen.current) setMounted(false);
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reducedMotion ? withTiming(1, { duration: 120 }) : withSpring(1, SPRING_PANEL);
    } else {
      // A keyboard left open by the search field would otherwise stay up over the screen behind.
      Keyboard.dismiss();
      progress.value = withTiming(0, { duration: reducedMotion ? 100 : 240, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finishClose)();
      });
    }
  }, [visible, reducedMotion, progress, finishClose]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0, 1]) }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [reducedMotion ? 0 : 520, 0]) }],
  }));

  function handleClose() {
    if (canDismiss) onClose();
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
      // Without this Android leaves the system navigation bar area uncovered, so the sheet floats above a strip of the screen behind it.
      navigationBarTranslucent
      transparent
      visible={mounted}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        style={{ flex: 1 }}
      >
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.45)" }, backdropStyle]} />
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          disabled={!canDismiss}
          onPress={handleClose}
        />
        <Animated.View
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityViewIsModal
          className="w-full self-end rounded-t-[28px] bg-[#F1F1F3] px-5 pt-3"
          style={[sheetStyle, {
            width: "100%", borderTopLeftRadius: 28, borderTopRightRadius: 28,
            backgroundColor: "#F1F1F3", paddingHorizontal: 20, paddingTop: 12,
            marginTop: "auto",
            ...(height ? { height } : minHeight ? { minHeight } : null),
            maxHeight,
            paddingBottom: Math.max(insets.bottom, 20),
          }]}
        >
          <View style={{ height: 4, width: 40, alignSelf: "center", borderRadius: 2, backgroundColor: "#CCC", marginBottom: 12 }} />

          {title ? (
            <View style={{ minHeight: 44, justifyContent: "center", paddingRight: 44 }}>
              <Text style={{ fontSize: 20, fontFamily: "NunitoSans-Black", color: "#111" }}>
                {title}
              </Text>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                className="absolute right-0 h-9 w-9 items-center justify-center rounded-full bg-black/5"
                style={{ position: "absolute", right: 0, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#E5E5E8" }}
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

          <View style={{ flexShrink: 1, marginTop: title || message ? 16 : 4 }} className={contentClassName}>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
