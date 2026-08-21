import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

export type ProductLayout = "grid" | "list";

export function ProductLayoutToggle({
  value,
  onChange,
}: {
  value: ProductLayout;
  onChange: (value: ProductLayout) => void;
}) {
  return (
    <View className="h-10 flex-row rounded-full bg-white p-1">
      {(["grid", "list"] as const).map((mode) => {
        const selected = value === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="button"
            accessibilityLabel={`${mode} view`}
            accessibilityState={{ selected }}
            onPress={() => onChange(mode)}
            className={`h-8 w-8 items-center justify-center rounded-full ${selected ? "bg-black" : ""}`}
          >
            <Ionicons
              name={mode === "grid" ? "grid-outline" : "list-outline"}
              size={16}
              color={selected ? "#FFC809" : "#777"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
