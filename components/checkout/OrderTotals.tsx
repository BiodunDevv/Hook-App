import { Text, View } from "react-native";

function naira(minor: number) {
  return `₦${Math.round(Number(minor || 0) / 100).toLocaleString("en-NG")}`;
}

function Line({ label, value, muted = true }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: muted ? "#666" : "#111" }}>{label}</Text>
      <Text style={{ flexShrink: 1, textAlign: "right", fontSize: 15, lineHeight: 22, fontFamily: "NunitoSans-Bold", color: "#111" }}>{value}</Text>
    </View>
  );
}

export function OrderTotals({
  itemCount,
  subtotalMinor,
  creditsAppliedMinor,
  couponDiscountMinor,
  couponCode,
  deliveryFeeMinor,
  totalMinor,
}: {
  itemCount: number;
  subtotalMinor: number;
  creditsAppliedMinor: number;
  couponDiscountMinor: number;
  couponCode?: string;
  deliveryFeeMinor: number;
  totalMinor: number;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text className="text-xl font-black leading-7 text-[#111]">Details</Text>
      <View style={{ gap: 12 }}>
        <Line label={`Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`} value={naira(subtotalMinor)} />
        {couponDiscountMinor > 0 ? (
          <Line label={couponCode ? `Coupon (${couponCode})` : "Coupon"} value={`-${naira(couponDiscountMinor)}`} />
        ) : null}
        {creditsAppliedMinor > 0 ? (
          <Line label="Hook credit" value={`-${naira(creditsAppliedMinor)}`} />
        ) : null}
        <Line label="Delivery fee" value={deliveryFeeMinor > 0 ? naira(deliveryFeeMinor) : "—"} />
        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 16, backgroundColor: "#FFDD66", padding: 16 }}>
          <Text className="text-xl font-bold leading-6 text-black">Total</Text>
          <Text className="text-base font-bold leading-6 text-[#111]">{naira(totalMinor)}</Text>
        </View>
      </View>
    </View>
  );
}
