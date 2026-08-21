import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { useCustomerSessionQuery, useOrdersQuery } from "@/lib/mobile-api";
import { isCustomerSession } from "@/lib/session";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const query = useOrdersQuery();
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const [refreshing, setRefreshing] = useState(false);
  const orders = (query.data as any[]) || [];

  async function refreshOrders() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }
  if (!session.isPending && !isCustomerSession(session.data)) return (
    <View className="flex-1 items-center justify-center bg-[#f4f4f5] px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-[#fff4c7]"><Ionicons name="cube-outline" size={36} /></View>
      <Text className="mt-5 text-xl font-black">Sign in to track orders</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-[#777]">Your local cart stays ready while you sign in or create an account.</Text>
      <Pressable onPress={() => openAuth("/orders" as never)} className="mt-6 h-[52px] w-full items-center justify-center rounded-full bg-hook"><Text className="font-bold text-black">Continue</Text></Pressable>
    </View>
  );
  if (query.isLoading || session.isPending)
    return <HookPageLoading title="My orders" label="Loading your orders" />;
  return (
    <View className="flex-1 bg-[#f4f4f5]" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-4 pt-3">
        <View className="flex-row items-center justify-between">
          <HookBackButton />
          <Text className="text-[22px] font-black">Orders</Text>
          <View className="h-11 w-11" />
        </View>
        <Text className="mt-4 text-sm text-[#777]">Payments, approval and delivery readiness</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshOrders()}
            tintColor="#111"
          />
        }
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: insets.bottom + 110,
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/orders/[id]",
                params: { id: item.id },
              } as never)
            }
            className="rounded-[22px] bg-white p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-black">{item.displayNumber || item.id}</Text>
              <View className="rounded-full bg-hook/20 px-3 py-1.5">
                <Text className="text-[10px] font-bold uppercase">
                  {item.statusLabel || String(item.status || "").replaceAll("_", " ")}
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row items-end justify-between">
              <View>
                <Text className="text-xs text-[#888]">
                  {item.itemCount || 0} item{item.itemCount === 1 ? "" : "s"}
                </Text>
                <Text className="mt-1 text-xs text-[#888]">
                  {item.paymentMethod === "PAY_AT_HANDOVER"
                    ? "Pay at handover"
                    : "Prepaid"}
                </Text>
              </View>
              <Text className="text-xl font-black">
                ₦
                {(
                  Number(item.totalMinor || item.total * 100 || 0) / 100
                ).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="overflow-hidden rounded-[24px] bg-white">
            <View className="bg-black px-5 py-6">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-hook">
                <Ionicons name="receipt-outline" size={23} color="#111" />
              </View>
              <Text className="mt-5 text-[23px] font-black text-white">Your Hook orders</Text>
              <Text className="mt-2 text-sm leading-5 text-white/60">
                Payments, sourcing, and delivery updates will stay together here.
              </Text>
            </View>
            <View className="items-center px-6 py-10">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FFF4C7]">
                <Ionicons name="cube-outline" size={30} color="#111" />
              </View>
              <Text className="mt-4 text-lg font-black text-black">No orders yet</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-[#777]">
                Explore products from Hook Markets and your first order will appear here.
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/discover" as never)} className="mt-6 h-12 items-center justify-center rounded-full bg-hook px-6">
                <Text className="font-black text-black">Start discovering</Text>
              </Pressable>
            </View>
          </View>
        }
      />
    </View>
  );
}
