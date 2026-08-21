import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type GlassButtonProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Shared translucent Hook control used over glow and image surfaces. */
export function GlassButton({
  children,
  className,
  style,
  ...props
}: GlassButtonProps) {
  return (
    <Pressable
      {...props}
      className={`rounded-full border border-black/10 bg-white/25 ${className || ""}`}
      style={style}
    >
      {children}
    </Pressable>
  );
}
