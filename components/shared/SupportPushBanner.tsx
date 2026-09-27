import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { getPushPermissionStatus } from "@/lib/push";
import { openSupport } from "@/lib/support-api";
import { toast } from "@/components/shared/toast";

// Shown only when push permission is off, so there's always a way to reach support.
export function SupportPushBanner() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    async function check() {
      const status = await getPushPermissionStatus();
      setBlocked(status === "denied" || status === "undetermined");
    }
    void check();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void check(); });
    return () => subscription.remove();
  }, []);

  if (!blocked) return null;

  return (
    <View className="mx-4 mb-5 flex-row items-center gap-3 rounded-2xl bg-[#FFF3C4] p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
        <Ionicons name="notifications-off-outline" size={19} color="#9a7400" />
      </View>
      <View className="flex-1">
        <Text className="text-[13px] font-bold text-black">Turn on notifications to hear from support faster</Text>
      </View>
      <Pressable
        onPress={() => void openSupport().catch(() => toast.error("Could not open support. Please try again."))}
        className="rounded-full bg-black px-3.5 py-2"
      >
        <Text className="text-[12px] font-bold text-white">Contact Support</Text>
      </Pressable>
    </View>
  );
}
