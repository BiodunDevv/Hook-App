import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { usePendingApprovalsQuery } from "@/lib/mobile-api";

// Shown while a replacement is waiting on the customer's decision, or while an
// accepted replacement's top-up payment is still unpaid — same yellow-cream/
// hook-border language as the approval card on the order screen either way.
export function ReplacementApprovalBanner() {
  const query = usePendingApprovalsQuery();
  const items = query.data?.items || [];
  const count = query.data?.count || 0;
  const first = items[0];
  const paymentDue = first?.status === "PAYMENT_PENDING";

  if (!count || !first) return null;

  const single = paymentDue ? "A replacement top-up is still needed" : "A replacement needs your approval";
  const plural = paymentDue ? `${count} replacement top-ups are still needed` : `${count} replacements need your approval`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count === 1 ? single : plural}
      onPress={() => router.push({ pathname: "/orders/[id]", params: { id: first.orderId } } as never)}
      className="mx-4 mb-5 flex-row items-center gap-3 rounded-2xl border-2 border-hook bg-[#fff9df] p-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
        <Ionicons name={paymentDue ? "card-outline" : "swap-horizontal"} size={20} color="#111" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[13px] font-black text-black">
          {count === 1 ? single : plural}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-[12px] text-[#6b5c00]">
          {first.displayNumber || "Order"}{first.productTitle ? ` · ${first.productTitle}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#111" />
    </Pressable>
  );
}
