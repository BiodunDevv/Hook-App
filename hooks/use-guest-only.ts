import { router } from "expo-router";
import { useEffect } from "react";

import { getSession, isCustomerSession } from "@/lib/session";

/**
 * For sign-in screens: a signed-in customer who lands on one (a stale deep
 * link, the back button, a restored navigation state) is sent to the app.
 * It only checks when the screen opens. Screens that finish a sign-in
 * themselves navigate on their own, so they must not be interrupted here.
 */
export function useGuestOnly() {
  useEffect(() => {
    let active = true;
    void getSession().then((session) => {
      if (active && isCustomerSession(session)) router.replace("/(tabs)");
    });
    return () => { active = false; };
  }, []);
}
