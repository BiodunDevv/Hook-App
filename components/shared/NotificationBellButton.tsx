import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { useCustomerSessionQuery, useNotificationsQuery } from "@/lib/mobile-api";
import { isCustomerSession } from "@/lib/session";

// The bell icon shown across marketplace headers, with an unread-count badge.
// Bare icon, no background chip — sits directly on the header's own yellow.
export function NotificationBellButton({ color = "#111" }: { color?: string }) {
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const signedIn = isCustomerSession(session.data);
  const notifications = useNotificationsQuery();
  const unread = signedIn ? Number((notifications.data as { unread?: number } | undefined)?.unread || 0) : 0;

  return (
    <Pressable
      accessibilityLabel={unread ? `Open notifications, ${unread} unread` : "Open notifications"}
      onPress={() => (signedIn ? router.push("/notifications" as never) : openAuth("/notifications" as never))}
      hitSlop={10}
      className="h-11 w-11 items-center justify-center"
    >
      <Ionicons name={unread > 0 ? "notifications" : "notifications-outline"} size={23} color={color} />
      {unread > 0 ? (
        <View className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#FFD93E] bg-red-500 px-1">
          <Text className="text-[10px] font-bold leading-none text-white">{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
