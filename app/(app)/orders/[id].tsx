import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookConfirmSheet } from "@/components/shared/HookConfirmSheet";
import { HookLoader } from "@/components/shared/HookLoader";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { toast } from "@/components/shared/toast";
import {
  useCancelOrderMutation,
  useCreatePaymentLinkMutation,
  useOrderQuery,
  usePaymentStatusQuery,
} from "@/lib/mobile-api";

const money = (minor?: number) => `₦${(Number(minor || 0) / 100).toLocaleString("en-NG")}`;
const date = (value?: string) => value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "Not available yet";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View className="rounded-[22px] bg-white p-4"><Text className="mb-4 text-[17px] font-black text-[#171717]">{title}</Text>{children}</View>;
}

function Timeline({ events = [] }: { events?: any[] }) {
  return <View>{events.map((event, index) => {
    const completed = event.status === "completed";
    const current = event.status === "current";
    return <View key={event.key || `${event.label}-${index}`} className="flex-row gap-3">
      <View className="items-center">
        <View className={`h-6 w-6 items-center justify-center rounded-full ${completed || current ? "bg-hook" : "bg-[#ececee]"}`}>
          <Ionicons name={completed ? "checkmark" : current ? "ellipse" : "ellipse-outline"} size={completed ? 14 : 9} color={completed || current ? "#111" : "#aaa"} />
        </View>
        {index < events.length - 1 ? <View className={`min-h-8 w-0.5 flex-1 ${completed ? "bg-hook" : "bg-[#ececee]"}`} /> : null}
      </View>
      <View className="min-h-14 flex-1 pb-3">
        <Text className={`text-sm ${current ? "font-black text-black" : completed ? "font-bold text-[#333]" : "font-semibold text-[#aaa]"}`}>{event.label}</Text>
        {event.occurredAt ? <Text className="mt-1 text-[11px] text-[#888]">{date(event.occurredAt)}</Text> : current ? <Text className="mt-1 text-[11px] font-bold text-[#947000]">In progress</Text> : null}
      </View>
    </View>;
  })}</View>;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const query = useOrderQuery(id);
  const payment = usePaymentStatusQuery(id);
  const createPaymentLink = useCreatePaymentLinkMutation();
  const cancelOrder = useCancelOrderMutation();
  const [paymentBusy, setPaymentBusy] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const order = query.data as any;

  async function resumePayment(fulfilmentGroupId?: string) {
    if (!id || paymentBusy) return;
    setPaymentBusy(true);
    try {
      const link = await createPaymentLink.mutateAsync({ orderId: id, fulfilmentGroupId });
      if (!link?.url) throw new Error("Secure payment checkout is unavailable");
      const checkoutUrl = new URL(link.url);
      checkoutUrl.searchParams.set("appReturn", "1");
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl.toString(), "hook://payments/return");
      await WebBrowser.dismissBrowser();
      if (result.type === "cancel" || result.type === "dismiss") return;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const refreshed = await payment.refetch();
        if (String((refreshed.data as any)?.payment?.status || "").toUpperCase() === "CONFIRMED") {
          toast.success("Payment confirmed");
          await query.refetch();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      toast.info("Payment confirmation is still processing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be started");
    } finally { setPaymentBusy(false); }
  }

  async function sharePayment(fulfilmentGroupId?: string) {
    if (!id || paymentBusy) return;
    setPaymentBusy(true);
    try {
      const link = await createPaymentLink.mutateAsync({ orderId: id, fulfilmentGroupId });
      await Share.share({ message: `Pay securely for ${order.displayNumber}: ${link.url}`, url: link.url, title: "Hook payment link" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment link could not be shared");
    } finally { setPaymentBusy(false); }
  }

  return <View className="flex-1 bg-[#f3f3f5]" style={{ paddingTop: insets.top }}>
    <View className="flex-row items-center justify-between px-4 py-3">
      <HookBackButton />
      <Text className="text-xl font-black">Order Details</Text>
      <View className="h-11 w-11" />
    </View>

    {query.isLoading ? <View className="flex-1 items-center justify-center"><HookLoader size="page" /><Text className="mt-3 text-sm font-semibold text-[#777]">Loading your order</Text></View> : query.isError || !order ? <View className="flex-1 items-center justify-center px-8"><View className="h-16 w-16 items-center justify-center rounded-full bg-white"><Ionicons name="receipt-outline" size={28} color="#777" /></View><Text className="mt-5 text-center text-xl font-black">Order unavailable</Text><Text className="mt-2 text-center text-sm leading-6 text-[#777]">We could not load this order right now.</Text><Pressable onPress={() => query.refetch()} className="mt-5 rounded-full bg-hook px-6 py-3"><Text className="font-black">Try again</Text></Pressable></View> : <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
      <View className="rounded-[24px] bg-black p-5">
        <View className="flex-row items-start justify-between gap-4"><View className="flex-1"><Text className="text-[22px] font-black text-white">{order.displayNumber}</Text><Text className="mt-1 text-xs text-white/60">{date(order.createdAt)}</Text></View><View className="rounded-full bg-hook px-3 py-2"><Text className="text-xs font-black text-black">{order.statusLabel}</Text></View></View>
        <View className="mt-6 flex-row border-t border-white/15 pt-4"><View className="flex-1"><Text className="text-[11px] font-bold uppercase text-white/50">Items</Text><Text className="mt-1 text-lg font-black text-white">{order.itemCount}</Text></View><View className="flex-1"><Text className="text-[11px] font-bold uppercase text-white/50">Total</Text><Text className="mt-1 text-lg font-black text-white">{money(order.totalMinor)}</Text></View><View className="flex-1"><Text className="text-[11px] font-bold uppercase text-white/50">Payment</Text><Text className="mt-1 text-sm font-black text-white">{String(order.paymentMethod || "").replaceAll("_", " ")}</Text></View></View>
      </View>

      <View className="mt-4"><Section title="Delivery information"><View className="flex-row items-start gap-3"><View className="h-10 w-10 items-center justify-center rounded-full bg-[#fff4c7]"><Ionicons name="location-outline" size={21} color="#d29b00" /></View><View className="flex-1"><Text className="text-xs font-bold uppercase text-[#d29b00]">Delivery address</Text><Text className="mt-1 text-sm font-semibold leading-6 text-[#333]">{order.address?.formattedAddress || "Address is being confirmed"}</Text></View></View>{order.deliveries?.some((delivery: any) => delivery.eta) ? <View className="mt-4 flex-row items-start gap-3"><View className="h-10 w-10 items-center justify-center rounded-full bg-[#fff4c7]"><Ionicons name="calendar-outline" size={20} color="#d29b00" /></View><View><Text className="text-xs font-bold uppercase text-[#d29b00]">Estimated arrival</Text><Text className="mt-1 text-sm font-semibold">{date(order.deliveries.find((delivery: any) => delivery.eta)?.eta)}</Text></View></View> : null}</Section></View>

      <View className="mt-4"><Section title="Items">{order.items?.map((item: any) => <View key={item.id || item.title} className="mb-3 flex-row gap-3 last:mb-0"><View className="h-20 w-20 overflow-hidden rounded-2xl bg-[#f1f1f2]"><RemoteImage uri={item.imageUrl} /></View><View className="flex-1"><View className="flex-row justify-between gap-3"><Text className="flex-1 text-sm font-black leading-5">{item.title}</Text><Text className="text-sm font-black">{money(item.lineTotalMinor)}</Text></View><Text className="mt-1 text-xs text-[#777]">{Object.values(item.variants || {}).filter(Boolean).join(" · ") || "Standard"}</Text><Text className="mt-2 text-xs font-bold text-[#555]">{money(item.unitPriceMinor)} × {item.quantity}</Text></View></View>)}</Section></View>

      <View className="mt-4"><Section title="Order summary"><View className="gap-3"><View className="flex-row justify-between"><Text className="text-sm text-[#666]">Products</Text><Text className="text-sm font-bold">{money(order.subtotalMinor)}</Text></View><View className="flex-row justify-between"><Text className="text-sm text-[#666]">VAT {order.vatRate ? `(${Number(order.vatRate) * 100}%)` : ""}</Text><Text className="text-sm font-bold">{money(order.vatMinor)}</Text></View><View className="flex-row justify-between"><Text className="text-sm text-[#666]">Delivery</Text><Text className="text-sm font-bold">{money(order.deliveryFeeMinor)}</Text></View>{order.discountMinor > 0 ? <View className="flex-row justify-between"><Text className="text-sm text-[#666]">Discount</Text><Text className="text-sm font-bold text-emerald-600">−{money(order.discountMinor)}</Text></View> : null}<View className="mt-1 flex-row justify-between border-t border-black/10 pt-4"><Text className="text-base font-black">Total</Text><Text className="text-xl font-black">{money(order.totalMinor)}</Text></View></View></Section></View>

      <View className="mt-4"><Section title="Order progress"><Timeline events={order.timeline} /></Section></View>

      <Text className="mb-3 mt-6 text-[17px] font-black">Your deliveries</Text>
      <View className="gap-3">{order.deliveries?.map((delivery: any) => {
        const open = expanded[delivery.id] ?? order.deliveries.length === 1;
        return <View key={delivery.id} className="overflow-hidden rounded-[22px] bg-white"><Pressable onPress={() => setExpanded((state) => ({ ...state, [delivery.id]: !open }))} className="flex-row items-center gap-3 p-4"><View className="h-11 w-11 items-center justify-center rounded-full bg-[#fff4c7]"><Ionicons name="cube-outline" size={22} color="#b78200" /></View><View className="flex-1"><Text className="font-black">{delivery.label}</Text><Text className="mt-1 text-xs text-[#777]">{delivery.statusLabel} · {delivery.items?.length || 0} product{delivery.items?.length === 1 ? "" : "s"}</Text></View><Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color="#555" /></Pressable>{open ? <View className="border-t border-black/5 px-4 pb-4 pt-4"><Timeline events={delivery.timeline} />{delivery.shipment?.trackingReference ? <Pressable onPress={async () => { await Clipboard.setStringAsync(delivery.shipment.trackingReference); toast.success("Tracking reference copied"); }} className="mt-2 flex-row items-center justify-between rounded-2xl bg-[#f4f4f5] p-3"><View><Text className="text-[11px] font-bold uppercase text-[#777]">Tracking reference</Text><Text className="mt-1 font-black">{delivery.shipment.trackingReference}</Text></View><Ionicons name="copy-outline" size={20} color="#111" /></Pressable> : <View className="mt-2 rounded-2xl bg-[#f4f4f5] p-3"><Text className="text-xs font-semibold text-[#666]">Tracking will appear here after this delivery leaves Hook Hub.</Text></View>}{order.paymentMethod === "PAY_AT_HANDOVER" && !["CONFIRMED", "PAID"].includes(String(delivery.payment?.status || "").toUpperCase()) ? <View className="mt-3 flex-row gap-2"><Pressable disabled={paymentBusy} onPress={() => sharePayment(delivery.id)} className="h-12 flex-1 items-center justify-center rounded-2xl border border-black/10"><Text className="font-black">Share link</Text></Pressable><Pressable disabled={paymentBusy} onPress={() => resumePayment(delivery.id)} className="h-12 flex-1 items-center justify-center rounded-2xl bg-hook"><Text className="font-black">Pay now</Text></Pressable></View> : null}</View> : null}</View>;
      })}</View>

      {order.paymentMethod === "PREPAID" && !["CONFIRMED", "PAID"].includes(String(order.paymentStatus || "").toUpperCase()) ? <View className="mt-4 flex-row gap-2"><Pressable disabled={paymentBusy} onPress={() => sharePayment()} className="h-[52px] flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white"><Text className="font-black">Share payment</Text></Pressable><Pressable disabled={paymentBusy} onPress={() => resumePayment()} className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-hook">{paymentBusy ? <HookLoader size="button" /> : <Ionicons name="card-outline" size={19} color="#111" />}<Text className="font-black">Pay securely</Text></Pressable></View> : null}
      {order.canCancel ? <Pressable onPress={() => setCancelOpen(true)} className="mt-5 items-center py-3"><Text className="font-black text-red-600">Cancel unpaid order</Text></Pressable> : null}
    </ScrollView>}

    <HookConfirmSheet visible={cancelOpen} title="Cancel this order?" message="This will cancel the unpaid order and deactivate every payment link created for it." confirmLabel="Cancel order" cancelLabel="Keep order" destructive busy={cancelOrder.isPending} onClose={() => setCancelOpen(false)} onConfirm={async () => { if (!id) return; try { await cancelOrder.mutateAsync({ orderId: id, reason: "Cancelled by customer before payment" }); setCancelOpen(false); toast.success("Order cancelled"); } catch (error) { toast.error(error instanceof Error ? error.message : "Order could not be cancelled"); } }} />
  </View>;
}
