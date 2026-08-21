import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";

type MarketplaceSearchProps = React.ComponentProps<typeof TextInput> & {
  iconPosition?: "left" | "right";
  onClear?: () => void;
};

export function MarketplaceSearch({
  iconPosition = "left",
  style,
  className,
  onClear,
  ...props
}: MarketplaceSearchProps) {
  const input = (
    <TextInput
      {...props}
      placeholderTextColor="#B0B0B5"
      className={`flex-1 text-[15px] text-black ${className || ""}`}
      style={[{ fontFamily: "NunitoSans-Regular" }, style]}
    />
  );
  const showClear = Boolean(onClear && typeof props.value === "string" && props.value.length > 0);

  return (
    <View className="h-[50px] flex-row items-center rounded-[20px] bg-white px-4">
      {iconPosition === "left" ? (
        <Ionicons name="search" size={20} color="#98989D" />
      ) : null}
      {input}
      {showClear ? (
        <Pressable accessibilityLabel="Clear search" onPress={onClear} className="ml-2">
          <Ionicons name="close-circle" size={19} color="#98989D" />
        </Pressable>
      ) : null}
      {iconPosition === "right" ? (
        <Ionicons name="search" size={20} color="#98989D" />
      ) : null}
    </View>
  );
}
