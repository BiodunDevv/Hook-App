import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { HookLoader } from "@/components/shared/HookLoader";

/**
 * The white pill used for every picker on the checkout screen. Empty shows a
 * placeholder and a chevron; filled shows the chosen value and a gold
 * "Change" chip, matching the design's two states.
 */
export function CheckoutRow({
  placeholder,
  value,
  onPress,
  disabled,
  loading = false,
}: {
  placeholder: string;
  value?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading ? "Loading delivery options" : value ? `${placeholder}: ${value}` : placeholder}
      disabled={disabled}
      accessibilityState={{ disabled: Boolean(disabled), busy: loading }}
      onPress={onPress}
      style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 12, gap: 12, opacity: disabled ? 0.6 : 1 }}
    >
      <Text
        style={{ flex: 1, fontSize: 15, lineHeight: 21, color: "#111" }}
      >
        {loading ? value ? `${value} · Updating…` : "Loading delivery options…" : value || placeholder}
      </Text>
      {loading ? <HookLoader size="button" /> : value ? (
        <View style={{ borderRadius: 8, backgroundColor: "#FFDD66", padding: 8 }}>
          <Text className="text-xs text-[#3a3a3a]">Change</Text>
        </View>
      ) : (
        <Ionicons name="chevron-down" size={18} color="#3a3a3a" />
      )}
    </Pressable>
  );
}
