import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { designTokens } from "@/constants/design-tokens";

/**
 * The two-bar progress header from the checkout design: the current step's
 * bar is Hook gold, the one still ahead is white.
 */
export function CheckoutSteps({ step }: { step: 1 | 2 }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {(["Your order", "Delivery and payment"] as const).map((label, index) => {
        const active = step === index + 1;
        const complete = step > index + 1;
        return <View key={label} accessible accessibilityLabel={`${label}: ${complete ? "completed" : active ? "current step" : "next step"}`} style={{ flex: 1, padding: 12, gap: 8, borderWidth: 1.5, borderColor: active || complete ? designTokens.color.brand : "#DDD", backgroundColor: complete ? "#FFF9E5" : "white", borderRadius: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {complete ? <Ionicons name="checkmark-circle" size={18} color="#111" /> : null}
            <Text style={{ flex: 1, fontSize: 13, color: "#111" }}>{label}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: active || complete ? designTokens.color.brand : "#EEE" }} />
        </View>;
      })}
    </View>
  );
}
