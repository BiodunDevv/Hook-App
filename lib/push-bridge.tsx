import { router } from "expo-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getNotifications, registerPushToken } from "@/lib/push";
import { getSession, isCustomerSession, onSessionChanged } from "@/lib/session";

type PushData = { type?: string; orderId?: string; notificationId?: string } & Record<string, unknown>;

/** Where tapping a notification should land. Unknown kinds fall back to the inbox. */
function destinationFor(data: PushData) {
  const type = String(data.type || "");
  if (type === "welcome" || type === "welcome_back") return "/(tabs)";
  if (data.orderId && /order|payment|shipment|delivery|refund|substitution|hub|dispatch/i.test(type || "order")) {
    return `/orders/${data.orderId}`;
  }
  return "/notifications";
}

/**
 * Everything push does after the token exists: keep the token fresh, refresh
 * the app's data when a push arrives, and open the right screen when one is
 * tapped (including the tap that launched the app from a closed state).
 */
export function PushNotificationBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let removeListeners: (() => void) | undefined;

    async function refreshToken() {
      // Tokens can change (reinstall, restore). Re-register quietly on launch
      // and whenever the customer signs in; the welcome push is sent by sign-in only.
      if (isCustomerSession(await getSession())) await registerPushToken();
    }

    const Notifications = getNotifications();
    if (Notifications) {
      const open = (data: PushData) => {
        void queryClient.invalidateQueries({ queryKey: ["mobile", "notifications"] });
        router.push(destinationFor(data) as never);
      };

      const received = Notifications.addNotificationReceivedListener((notification) => {
        // Shown in the foreground by the notification handler; keep the inbox and badge in step.
        void queryClient.invalidateQueries({ queryKey: ["mobile", "notifications"] });
        const data = notification.request.content.data as PushData;
        if (data?.orderId) void queryClient.invalidateQueries({ queryKey: ["mobile", "orders"] });
      });
      const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
        open(response.notification.request.content.data as PushData);
      });
      removeListeners = () => { received.remove(); tapped.remove(); };

      // The tap that opened the app from a closed state.
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!cancelled && response) open(response.notification.request.content.data as PushData);
      });
      void Notifications.setBadgeCountAsync(0).catch(() => undefined);
    }

    void refreshToken();
    const stopSession = onSessionChanged(() => void refreshToken());
    return () => {
      cancelled = true;
      removeListeners?.();
      stopSession();
    };
  }, [queryClient]);

  return null;
}
