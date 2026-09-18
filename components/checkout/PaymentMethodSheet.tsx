import { Ionicons } from "@expo/vector-icons";
import { Pressable, Switch, Text, View } from "react-native";
import { BottomSheetScrollView as ScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckoutSheet } from "./CheckoutSheet";

function naira(minor: number) {
  return `₦${Math.round(Number(minor || 0) / 100).toLocaleString("en-NG")}`;
}

const WHY_PAY_NOW = [
  "Your item was recently verified",
  "Real product photos are shown above",
  "Hook handles sourcing for you",
  "Your payment is protected",
];

export function PaymentMethodSheet({
  visible,
  creditBalanceMinor,
  useCredits,
  creditsAppliedMinor,
  estimatedEarnMinor,
  payNowTotalMinor,
  podTotalMinor,
  podPaused,
  onToggleCredits,
  onChoosePayNow,
  onClose,
}: {
  visible: boolean;
  creditBalanceMinor: number;
  useCredits: boolean;
  creditsAppliedMinor: number;
  estimatedEarnMinor: number;
  payNowTotalMinor: number;
  podTotalMinor: number;
  podPaused: boolean;
  onToggleCredits: (next: boolean) => void;
  onChoosePayNow: () => void;
  onClose: () => void;
}) {
  const hasCredits = creditBalanceMinor > 0;
  const insets = useSafeAreaInsets();
  const payNowBenefits: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
    { icon: "shield-checkmark-outline", label: "Hook Protection" },
    { icon: "flash-outline", label: "Faster processing" },
    ...(estimatedEarnMinor > 0
      ? [{ icon: "gift-outline" as const, label: `Earn ${naira(estimatedEarnMinor)} Hook Coin` }]
      : []),
    { icon: "remove-outline", label: "No POD handling fee" },
  ];

  return (
    <CheckoutSheet visible={visible} onClose={onClose} title="How do you want to pay?" fullScreen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) + 64 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        bounces
      >
        <View style={{ borderRadius: 18, backgroundColor: "#111", padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="wallet-outline" size={20} color="#FAFAFA" />
              <Text style={{ fontSize: 15, color: "white" }}>Hook Coin</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ fontSize: 18, color: "#FFC809", fontFamily: "NunitoSans-Bold" }}>{naira(creditBalanceMinor)}</Text>
              {hasCredits && useCredits ? (
                <View style={{ borderRadius: 999, backgroundColor: "#FFC809", paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9, fontFamily: "NunitoSans-Bold", letterSpacing: 0.5, color: "#111" }}>AUTO ON</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 12, backgroundColor: "#292929" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "white", fontSize: 14, fontFamily: "NunitoSans-Bold" }}>
                {hasCredits && useCredits ? "Applied automatically" : "Use Hook Coin for this order"}
              </Text>
              {useCredits && creditsAppliedMinor > 0 ? (
                <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: "#DDD" }}>
                  {naira(creditsAppliedMinor)} will reduce this order total
                </Text>
              ) : !hasCredits ? (
                <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: "#DDD" }}>Earn Hook Coin by referring friends</Text>
              ) : (
                <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: "#DDD" }}>
                  Hook Coin is paused for this order
                </Text>
              )}
            </View>
            <Switch
              accessibilityLabel="Automatically apply Hook Coin to this order"
              value={useCredits}
              disabled={!hasCredits}
              onValueChange={onToggleCredits}
              trackColor={{ false: "rgba(250,250,250,0.2)", true: "#FFC809" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onChoosePayNow}
          className="mt-4 overflow-hidden rounded-2xl border-2 border-hook bg-[#fff9e5] p-5"
          style={{ marginTop: 16, borderRadius: 18, borderWidth: 2, borderColor: "#FFC809", backgroundColor: "#FFF9E5", padding: 20, gap: 12 }}
        >
          <View style={{ alignSelf: "flex-end", backgroundColor: "#FFC809", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text className="text-xs font-bold tracking-wide text-black">RECOMMENDED</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#FFC809" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#111" }} />
            </View>
            <Text className="text-lg font-bold text-[#111]">PAY NOW</Text>
          </View>
          <Text style={{ marginLeft: 32, fontSize: 24, fontFamily: "NunitoSans-Black", color: "#111" }}>{naira(payNowTotalMinor)}</Text>

          <View style={{ marginLeft: 32, gap: 12 }}>
            {payNowBenefits.map((benefit) => (
              <View key={benefit.label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons name={benefit.icon} size={16} color="#FFC809" />
                <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "#111" }}>{benefit.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginLeft: 32, marginTop: 8, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#EEE", padding: 16, gap: 8 }}>
            <Text className="text-sm font-bold text-[#111]">Why pay now?</Text>
            <View style={{ gap: 8 }}>
              {WHY_PAY_NOW.map((reason) => (
                <View key={reason} style={{ flexDirection: "row", gap: 8 }}>
                  <Text className="text-sm leading-5 text-[#666]">✓</Text>
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "#666" }}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>

        {/* Kept visible but inert while POD is paused, so returning customers
            can see the option still exists rather than wondering where it went. */}
        <View accessible accessibilityLabel="Pay on delivery is currently unavailable" accessibilityState={{ disabled: true }} style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: "#DDD", padding: 20, gap: 12, opacity: 0.7 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#666" }} />
            <Text className="text-lg font-bold text-[#111]">PAY ON DELIVERY</Text>
          </View>
          <Text style={{ marginLeft: 32, fontSize: 24, fontFamily: "NunitoSans-Black", color: "#666" }}>{naira(podTotalMinor)}</Text>
          <Text style={{ marginLeft: 32, fontSize: 14, lineHeight: 21, color: "#666" }}>
            {podPaused ? "Temporarily paused. Please pay now to place this order." : "Currently unavailable in this checkout. Please choose Pay Now."}
          </Text>
        </View>
      </ScrollView>
    </CheckoutSheet>
  );
}
