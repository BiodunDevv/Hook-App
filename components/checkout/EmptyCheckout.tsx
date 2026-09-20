import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { HookPageHeader } from "@/components/shared/HookPageHeader";

/**
 * Shown at checkout only when the cart is truly empty (after any guest-cart
 * merge has finished). Keeps the same fixed header as the rest of checkout.
 */
export function EmptyCheckout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#F1F1F3", paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        <HookPageHeader title="Checkout" centered />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: Math.max(insets.bottom, 12) + 48 }}>
        <View style={{ height: 96, width: 96, alignItems: "center", justifyContent: "center", borderRadius: 28, backgroundColor: "white" }}>
          <Ionicons name="bag-handle-outline" size={42} color="#B0B0B3" />
          <View style={{ position: "absolute", right: -4, top: -4, height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#FFC809" }}>
            <Ionicons name="add" size={18} color="#111" />
          </View>
        </View>
        <Text className="mt-6 text-[22px] font-black text-black">Your cart is empty</Text>
        <Text className="mt-2 text-center text-[14px] leading-5 text-[#77777B]">
          Add something you love from Hook Markets and it will be ready to check out here.
        </Text>
        <Button title="Discover products" onPress={() => router.replace("/(tabs)/discover")} className="mt-7 w-full" />
        <Text onPress={() => router.replace("/(app)/cart")} className="mt-4 text-[14px] font-bold text-[#111]">
          View my cart
        </Text>
      </View>
    </View>
  );
}
