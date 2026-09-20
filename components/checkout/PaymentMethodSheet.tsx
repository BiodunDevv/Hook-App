import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
      ? [{ icon: "gift-outline" as const, label: `Earn ${naira(estimatedEarnMinor)} Hook credit` }]
      : []),
    { icon: "remove-outline", label: "No POD handling fee" },
  ];

  const [showWhy, setShowWhy] = useState(false);
  const creditActive = hasCredits && useCredits;

  return (
    <CheckoutSheet visible={visible} onClose={onClose} title="How do you want to pay?" fullScreen>
      <View style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 14 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          bounces
        >
          {/* Hook credit: one compact row with its own switch. */}
          <View style={{ borderRadius: 18, backgroundColor: "#111", padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" }}>
                  <Ionicons name="wallet-outline" size={19} color="#FAFAFA" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, color: "#BDBDBD" }}>Hook credit</Text>
                  <Text style={{ fontSize: 20, color: "#FFC809", fontFamily: "NunitoSans-Bold" }}>{naira(creditBalanceMinor)}</Text>
                </View>
              </View>
              {creditActive ? (
                <View style={{ borderRadius: 999, backgroundColor: "#FFC809", paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontFamily: "NunitoSans-Bold", letterSpacing: 0.5, color: "#111" }}>AUTO ON</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 12, backgroundColor: "#262626" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "white", fontSize: 14, fontFamily: "NunitoSans-Bold" }}>
                  {creditActive ? "Applied automatically" : "Use Hook credit for this order"}
                </Text>
                <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 17, color: "#D4D4D4" }}>
                  {useCredits && creditsAppliedMinor > 0
                    ? `${naira(creditsAppliedMinor)} will reduce this order total`
                    : !hasCredits
                      ? "Earn Hook credit by referring friends"
                      : "Hook credit is paused for this order"}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Automatically apply Hook credit to this order"
                value={useCredits}
                disabled={!hasCredits}
                onValueChange={onToggleCredits}
                trackColor={{ false: "rgba(250,250,250,0.2)", true: "#FFC809" }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Pay now: selected. The card is display only; the footer button confirms. */}
          <View style={{ borderRadius: 18, borderWidth: 2, borderColor: "#FFC809", backgroundColor: "#FFF9E5", padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "#FFC809" }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#111" }} />
                </View>
                <Text style={{ fontSize: 16, fontFamily: "NunitoSans-Bold", color: "#111" }}>Pay now</Text>
              </View>
              <View style={{ backgroundColor: "#FFC809", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontFamily: "NunitoSans-Bold", letterSpacing: 0.6, color: "#111" }}>RECOMMENDED</Text>
              </View>
            </View>
            <Text style={{ fontSize: 28, fontFamily: "NunitoSans-Black", color: "#111" }}>{naira(payNowTotalMinor)}</Text>

            <View style={{ gap: 10 }}>
              {payNowBenefits.map((benefit) => (
                <View key={benefit.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1B8" }}>
                    <Ionicons name={benefit.icon} size={15} color="#8A6900" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "#111" }}>{benefit.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showWhy }}
              onPress={() => setShowWhy((current) => !current)}
              style={{ borderRadius: 14, backgroundColor: "white", borderWidth: 1, borderColor: "#EEE", paddingHorizontal: 14, paddingVertical: 12 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, fontFamily: "NunitoSans-Bold", color: "#111" }}>Why pay now?</Text>
                <Ionicons name={showWhy ? "chevron-up" : "chevron-down"} size={18} color="#666" />
              </View>
              {showWhy ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {WHY_PAY_NOW.map((reason) => (
                    <View key={reason} style={{ flexDirection: "row", gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#30B940" style={{ marginTop: 2 }} />
                      <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "#555" }}>{reason}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          </View>

          {/* Kept visible but inert while POD is paused, so returning customers
              can see the option still exists rather than wondering where it went. */}
          <View accessible accessibilityLabel="Pay on delivery is currently unavailable" accessibilityState={{ disabled: true }} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#DDD", padding: 16, gap: 8, opacity: 0.7 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#666" }} />
              <Text style={{ fontSize: 16, fontFamily: "NunitoSans-Bold", color: "#111" }}>Pay on delivery</Text>
            </View>
            <Text style={{ fontSize: 22, fontFamily: "NunitoSans-Black", color: "#666" }}>{naira(podTotalMinor)}</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: "#666" }}>
              {podPaused ? "Temporarily paused. Please pay now to place this order." : "Currently unavailable in this checkout. Please choose Pay now."}
            </Text>
          </View>
        </ScrollView>

        {/* Always visible: the decision never scrolls out of reach. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: "#E6E6E9", backgroundColor: "#F1F1F3" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pay ${naira(payNowTotalMinor)} now`}
            onPress={onChoosePayNow}
            style={({ pressed }) => ({ height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: "#FFC809", opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontSize: 16, fontFamily: "NunitoSans-Bold", color: "#111" }}>Continue with Pay now · {naira(payNowTotalMinor)}</Text>
          </Pressable>
        </View>
      </View>
    </CheckoutSheet>
  );
}
