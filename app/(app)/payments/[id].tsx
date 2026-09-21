import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

  // A payment can stay pending for a while (bank delay, closed browser). Keep checking, but stop showing a
  // spinner with no way out: after about a minute offer the order, and stop polling after three.
  const [waitedMs, setWaitedMs] = useState(0);
  useEffect(() => {
    if (!id || ["CONFIRMED", "FAILED", "REFUNDED"].includes(status)) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      setWaitedMs(elapsed);
      if (elapsed > 180_000) return clearInterval(timer);
      void refetch();
    }, 2000);
    return () => clearInterval(timer);
  }, [id, refetch, status]);
  const stillWaiting = waitedMs > 60_000;

  // The route param may be a payment id, so navigate with the order id the
  // status response returns. Passing the param through sent customers to an
  // order that did not exist.
  const orderId = data?.order?.id;
  const openOrder = () =>
    router.replace(
      orderId ? ({ pathname: "/orders/[id]", params: { id: orderId } } as never) : ("/orders" as never),
    );

  if (!stillWaiting && (query.isLoading || (!query.isError && !status) || status === "PROCESSING" || status === "PENDING")) {
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
      <Text className="text-2xl font-black">{failed ? "Payment failed" : "Payment not confirmed yet"}</Text>
      <Text className="mt-3 text-center text-sm leading-5 text-[#777]">
        {failed
          ? "We could not confirm this payment. Nothing was taken from your account, and you can try again from your order."
          : "We only confirm payments once your bank or card provider confirms them. If you paid, this can take a few minutes. Your order is saved, and you can check it or pay again from there."}
      </Text>
      {!failed ? (
        <Pressable onPress={() => { setWaitedMs(0); void refetch(); }} className="mt-6 rounded-full bg-[#FFC809] px-6 py-3">
          <Text className="font-black">Check again</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={openOrder} className={`rounded-full px-6 py-3 ${failed ? "mt-6 bg-hook" : "mt-3 bg-white"}`}>
        <Text className="font-black">{failed ? "Try again from my order" : "View order"}</Text>
      </Pressable>
    </View>
  );
}
