import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PaymentStage = "creating" | "redirecting" | "confirming";

const STAGE_COPY: Record<PaymentStage, { title: string; body: string }> = {
  creating: {
    title: "Setting up your order",
    body: "We are reserving your items and preparing a secure payment link.",
  },
  redirecting: {
    title: "Opening secure payment",
    body: "Complete your payment in the secure window. Come back here when you are done.",
  },
  confirming: {
    title: "Confirming your payment",
    body: "This usually takes a few seconds. Please keep this screen open.",
  },
};

const STEPS: { key: PaymentStage; label: string }[] = [
  { key: "creating", label: "Order created" },
  { key: "redirecting", label: "Payment authorised" },
  { key: "confirming", label: "Payment confirmed" },
];

/**
 * Shown from the moment checkout is submitted until the order screen takes
 * over. Without it the cart is already empty by this point, so the checkout
 * screen's empty-cart guard would paint "Your cart is empty" over a payment
 * that is actually in flight.
 */
export function PaymentProcessingScreen({ stage }: { stage: PaymentStage }) {
  const insets = useSafeAreaInsets();
  const spin = useRef(new Animated.Value(0)).current;
  const activeIndex = STEPS.findIndex((step) => step.key === stage);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const copy = STAGE_COPY[stage];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F1F1F3",
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            position: "absolute",
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 4,
            borderColor: "#FFC809",
            borderTopColor: "transparent",
            transform: [{ rotate }],
          }}
        />
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#111111",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="lock-closed" size={26} color="#FFC809" />
        </View>
      </View>

      <Text
        accessibilityRole="header"
        style={{ marginTop: 28, fontSize: 24, lineHeight: 32, textAlign: "center", color: "#111", fontFamily: "NunitoSans-Black" }}
      >
        {copy.title}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        style={{ marginTop: 10, maxWidth: 320, fontSize: 15, lineHeight: 22, textAlign: "center", color: "#666" }}
      >
        {copy.body}
      </Text>

      <View style={{ marginTop: 32, width: "100%", maxWidth: 320, gap: 14 }}>
        {STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <View key={step.key} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done || active ? "#FFC809" : "#E3E3E6",
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#111" />
                ) : (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: active ? "#111" : "#B5B5B8",
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: done || active ? "#111" : "#9A9A9E",
                  fontFamily: done || active ? "NunitoSans-Bold" : undefined,
                }}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 36, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#30b940" />
        <Text style={{ fontSize: 12, color: "#30b940" }}>
          Your money is protected with hook until you receive your order
        </Text>
      </View>
    </View>
  );
}
