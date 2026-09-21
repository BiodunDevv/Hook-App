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
  stateName,
  method,
  onSelectMethod,
  podAvailable,
  podUnavailableReason,
  podPayNowMinor,
  podAtDoorMinor,
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
  stateName?: string;
  method: "PREPAID" | "PAY_AT_HANDOVER";
  onSelectMethod: (method: "PREPAID" | "PAY_AT_HANDOVER") => void;
  podAvailable: boolean;
  /** Why Pay on Delivery cannot be chosen right now (shown on the card). */
  podUnavailableReason?: string;
  podPayNowMinor: number;
  podAtDoorMinor: number;
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
    { icon: "remove-outline", label: "No pay-on-delivery charge" },
  ];

  const [showWhy, setShowWhy] = useState(false);
  const creditActive = hasCredits && useCredits && method === "PREPAID";

  return (
    <CheckoutSheet visible={visible} onClose={onClose} title="How do you want to pay?" fullScreen>
      <View style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 14 }}
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
                  {method === "PAY_AT_HANDOVER" && hasCredits
                    ? "Hook credit is used when you pay now, not on Pay on Delivery"
                    : useCredits && creditsAppliedMinor > 0
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
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: method === "PREPAID" }} onPress={() => { onSelectMethod("PREPAID"); onChoosePayNow(); }} style={{ borderRadius: 18, borderWidth: 2, borderColor: method === "PREPAID" ? "#FFC809" : "#DDD", backgroundColor: method === "PREPAID" ? "#FFF9E5" : "white", padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: method === "PREPAID" ? 0 : 1.5, borderColor: "#999", backgroundColor: method === "PREPAID" ? "#FFC809" : "transparent" }}>
                  {method === "PREPAID" ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#111" }} /> : null}
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
          </Pressable>

          {/* Pay on delivery: same design as Pay now. The big figure is what is paid online now. */}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: method === "PAY_AT_HANDOVER", disabled: !podAvailable }}
            disabled={!podAvailable}
            onPress={() => { onSelectMethod("PAY_AT_HANDOVER"); onChoosePayNow(); }}
            style={{ borderRadius: 18, borderWidth: 2, borderColor: method === "PAY_AT_HANDOVER" ? "#FFC809" : "#DDD", backgroundColor: method === "PAY_AT_HANDOVER" ? "#FFF9E5" : "white", padding: 16, gap: 14, opacity: podAvailable ? 1 : 0.7 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: method === "PAY_AT_HANDOVER" ? 0 : 1.5, borderColor: "#999", backgroundColor: method === "PAY_AT_HANDOVER" ? "#FFC809" : "transparent" }}>
                  {method === "PAY_AT_HANDOVER" ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#111" }} /> : null}
                </View>
                <Text style={{ fontSize: 16, fontFamily: "NunitoSans-Bold", color: "#111" }}>Pay on delivery</Text>
              </View>
              <View style={{ backgroundColor: podAvailable ? "#E6F7E9" : "#EEE", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontFamily: "NunitoSans-Bold", letterSpacing: 0.6, color: podAvailable ? "#1E7A2E" : "#666" }}>
                  {podAvailable ? (stateName ? `AVAILABLE IN ${stateName.toUpperCase()}` : "AVAILABLE") : "NOT AVAILABLE"}
                </Text>
              </View>
            </View>

            {podAvailable ? (
              <>
                <View>
                  <Text style={{ fontSize: 28, fontFamily: "NunitoSans-Black", color: "#111" }}>{naira(podPayNowMinor)}<Text style={{ fontSize: 14, fontFamily: "NunitoSans-Bold", color: "#666" }}>  now</Text></Text>
                  <Text style={{ marginTop: 2, fontSize: 14, color: "#555" }}>then {naira(podAtDoorMinor)} when it arrives</Text>
                </View>
                <View style={{ gap: 10 }}>
                  {([
                    { icon: "bicycle-outline", label: "Pay the delivery fee now to start your order" },
                    { icon: "card-outline", label: "Pay the rest securely with a link at the door" },
                    { icon: "alert-circle-outline", label: "Delivery fee isn't refunded if you refuse the parcel" },
                  ] as { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[]).map((benefit) => (
                    <View key={benefit.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1B8" }}>
                        <Ionicons name={benefit.icon} size={15} color="#8A6900" />
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "#111" }}>{benefit.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Ionicons name="information-circle-outline" size={18} color="#777" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "#666" }}>
                  {podPaused ? "Temporarily paused. Please pay now to place this order." : podUnavailableReason || "Not available for this order. Please choose Pay now."}
                </Text>
              </View>
            )}
          </Pressable>
        </ScrollView>

      </View>
    </CheckoutSheet>
  );
}
