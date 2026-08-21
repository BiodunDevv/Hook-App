import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { ProfileAvatar, ProfileRow, ProfileSection } from "@/components/profile/ProfileComponents";
import { HookConfirmSheet } from "@/components/shared/HookConfirmSheet";
import { toast } from "@/components/shared/toast";
import { logout, useLocalSessionQuery } from "@/lib/auth-api";
import { unregisterPushToken } from "@/lib/push";
import { clearSession } from "@/lib/session";
import { getHookTabBarContentInset } from "@/components/tab-bar/layout";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const local = useLocalSessionQuery();
  const { refetch } = local;
  const { openAuth } = useAuthSheet();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const session = local.data?.session;

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [54, 96], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [54, 96], [-10, 0], Extrapolation.CLAMP) }],
  }));

  if (!session) {
    return (
      <View
        className="flex-1 items-center justify-center bg-[#F5F5F5] px-6"
        style={{ paddingBottom: getHookTabBarContentInset(insets.bottom) }}
      >
        <View className="w-full items-center rounded-[18px] bg-white px-6 py-8">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-hook">
            <Ionicons name="person" size={34} color="#111" />
          </View>
          <Text className="mt-5 text-center text-[24px] font-black text-black">Your Hook profile</Text>
          <Text className="mt-2 text-center text-[14px] leading-5 text-[#77777B]">Sign in to manage your orders, addresses, saved products and security.</Text>
          <Pressable accessibilityRole="button" onPress={() => openAuth("/(tabs)/profile")} className="mt-6 h-[52px] w-full items-center justify-center rounded-full bg-hook">
            <Text className="font-black text-black">Sign in or create account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const name = `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim() || "Hook customer";

  async function handleLogout() {
    if (!session) return;
    setLogoutBusy(true);
    await Promise.allSettled([logout(session.refreshToken), unregisterPushToken()]);
    await clearSession();
    setLogoutBusy(false);
    setLogoutOpen(false);
    toast.success("You are signed out", "Sign in again whenever you are ready.");
    router.replace("/(tabs)");
    setTimeout(() => openAuth(), 320);
  }

  async function refreshProfile() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <Animated.ScrollView
        className="flex-1 bg-[#F5F5F5]"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshProfile()} tintColor="#FFC809" colors={["#FFC809"]} progressViewOffset={insets.top + 12} />}
        contentContainerStyle={{
          paddingTop: insets.top + 34,
          paddingBottom: getHookTabBarContentInset(insets.bottom),
        }}
      >
        <View className="flex-row items-center px-5 pb-7">
          <View className="rounded-full bg-hook p-[3px]">
            <ProfileAvatar name={name} uri={session.user.avatarUrl} size={68} />
          </View>
          <View className="ml-4 min-w-0 flex-1">
            <Text className="text-[20px] font-bold text-black">{name}</Text>
            <Text className="mt-1 text-[14px] text-[#8F8F8F]">{session.user.email}</Text>
          </View>
        </View>

        <View className="px-4">
          <ProfileSection title="General">
            <ProfileRow icon="person" label="Edit Profile" onPress={() => router.push("/profile/edit" as never)} />
            <ProfileRow icon="cart" label="My Orders" onPress={() => router.push("/orders" as never)} />
            <ProfileRow icon="location" label="My addresses" onPress={() => router.push("/addresses" as never)} />
            <ProfileRow icon="heart" label="Saved products" onPress={() => router.push("/likes" as never)} />
            <ProfileRow icon="chatbox" label="Messages" onPress={() => router.push("/(tabs)/messages" as never)} />
          </ProfileSection>

          <ProfileSection title="Security">
            <ProfileRow icon="lock-closed" label="Password & biometrics" onPress={() => router.push("/profile/security" as never)} />
            <ProfileRow icon="phone-portrait" label="Your devices" onPress={() => router.push("/profile/devices" as never)} />
            <ProfileRow icon="language" label="Language" value="English" onPress={() => toast.info("Language settings", "More languages are coming soon.")} />
          </ProfileSection>

          <ProfileSection title="Support and legal">
            <ProfileRow icon="call" label="Help & support" onPress={() => toast.info("Hook support", "Support options are coming soon.")} neutral />
            <ProfileRow icon="document-text" label="Terms & privacy" onPress={() => toast.info("Terms & privacy", "Legal information will open here.")} neutral />
          </ProfileSection>

          <ProfileSection title="App information">
            <ProfileRow icon="information-circle" label="App version" value={Constants.expoConfig?.version || "1.0.0"} neutral />
            <ProfileRow icon="star" label="Rate this app" onPress={() => toast.info("Thank you", "App Store ratings will be available after release.")} neutral />
          </ProfileSection>

          <Pressable accessibilityRole="button" onPress={() => setLogoutOpen(true)} className="mt-8 min-h-[56px] flex-row items-center justify-center rounded-[12px] border border-red-200 bg-white px-4">
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text className="ml-2 text-[15px] font-bold text-red-600">Log out</Text>
          </Pressable>
          <Text className="mt-3 text-center text-[11px] text-[#A0A0A3]">Signed in as {session.user.email}</Text>
        </View>
      </Animated.ScrollView>

      <Animated.View pointerEvents="box-none" className="absolute inset-x-0 top-0 z-30 border-b border-black/5 bg-white" style={[{ height: insets.top + 58, paddingTop: insets.top }, stickyHeaderStyle]}>
        <View className="flex-1 flex-row items-center px-4">
          <ProfileAvatar name={name} uri={session.user.avatarUrl} size={36} />
          <View className="ml-3 min-w-0 flex-1">
            <Text className="text-[15px] font-bold text-black">{name}</Text>
            <Text className="text-[11px] text-[#8F8F8F]">My profile</Text>
          </View>
          <Pressable accessibilityLabel="Edit profile" onPress={() => router.push("/profile/edit" as never)} className="h-9 w-9 items-center justify-center rounded-full bg-[#FFF3C4]">
            <Ionicons name="create-outline" size={17} color="#111" />
          </Pressable>
        </View>
      </Animated.View>

      <HookConfirmSheet
        visible={logoutOpen}
        title="Log out of Hook?"
        message="You can sign back in anytime. This ends the current session on this device."
        confirmLabel="Log out"
        destructive
        busy={logoutBusy}
        onClose={() => { if (!logoutBusy) setLogoutOpen(false); }}
        onConfirm={handleLogout}
      />
    </>
  );
}
