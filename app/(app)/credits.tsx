import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookPageHeader } from "@/components/shared/HookPageHeader";
import { HookLoader } from "@/components/shared/HookLoader";
import { useCreditsQuery } from "@/lib/mobile-api";
import { screenPadding } from "@/constants/design-tokens";

const hookCoin = require("@/assets/images/rewards/hook-coin.png");

function naira(minor: number) {
  const value = Math.abs(Math.round(Number(minor || 0) / 100));
  return `₦${value.toLocaleString("en-NG")}`;
}

const ENTRY_LABELS: Record<string, string> = {
  welcome_bonus: "Welcome bonus",
  referral_signup: "Referral welcome bonus",
  referral_bonus: "Referral reward",
  order_spend: "Applied to an order",
  order_refund: "Returned from a cancelled order",
  order_earn: "Earned from an order",
  admin_adjustment: "Hook adjustment",
};

export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const credits = useCreditsQuery();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await credits.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const history = credits.data?.history || [];

  return (
    <View style={{ flex: 1, backgroundColor: "#F1F1F3" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: screenPadding, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#111111" />}
      >
        <HookPageHeader title="Hook Coin" subtitle="Spend your Hook Coin on your next order." />

        <View style={{ marginTop: 24, borderRadius: 22, backgroundColor: "#111111", padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Image source={hookCoin} style={{ width: 22, height: 22 }} resizeMode="contain" />
            <Text style={{ fontSize: 14, color: "#FAFAFA" }}>Available balance</Text>
          </View>
          <Text style={{ marginTop: 12, fontSize: 34, fontFamily: "NunitoSans-Black", color: "#FFC809" }}>
            {credits.isLoading || credits.isError ? "—" : naira(credits.data?.balanceMinor || 0)}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 21, color: "#DDDDDD" }}>
            Hook Coin can cover up to {credits.data?.capPercent ?? 20}% of each order when you pay now, so a bigger
            basket unlocks more of your balance.
          </Text>
        </View>

        {credits.isLoading ? (
          <View className="py-16">
            <HookLoader />
          </View>
        ) : credits.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void refresh()} style={{ padding: 24, marginTop: 20, borderRadius: 22, backgroundColor: "white" }}>
            <Text style={{ color: "#111", textAlign: "center" }}>Couldn’t load your Hook Coin. Tap to retry.</Text>
          </Pressable>
        ) : !history.length ? (
          <View style={{ marginTop: 20, alignItems: "center", borderRadius: 22, backgroundColor: "white", padding: 24, gap: 12 }}>
            <Ionicons name="gift-outline" size={30} color="#777" />
            <Text className="mt-3 text-base font-bold text-black">No Hook Coin yet</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-[#666]">
              Invite a friend to Hook and you both earn Hook Coin on their first order.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/referrals" as never)}
              style={{ marginTop: 4, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 26, backgroundColor: "#FFC809" }}
            >
              <Text style={{ color: "#111", fontFamily: "NunitoSans-Bold", fontSize: 15 }}>Refer a friend</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-7">
            <Text className="mb-3 text-[15px] font-semibold text-black">Activity</Text>
            <View className="overflow-hidden rounded-[10px] bg-white px-2.5">
              {history.map((entry) => {
                const credit = Number(entry.amountMinor) > 0;
                return (
                  <View
                    key={entry.id}
                    className="min-h-[70px] flex-row items-center border-b border-[#D9D9D9] py-3 last:border-b-0"
                  >
                    <View
                      className={`h-[30px] w-[30px] items-center justify-center rounded-[5px] ${credit ? "bg-hook" : "bg-[#EAEBE7]"}`}
                    >
                      <Ionicons name={credit ? "arrow-down" : "arrow-up"} size={16} color="#111" />
                    </View>
                    <View className="ml-2.5 flex-1">
                      <Text className="text-[15px] font-semibold text-black">
                        {ENTRY_LABELS[entry.type] || "Credit activity"}
                      </Text>
                      <Text className="mt-0.5 text-xs text-[#858589]">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className={`text-sm font-bold ${credit ? "text-[#30b940]" : "text-black"}`}>
                      {credit ? "+" : "-"}
                      {naira(entry.amountMinor)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
