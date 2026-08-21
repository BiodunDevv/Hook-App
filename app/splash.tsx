import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { BackendUnavailableScreen } from "@/components/shared/BackendUnavailableScreen";
import { checkHookHealth } from "@/lib/health";
import { refreshSession } from "@/lib/api";
import { getOnboardingComplete, getPendingSignup, getSession } from "@/lib/session";

const SPLASH_DELAY = 900;

export default function SplashScreen() {
  const routed = useRef(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let mounted = true;

    function replace(path: Parameters<typeof router.replace>[0]) {
      if (!mounted || routed.current) return;
      routed.current = true;
      router.replace(path);
    }

    async function route() {
      const [, healthy] = await Promise.all([
        new Promise((resolve) => setTimeout(resolve, SPLASH_DELAY)),
        checkHookHealth(),
      ]);
      if (!mounted) return;
      setBackendAvailable(healthy);
      if (!healthy) return;

      const session = await getSession();
      if (session && (await refreshSession(session))) {
        replace("/(tabs)");
        return;
      }

      const pendingSignup = await getPendingSignup();
      if (pendingSignup) {
        replace({
          pathname:
            pendingSignup.step === "complete_profile"
              ? "/auth/enter-name"
              : "/auth/verify-email",
          params: { email: pendingSignup.email },
        });
        return;
      }

      if (!(await getOnboardingComplete())) {
        replace("/onboarding");
        return;
      }

      replace("/(tabs)");
    }

    void route();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (backendAvailable !== false) return;

    let active = true;
    const recover = async () => {
      if (routed.current) return;
      const healthy = await checkHookHealth();
      if (!active || !healthy || routed.current) return;

      setBackendAvailable(true);
      const session = await getSession();
      if (!active || routed.current) return;
      routed.current = true;
      if (session) await refreshSession(session);
      router.replace((await getOnboardingComplete()) ? "/(tabs)" : "/onboarding");
    };

    const interval = setInterval(() => void recover(), 5_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [backendAvailable]);

  const retryHealth = async () => {
    setRetrying(true);
    const healthy = await checkHookHealth();
    if (healthy) {
      setBackendAvailable(true);
      const session = await getSession();
      if (session) await refreshSession(session);
      router.replace((await getOnboardingComplete()) ? "/(tabs)" : "/onboarding");
    } else {
      setBackendAvailable(false);
    }
    setRetrying(false);
  };

  if (backendAvailable === false) {
    return (
      <View className="flex-1 bg-hook">
        <StatusBar style="dark" translucent />
        <BackendUnavailableScreen retrying={retrying} onRetry={() => void retryHealth()} />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-hook px-6">
      <StatusBar style="light" />
      <View className="w-full flex-1 items-center justify-center">
        <Text className="text-[55px] font-bold leading-[66px] text-black">
          hook
          <Text className="text-[55px] font-bold leading-[66px] text-white">
            .
          </Text>
        </Text>
      </View>
      <View className="w-full items-center pb-8">
        <View className="mb-3 h-px w-8 bg-black/20" />
        <Text className="text-center text-[11px] font-bold uppercase tracking-[1.6px] text-black/60">
          Velaris Technologies Limited
        </Text>
      </View>
    </View>
  );
}
