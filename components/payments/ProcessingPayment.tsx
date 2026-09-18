import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The full-bleed dark "Processing Payment" state (Figma 2679:20698).
 *
 * Deliberately not HookLoader: this is a full-screen takeover on a dark ground
 * rather than an inline spinner, and it is the only thing the customer sees
 * while we poll the provider.
 */
export function ProcessingPayment({ label = "Processing Payment", detail = "Securely connecting to your bank…" }: { label?: string; detail?: string }) {
  const insets = useSafeAreaInsets();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // useNativeDriver keeps the ring turning on the UI thread, so it does not
    // stutter while the status poll resolves on the JS thread.
    const animation = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111111",
        paddingHorizontal: 32,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Animated.View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          borderWidth: 4,
          borderColor: "rgba(250,250,250,0.15)",
          // One coloured arc on an otherwise faint ring reads as motion.
          borderTopColor: "#FFC809",
          transform: [{ rotate }],
        }}
      />
      <Text style={{ marginTop: 28, fontSize: 24, fontFamily: "NunitoSans-Black", color: "#FAFAFA", textAlign: "center" }}>
        {label}
      </Text>
      <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 24, color: "rgba(250,250,250,0.7)", textAlign: "center" }}>
        {detail}
      </Text>
    </View>
  );
}
