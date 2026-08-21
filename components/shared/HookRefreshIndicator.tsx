import { ActivityIndicator, View } from "react-native";

type HookRefreshIndicatorProps = {
  visible: boolean;
  top: number;
};

export function HookRefreshIndicator({
  visible,
  top,
}: HookRefreshIndicatorProps) {
  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        zIndex: 100,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 17,
          backgroundColor: "#FFFFFF",
          shadowColor: "#111111",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.14,
          shadowRadius: 8,
          elevation: 12,
        }}
      >
        <ActivityIndicator size="small" color="#FFC809" />
      </View>
    </View>
  );
}
