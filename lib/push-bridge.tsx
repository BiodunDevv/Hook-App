import { router } from "expo-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api";
import { getNotifications, registerPushToken } from "@/lib/push";
import { routeForPush, type PushData } from "@/lib/push-routes";
import { getSession, isCustomerSession, onSessionChanged } from "@/lib/session";

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
        // Tell Hook this one was acted on (best effort), then open its screen.
        if (data.notificationId) void apiRequest(`/notifications/${data.notificationId}/opened`, { method: "POST" }).catch(() => undefined);
        router.push(routeForPush(data) as never);
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
