import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

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

/**
 * A pressable that gives a quick spring shrink under the finger, so taps feel
 * answered immediately. Use it for cards and large tap targets.
 */
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
          if (!reduced) value.value = withSpring(scale, { damping: 16, stiffness: 400 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          value.value = withSpring(1, { damping: 14, stiffness: 300 });
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
