import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HookLoader } from "@/components/shared/HookLoader";
import { usePaymentStatusQuery } from "@/lib/mobile-api";
export default function PaymentStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const query = usePaymentStatusQuery(id);
  const status = String((query.data as any)?.payment?.status || "").toUpperCase();
  const { refetch } = query;

  useEffect(() => {
    if (!id || ["CONFIRMED", "FAILED", "REFUNDED"].includes(status)) return;
    const timer = setInterval(() => void refetch(), 2000);
    return () => clearInterval(timer);
  }, [id, refetch, status]);

  return (
    <View
      className="flex-1 items-center justify-center bg-[#f4f4f5] px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {query.isLoading ? (
        <HookLoader label="Checking payment" />
      ) : (
        <>
          <Text className="text-2xl font-black">
            {status === "CONFIRMED"
              ? "Payment successful"
              : status === "FAILED"
                ? "Payment failed"
                : "Payment processing"}
          </Text>
          <Text className="mt-3 text-center text-sm leading-5 text-[#777]">
            {status === "CONFIRMED"
              ? "Your payment was confirmed and your Order is now moving forward."
              : "We only confirm payments after verified evidence from the selected provider."}
          </Text>
          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/orders/[id]",
                params: { id },
              } as never)
            }
            className="mt-6 rounded-full bg-hook px-6 py-3"
          >
            <Text className="font-black">View Order</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
