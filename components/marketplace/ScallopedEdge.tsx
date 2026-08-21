import { View } from "react-native";

type ScallopedEdgeProps = {
  color: string;
  count?: number;
  size?: number;
  edge?: "top" | "bottom";
  zIndex?: number;
};

export function ScallopedEdge({
  color,
  count = 14,
  size = 30,
  edge = "bottom",
  zIndex = 0,
}: ScallopedEdgeProps) {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 flex-row justify-around"
      style={{
        height: size,
        [edge]: -size / 2,
        zIndex,
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`${color}-${index}`}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
