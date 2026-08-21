import Svg, { Path } from "react-native-svg";
import { StyleSheet, useWindowDimensions, View } from "react-native";

type HookYellowPatternProps = {
  opacity?: number;
};

export function HookYellowPattern({
  opacity = 0.78,
}: HookYellowPatternProps) {
  const { width } = useWindowDimensions();
  const spacing = 36;
  const stripeCount = Math.ceil(width / spacing) + 4;

  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <Svg
        accessibilityLabel="Hook curved yellow pattern"
        preserveAspectRatio="none"
        viewBox="0 0 420 140"
        style={StyleSheet.absoluteFill}
      >
        {Array.from({ length: stripeCount }, (_, index) => {
          const x = -46 + index * spacing;
          return (
            <Path
              key={`hook-yellow-curve-${index}`}
              d={`M ${x} 140 C ${x + 14} 104 ${x + 34} 72 ${x + 34} 0`}
              fill="none"
              stroke="#FFE68F"
              strokeLinecap="round"
              strokeWidth={8}
              opacity={opacity}
            />
          );
        })}
      </Svg>
    </View>
  );
}
