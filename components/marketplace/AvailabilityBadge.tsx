import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

/**
 * "Today" / "Yesterday" / "N days ago" / a plain date once it's far enough back to stop being
 * reassuring as a relative count. A product with no recorded re-check yet still falls back to
 * a plain "Available" — every product listed on the app has already been through Hook's
 * commercial approval, so that claim holds even before its first Market Associate re-check.
 */
export function availabilityLabel(value?: string | null) {
  if (!value) return "Available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Available";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Verified today";
  if (days === 1) return "Verified yesterday";
  if (days < 14) return `Verified ${days} days ago`;
  return `Verified ${date.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`;
}

/** A compact pill, same family as the out-of-stock/low-stock pills beside it — sits inline with the price, not a separate row. */
export function AvailabilityBadge({ verifiedAt }: { verifiedAt?: string | null }) {
  return (
    <View style={styles.pill}>
      <Ionicons name="checkmark-circle" size={13} color="#1f8a4c" />
      <Text style={styles.text}>{availabilityLabel(verifiedAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#E8F5EC",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: { fontSize: 11, fontFamily: "NunitoSans-Bold", color: "#1f8a4c" },
});
