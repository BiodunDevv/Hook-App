import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PaymentSuccess } from "@/components/payments/PaymentSuccess";
import { ProcessingPayment } from "@/components/payments/ProcessingPayment";
import { usePaymentStatusQuery } from "@/lib/mobile-api";

export default function PaymentStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const query = usePaymentStatusQuery(id);
  const data = query.data as any;
  const status = String(data?.payment?.status || "").toUpperCase();
  const { refetch } = query;

  useEffect(() => {
    if (!id || ["CONFIRMED", "FAILED", "REFUNDED"].includes(status)) return;
    const timer = setInterval(() => void refetch(), 2000);
    return () => clearInterval(timer);
  }, [id, refetch, status]);

  // The route param may be a payment id, so navigate with the order id the
  // status response returns. Passing the param through sent customers to an
  // order that did not exist.
  const orderId = data?.order?.id;
  const openOrder = () =>
    router.replace(
      orderId ? ({ pathname: "/orders/[id]", params: { id: orderId } } as never) : ("/orders" as never),
    );

  if (query.isLoading || (!query.isError && !status) || status === "PROCESSING" || status === "PENDING") {
    return <ProcessingPayment />;
  }

  if (status === "CONFIRMED") {
    return (
      <PaymentSuccess
        orderId={orderId}
        amountMinor={data?.order?.totalMinor ?? data?.payment?.amountMinor}
        earnedMinor={data?.order?.creditsEarnedMinor}
        estimatedDeliveryAt={data?.order?.estimatedDeliveryAt}
        onTrackOrder={openOrder}
        onGoHome={() => router.replace("/(tabs)" as never)}
      />
    );
  }

  const failed = status === "FAILED" || status === "REFUNDED";
  return (
    <View
      className="flex-1 items-center justify-center bg-[#f4f4f5] px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-2xl font-black">{failed ? "Payment failed" : "Payment processing"}</Text>
      <Text className="mt-3 text-center text-sm leading-5 text-[#777]">
        {failed
          ? "We could not confirm this payment. Nothing was taken from your account, and you can try again from your order."
          : "We only confirm payments after verified evidence from the selected provider."}
      </Text>
      <Pressable onPress={openOrder} className="mt-6 rounded-full bg-hook px-6 py-3">
        <Text className="font-black">View Order</Text>
      </Pressable>
    </View>
  );
}
