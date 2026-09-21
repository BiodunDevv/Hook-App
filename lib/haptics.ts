import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Touch feedback in one place, so it feels the same everywhere and can be
 * switched off in one line. Every call is safe to fire and forget: it never
 * throws and does nothing on devices without a haptic engine.
 *
 * Use it sparingly: a haptic should confirm something that happened (a save,
 * a choice, a failure), not decorate every tap.
 */
const run = (action: () => Promise<void>) => {
  if (Platform.OS === "web") return;
  void action().catch(() => undefined);
};

export const haptics = {
  /** A light tick for opening or tapping something (banner, card, tab). */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A soft tick as a choice changes (chip, option, quantity, switch). */
  select: () => run(() => Haptics.selectionAsync()),
  /** A firmer thump for a meaningful action (place order, confirm, remove). */
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Something worked: added to cart, saved, paid. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Something needs attention: offline, a limit reached. */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Something failed. */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
