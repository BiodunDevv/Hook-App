import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookLoader } from "@/components/shared/HookLoader";
import { HookRefreshControl } from "@/components/shared/HookRefreshControl";
import { toast } from "@/components/shared/toast";
import { screenPadding } from "@/constants/design-tokens";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { useNotificationPreferencesQuery, useUpdateNotificationPreferences, type NotificationPreferences } from "@/lib/mobile-api";

type SwitchableGroup = "credit" | "reminders" | "discovery";

const GROUPS: Array<{ key: SwitchableGroup; icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }> = [
  { key: "reminders", icon: "alarm-outline", title: "Reminders", detail: "Items left in your cart, negotiations waiting for you, and payments still to make." },
  { key: "discovery", icon: "sparkles-outline", title: "New on Hook", detail: "New arrivals, new markets, price drops and offers." },
  { key: "credit", icon: "wallet-outline", title: "Hook credit", detail: "Reminders about credit you have not used yet." },
];

const hours = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${suffix}`;
};

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const query = useNotificationPreferencesQuery();
  const update = useUpdateNotificationPreferences();
  const { refreshing, onRefresh } = usePullRefresh(() => query.refetch());
  const preferences: NotificationPreferences | undefined = query.data;

  function change(patch: Parameters<typeof update.mutate>[0]) {
    update.mutate(patch, { onError: () => toast.error("Could not save", "Check your connection and try again.") });
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F5F5]"
      refreshControl={<HookRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: screenPadding, paddingBottom: insets.bottom + 40 }}
    >
      <View className="flex-row items-center">
        <HookBackButton />
        <Text className="ml-4 text-xl font-black">Notifications</Text>
      </View>

      {query.isLoading ? (
        <View className="items-center py-16"><HookLoader size="inline" /></View>
      ) : !preferences ? (
        <View className="mt-8 items-center rounded-[14px] bg-white p-6">
          <Text className="text-center text-sm text-[#666]">Your notification settings could not be loaded.</Text>
          <Pressable onPress={() => void query.refetch()} className="mt-4 h-11 items-center justify-center rounded-full bg-hook px-6"><Text className="font-black">Try again</Text></Pressable>
        </View>
      ) : (
        <>
          <View className="mt-6 flex-row items-start gap-3 rounded-[14px] bg-[#FFF8DF] p-4">
            <Ionicons name="shield-checkmark-outline" size={20} color="#8A6900" />
            <Text className="flex-1 text-[13px] leading-5 text-[#5A4300]">
              Order, payment, delivery and security updates are always on, so you never miss what matters.
            </Text>
          </View>

          <Text className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-wide text-[#8F8F8F]">Choose what else you hear about</Text>
          <View className="overflow-hidden rounded-[14px] bg-white">
            {GROUPS.map((group, index) => (
              <View key={group.key} className={`flex-row items-center px-4 py-4 ${index ? "border-t border-[#F0F0F0]" : ""}`}>
                <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFF4C7]">
                  <Ionicons name={group.icon} size={20} color="#111" />
                </View>
                <View className="ml-3 flex-1 pr-3">
                  <Text className="text-[15px] font-bold">{group.title}</Text>
                  <Text className="mt-0.5 text-xs leading-4 text-[#777]">{group.detail}</Text>
                </View>
                <Switch
                  value={preferences.groups[group.key]}
                  onValueChange={(value) => change({ groups: { [group.key]: value } })}
                  trackColor={{ true: "#FFC809" }}
                />
              </View>
            ))}
          </View>

          <View className="mt-4 flex-row items-center rounded-[14px] bg-white px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFF4C7]">
              <Ionicons name="moon-outline" size={20} color="#111" />
            </View>
            <View className="ml-3 flex-1 pr-3">
              <Text className="text-[15px] font-bold">Quiet hours</Text>
              <Text className="mt-0.5 text-xs leading-4 text-[#777]">
                No reminders or offers from {hours(preferences.quietHours.start)} to {hours(preferences.quietHours.end)}. Order updates still arrive.
              </Text>
            </View>
            <Switch value={preferences.quietHours.enabled} onValueChange={(value) => change({ quietHours: { enabled: value } })} trackColor={{ true: "#FFC809" }} />
          </View>

          <Pressable onPress={() => void Linking.openSettings()} className="mt-6 items-center py-2">
            <Text className="text-[13px] font-semibold text-[#555] underline">Notifications are off? Open phone settings</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
