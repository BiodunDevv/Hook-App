import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { SPRING_PRESS_IN, SPRING_PRESS_OUT } from "@/constants/motion";

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  /** How far it shrinks while pressed. */
  scale?: number;
  /** Style of the outer wrapper (flex, margins). */
  style?: StyleProp<ViewStyle>;
  /** Style of the tappable area itself. */
  innerStyle?: StyleProp<ViewStyle>;
  className?: string;
  innerClassName?: string;
};

/** A pressable that gives a quick spring shrink under the finger; use for cards and large tap targets. */
export function PressScale({ children, scale = 0.97, style, className, innerStyle, innerClassName, onPressIn, onPressOut, ...rest }: Props) {
  const reduced = useReducedMotion();
  const value = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: value.value }] }));
  return (
    <Animated.View style={[animated, style]} className={className}>
      <Pressable
        {...rest}
        style={innerStyle}
        className={innerClassName}
        onPressIn={(event) => {
          if (!reduced) value.value = withSpring(scale, SPRING_PRESS_IN);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          value.value = withSpring(1, SPRING_PRESS_OUT);
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
