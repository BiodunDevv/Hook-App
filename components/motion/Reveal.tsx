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

/** Fades and rises content into place on first appearance; does nothing when reduced motion is requested. */
export function Reveal({ children, index = 0, delay = 0, from = "bottom", style, className }: RevealProps) {
  const reduced = useReducedMotion();
  const wait = delay + Math.min(index, MAX_STAGGER) * STEP;
  const entering = reduced
    ? undefined
    : from === "top"
      ? FadeInUp.delay(wait).duration(340)
      : from === "none"
        ? FadeIn.delay(wait).duration(320)
        // Fixed timing curve, not a spring, so a grid of cards settles cleanly without visible jiggle.
        : FadeInDown.delay(wait).duration(260);
  return (
    <Animated.View entering={entering} style={style} className={className}>
      {children}
    </Animated.View>
  );
}
