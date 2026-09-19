import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookPageHeader } from "@/components/shared/HookPageHeader";
import { HookLoader } from "@/components/shared/HookLoader";
import { toast } from "@/components/shared/toast";
import { useReferralsQuery } from "@/lib/mobile-api";
import { screenPadding } from "@/constants/design-tokens";

function naira(minor: number) {
  return `₦${Math.round(Number(minor || 0) / 100).toLocaleString("en-NG")}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 18, backgroundColor: "white", padding: 12 }}>
      <Text className="text-[22px] font-black text-black">{value}</Text>
      <Text className="mt-1 text-xs text-[#777]">{label}</Text>
    </View>
  );
}

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const referrals = useReferralsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const code = referrals.data?.code || "";
  const rows = referrals.data?.referrals || [];

  async function refresh() {
    setRefreshing(true);
    try {
      await referrals.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
    await Clipboard.setStringAsync(code);
    toast.success("Code copied", "Share it with a friend to start earning.");
    } catch {
      toast.error("Couldn’t copy your code. Please try again.");
    }
  }

  async function shareCode() {
    if (!code) return;
    try {
    await Share.share({
      message: `Shop Nigerian markets with Hook. Use my code ${code} when you sign up and we both earn Hook Coin.`,
    });
    } catch {
      toast.error("Couldn’t open sharing. Please try again.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F1F1F3" }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: screenPadding, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#111111" />}
      >
        <HookPageHeader title="Refer a friend" subtitle="Earn credits when they order." />

        <View style={{ marginTop: 24, borderRadius: 22, backgroundColor: "#FFC809", padding: 20, gap: 12 }}>
          <Ionicons name="gift" size={26} color="#111" />
          <Text className="mt-4 text-lg font-black text-black">Give ₦300, get ₦1,000</Text>
          <Text className="mt-1 text-sm leading-5 text-black/60">
            Your friend gets ₦300 in Hook Coin the moment they join with your code. You earn ₦1,000 once they complete
            their first order.
          </Text>
        </View>

        {referrals.isLoading ? (
          <View className="py-16">
            <HookLoader />
          </View>
        ) : referrals.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void refresh()} style={{ padding: 24, marginTop: 20, borderRadius: 22, backgroundColor: "white" }}>
            <Text style={{ color: "#111", textAlign: "center" }}>Couldn’t load referrals. Tap to retry.</Text>
          </Pressable>
        ) : (
          <>
            <View style={{ marginTop: 20, borderRadius: 22, backgroundColor: "white", padding: 20 }}>
              <Text className="text-xs font-semibold uppercase tracking-wide text-[#777]">Your code</Text>
              <Text className="mt-2 text-[28px] font-black tracking-[2px] text-black">{code || "—"}</Text>
              <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void copyCode()}
                  disabled={!code}
                  accessibilityState={{ disabled: !code }}
                  style={{ flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 26, borderWidth: 1, borderColor: "#DDDDDD" }}
                >
                  <Ionicons name="copy-outline" size={16} color="#111" />
                  <Text className="text-sm font-bold text-black">Copy</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void shareCode()}
                  disabled={!code}
                  accessibilityState={{ disabled: !code }}
                  style={{ flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 26, backgroundColor: "#111" }}
                >
                  <Ionicons name="share-social-outline" size={16} color="#fff" />
                  <Text style={{ color: "white", fontFamily: "NunitoSans-Bold", fontSize: 15 }}>Share</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
              <Stat label="Friends joined" value={String(referrals.data?.totalReferrals ?? 0)} />
              <Stat label="Completed" value={String(referrals.data?.qualifiedReferrals ?? 0)} />
              <Stat label="Earned" value={naira(referrals.data?.totalEarnedMinor || 0)} />
            </View>

            <View className="mt-7">
              <Text className="mb-3 text-[15px] font-semibold text-black">Referral history</Text>
              {!rows.length ? (
                <View style={{ alignItems: "center", borderRadius: 22, backgroundColor: "white", padding: 24, gap: 12 }}>
                  <Ionicons name="people-outline" size={30} color="#777" />
                  <Text className="mt-3 text-base font-bold text-black">No referrals yet</Text>
                  <Text className="mt-1 text-center text-sm leading-5 text-[#666]">
                    Share your code and your first reward will show up here.
                  </Text>
                </View>
              ) : (
                <View className="overflow-hidden rounded-[10px] bg-white px-2.5">
                  {rows.map((row) => (
                    <View
                      key={row.id}
                      className="min-h-[70px] flex-row items-center border-b border-[#D9D9D9] py-3 last:border-b-0"
                    >
                      <View
                        className={`h-[30px] w-[30px] items-center justify-center rounded-[5px] ${row.status === "qualified" ? "bg-hook" : "bg-[#EAEBE7]"}`}
                      >
                        <Ionicons
                          name={row.status === "qualified" ? "checkmark" : "hourglass-outline"}
                          size={16}
                          color="#111"
                        />
                      </View>
                      <View className="ml-2.5 flex-1">
                        <Text className="text-[15px] font-semibold text-black">{row.name}</Text>
                        <Text className="mt-0.5 text-xs text-[#858589]">
                          {row.status === "qualified" ? "Completed their first order" : "Waiting on their first order"}
                        </Text>
                      </View>
                      <Text
                        className={`text-sm font-bold ${row.status === "qualified" ? "text-[#30b940]" : "text-[#858589]"}`}
                      >
                        {row.status === "qualified" ? `+${naira(row.bonusMinor)}` : "Pending"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
