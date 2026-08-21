import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getHookTabBarContentInset } from "@/components/tab-bar/layout";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookLoader } from "@/components/shared/HookLoader";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { useNegotiationsQuery } from "@/lib/mobile-api";

type NegotiationRow = {
  negotiationId: string;
  status: string;
  sessionMode?: "fixed" | "unlimited";
  expiresAt?: string;
  remainingOffers?: number;
  variantId?: string;
  quantity?: number;
  transcript?: { message?: string; createdAt?: string }[];
  product?: {
    id?: string;
    title?: string;
    imageUrl?: string;
  };
};

function sessionTime(row: NegotiationRow, now: number) {
  if (row.status === "agreed") return { label: "Agreed", active: false };
  if (row.status !== "active") {
    const labels: Record<string, string> = {
      declined: "Closed",
      expired: "Expired",
      closed: "Closed",
      replaced: "Replaced",
    };
    return { label: labels[row.status] || row.status, active: false };
  }
  if (row.sessionMode === "unlimited" || !row.expiresAt) {
    return { label: "Unlimited", active: true };
  }
  const seconds = Math.max(
    0,
    Math.floor((new Date(row.expiresAt).getTime() - now) / 1000),
  );
  if (!seconds) return { label: "Expired", active: false };
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return {
    label: hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`,
    active: true,
  };
}

function ConversationRow({ row, now }: { row: NegotiationRow; now: number }) {
  const timer = sessionTime(row, now);
  const latestMessage = row.transcript?.at(-1)?.message;

  return (
    <Pressable
      accessibilityHint="Opens this product negotiation"
      accessibilityLabel={`${row.product?.title || "Product"}, ${timer.label}`}
      accessibilityRole="button"
      className="flex-row items-center border-b border-[#F0F0F1] bg-white px-5 py-4 active:bg-[#FAFAFA]"
      onPress={() =>
        router.push(
          `/negotiations/new?resume=${encodeURIComponent(row.negotiationId)}&productId=${encodeURIComponent(row.product?.id || "")}&variantId=${encodeURIComponent(row.variantId || "")}&quantity=${row.quantity || 1}` as never,
        )
      }
    >
      <View className="relative size-14">
        <View className="size-14 overflow-hidden rounded-2xl bg-[#F1F1F3]">
          <RemoteImage uri={row.product?.imageUrl} />
        </View>
        <View
          className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${timer.active ? "bg-[#10B981]" : "bg-[#B7B7BC]"}`}
        />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="min-w-0 flex-1 text-[15px] font-black text-[#0A0A0A]" numberOfLines={1}>
            {row.product?.title || "Product negotiation"}
          </Text>
          <View className={`rounded-full px-2.5 py-1 ${timer.active ? "bg-[#FFF6CE]" : "bg-[#F1F1F3]"}`}>
            <Text className={`text-[10px] font-black ${timer.active ? "text-[#8A6500]" : "text-[#77777E]"}`}>
              {timer.label}
            </Text>
          </View>
        </View>

        <View className="mt-1.5 flex-row items-center">
          <Text className="min-w-0 flex-1 text-[13px] leading-5 text-[#77777E]" numberOfLines={1}>
            {latestMessage || "Open this conversation to make your offer"}
          </Text>
          {row.status === "active" ? (
            <View className="ml-3 min-w-5 items-center justify-center rounded-full bg-hook px-1.5 py-0.5">
              <Text className="text-[10px] font-black text-black">{row.remainingOffers ?? 0}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const query = useNegotiationsQuery();
  const rows = useMemo(
    () => (Array.isArray(query.data) ? query.data : []) as NegotiationRow[],
    [query.data],
  );
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const visibleRows = useMemo(() => {
    const queryText = search.trim().toLocaleLowerCase();
    if (!queryText) return rows;
    return rows.filter((row) => {
      const productName = row.product?.title || "";
      const lastMessage = row.transcript?.at(-1)?.message || "";
      return `${productName} ${lastMessage} ${row.status}`
        .toLocaleLowerCase()
        .includes(queryText);
    });
  }, [rows, search]);

  const activeCount = rows.filter((row) => sessionTime(row, now).active).length;

  return (
    <View className="flex-1 bg-[#F1F1F3]" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-8 pt-3">
        <View className="flex-row items-center justify-between">
          <HookBackButton />
          <Text className="text-[22px] font-black text-[#0A0A0A]">Messages</Text>
          <View className="min-w-11 items-end">
            {activeCount ? (
              <View className="rounded-full bg-[#FFF0F0] px-2.5 py-1">
                <Text className="text-[10px] font-black text-[#DC2626]">
                  {activeCount} active
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="mt-8 h-[52px] flex-row items-center rounded-full border border-[#F2F2F2] bg-white px-4">
          <Ionicons name="search" size={24} color="#A7A7AD" />
          <TextInput
            accessibilityLabel="Search negotiation conversations"
            className="ml-2 h-full flex-1 text-[14px] text-black"
            onChangeText={setSearch}
            placeholder="Search conversations..."
            placeholderTextColor="#8F8F95"
            returnKeyType="search"
            value={search}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#A7A7AD" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center bg-white">
          <HookLoader label="Loading conversations" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-white"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor="#111"
              colors={["#FFC809"]}
            />
          }
          contentContainerStyle={{
            flexGrow: visibleRows.length ? undefined : 1,
            paddingBottom: getHookTabBarContentInset(insets.bottom),
          }}
        >
          {visibleRows.length ? (
            visibleRows.map((row) => (
              <ConversationRow key={row.negotiationId} row={row} now={now} />
            ))
          ) : (
            <View className="flex-1 items-center justify-center px-10 pb-20">
              <View className="size-20 items-center justify-center rounded-[24px] bg-[#FFF3BF]">
                <Ionicons name={search ? "search" : "chatbubble-ellipses"} size={32} color="#111" />
              </View>
              <Text className="mt-6 text-center text-[20px] font-black">
                {search ? "No conversations found" : "No messages yet"}
              </Text>
              <Text className="mt-2 text-center text-sm leading-6 text-[#77777E]">
                {search
                  ? "Try another product name or message."
                  : "Your product price conversations will appear here."}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
