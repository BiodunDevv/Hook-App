import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeIn, useReducedMotion } from "react-native-reanimated";

type RevealProps = {
  children: ReactNode;
  /** Position in a list; later items start a little later so content flows in. */
  index?: number;
  /** Extra delay in ms before it starts. */
  delay?: number;
  from?: "bottom" | "top" | "none";
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const STEP = 55;
const MAX_STAGGER = 8;

/**
 * Fades and rises content into place when it first appears. Use it around
 * sections, cards and list rows so every screen reveals the same way. It
 * does nothing when the device asks for reduced motion.
 */
export function Reveal({ children, index = 0, delay = 0, from = "bottom", style, className }: RevealProps) {
  const reduced = useReducedMotion();
  const wait = delay + Math.min(index, MAX_STAGGER) * STEP;
  const entering = reduced
    ? undefined
    : from === "top"
      ? FadeInUp.delay(wait).duration(340)
      : from === "none"
        ? FadeIn.delay(wait).duration(320)
        : FadeInDown.delay(wait).duration(360).springify().damping(18).stiffness(160);
  return (
    <Animated.View entering={entering} style={style} className={className}>
      {children}
    </Animated.View>
  );
}
