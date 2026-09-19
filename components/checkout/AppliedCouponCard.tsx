import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/constants/design-tokens";

export function AppliedCouponCard({ code, discountMinor, appliesToDelivery, onRemove }: {
  code: string;
  discountMinor: number;
  appliesToDelivery: boolean;
  onRemove: () => void;
}) {
  const savings = `₦${(Math.max(0, discountMinor) / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <View style={styles.icon}><Ionicons name="ticket-outline" size={22} color={designTokens.color.ink} /></View>
        <View style={styles.copy}>
          <Text style={styles.code}>{code}</Text>
          <View style={styles.status}><Ionicons name="checkmark-circle" size={14} color="#247044" /><Text style={styles.statusText}>Coupon applied</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove coupon ${code}`} hitSlop={4} onPress={onRemove} style={styles.remove}>
          <Ionicons name="close" size={20} color="#666" />
        </Pressable>
      </View>
      <View style={styles.savings}>
        <Text style={styles.caption}>{appliesToDelivery ? "Delivery savings" : "Order savings"}</Text>
        <Text style={styles.amount}>{savings}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, borderColor: "#F0D779", backgroundColor: "#FFFBEF", padding: 16, gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFECAB", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 4 },
  code: { fontSize: 15, fontFamily: "NunitoSans-Bold", color: "#111" },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusText: { fontSize: 12, color: "#247044" },
  remove: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  savings: { borderTopWidth: 1, borderTopColor: "#EEE3BD", paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  caption: { flex: 1, fontSize: 13, color: "#666" },
  amount: { fontSize: 16, fontFamily: "NunitoSans-Bold", color: "#111" },
});
