import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

/** A static, always-expanded info row — no toggle, since every section here should just be visible. */
function InformationSection({ title, children, last = false }: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={!last && styles.divider}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Ionicons name="chevron-up" size={17} color="#111111" />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const RETURN_BADGES = ["7 days return", "Return if item damaged"];

function HookProtectionCard() {
  return (
    <View style={styles.protectionWrap}>
      <View style={styles.protectionCard}>
        <View style={styles.protectionHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#9a7400" />
          </View>
          <Text style={styles.title}>Hook Protection</Text>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={styles.body}>•  Product sourced by Hook</Text>
          <Text style={styles.body}>•  Item checked before dispatch</Text>
          <Text style={styles.body}>•  Payment protected under Hook refund policy</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        {RETURN_BADGES.map((label) => (
          <View key={label} style={styles.badge}>
            <Text style={styles.badgeText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProductInformation({ name, description }: { name: string; description?: string | null }) {
  return (
    <View>
      <InformationSection title="Description">
        <Text style={styles.body}>{description?.trim() || "Product details are not yet available. Contact Hook for more information before ordering."}</Text>
      </InformationSection>
      <InformationSection title="What you'll receive" last>
        <Text style={styles.body}>•  1x {name}</Text>
        <Text style={styles.body}>•  Original packaging</Text>
        <Text style={styles.body}>•  Hook authenticity tag</Text>
      </InformationSection>
      <HookProtectionCard />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#A7ABB2" },
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  iconBadge: { height: 26, width: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF3CC" },
  title: { flex: 1, fontSize: 16, fontFamily: "NunitoSans-SemiBold", color: "#111111" },
  content: { paddingBottom: 20, gap: 12 },
  body: { fontSize: 14, lineHeight: 24, fontFamily: "NunitoSans-Regular", color: "#66666B" },
  protectionWrap: { marginTop: 4 },
  protectionCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FFC809",
    backgroundColor: "#FFF9DB",
    padding: 16,
    gap: 14,
  },
  protectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  badge: { borderRadius: 999, backgroundColor: "#FFC809", paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { fontSize: 12, fontFamily: "NunitoSans-Bold", color: "#111111" },
});
