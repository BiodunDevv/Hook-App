import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const checkBadge = require("@/assets/images/rewards/check-badge.png");
const hookCoin = require("@/assets/images/rewards/hook-coin.png");

function naira(minor?: number) {
  return `₦${Math.round(Number(minor || 0) / 100).toLocaleString("en-NG")}`;
}

function shortDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * The celebratory success screen (Figma 2657:20471).
 *
 * The earned-coin card is rendered only when the order actually earned
 * something — admin can set the earn rate to zero, and a card reading
 * "You earned ₦0" would be worse than no card at all.
 */
export function PaymentSuccess({
  orderId,
  amountMinor,
  earnedMinor,
  estimatedDeliveryAt,
  onTrackOrder,
  onGoHome,
}: {
  orderId?: string;
  amountMinor?: number;
  earnedMinor?: number;
  estimatedDeliveryAt?: string;
  onTrackOrder: () => void;
  onGoHome: () => void;
}) {
  const insets = useSafeAreaInsets();
  const eta = shortDate(estimatedDeliveryAt);
  const earned = Number(earnedMinor || 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#F1F1F3" }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 22,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Image source={checkBadge} style={{ width: 105, height: 111 }} resizeMode="contain" />

        <Text style={{ marginTop: 22, fontSize: 24, fontFamily: "NunitoSans-Black", color: "#111111" }}>
          Payment successful
        </Text>
        <Text style={{ marginTop: 6, fontSize: 15, color: "#666666" }}>We&apos;ve got your order.</Text>

        <View style={{ marginTop: 26, width: "100%", borderRadius: 20, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
          <View style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ fontSize: 14, color: "#777777" }}>Order</Text>
              <Text style={{ flexShrink: 1, textAlign: "right", fontSize: 14, fontFamily: "NunitoSans-Bold", color: "#111111" }}>
                {orderId || "—"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ fontSize: 14, color: "#777777" }}>Amount paid</Text>
              <Text style={{ fontSize: 16, fontFamily: "NunitoSans-Black", color: "#111111" }}>{naira(amountMinor)}</Text>
            </View>
          </View>
          {eta ? (
            <View style={{ backgroundColor: "#F1F1F3", paddingHorizontal: 18, paddingVertical: 12 }}>
              <Text style={{ fontSize: 13, color: "#555555" }}>
                Est. Delivery <Text style={{ fontFamily: "NunitoSans-Bold", color: "#111111" }}>{eta}</Text>
              </Text>
            </View>
          ) : null}
        </View>

        {earned > 0 ? (
          <View
            style={{
              marginTop: 14,
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 20,
              backgroundColor: "#FFF8E1",
              padding: 16,
            }}
          >
            <Image source={hookCoin} style={{ width: 38, height: 38 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: "NunitoSans-Black", color: "#111111" }}>
                You earned {naira(earned)} Hook Coin
              </Text>
              <Text style={{ marginTop: 2, fontSize: 13, color: "#6B5A18" }}>Spend it on your next order.</Text>
            </View>
          </View>
        ) : null}

        <Text style={{ marginTop: 18, textAlign: "center", fontSize: 13, lineHeight: 20, color: "#777777" }}>
          Hook is sourcing your items. We&apos;ll keep you posted at every step.
        </Text>

        <View style={{ marginTop: 24, width: "100%", flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={onGoHome}
            style={{ flex: 1, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 26, backgroundColor: "#F1F1F3", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}
          >
            <Text style={{ fontFamily: "NunitoSans-Black", color: "#111111" }}>Back to Home</Text>
          </Pressable>
          <Pressable
            onPress={onTrackOrder}
            style={{ flex: 1, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 26, backgroundColor: "#FFC809" }}
          >
            <Text style={{ fontFamily: "NunitoSans-Black", color: "#111111" }}>Track Order</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
