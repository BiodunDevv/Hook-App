import Constants from "expo-constants";
import { centeredHeaderTextStyle } from "@/constants/design-tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { useCreditsQuery } from "@/lib/mobile-api";
import { unregisterPushToken } from "@/lib/push";
import { clearSession } from "@/lib/session";
import { getHookTabBarContentInset } from "@/components/tab-bar/layout";

const SIGNED_OUT_BENEFITS: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
}[] = [
  { icon: "cube-outline", title: "Track every order", description: "Follow each order from Market pickup to your door." },
  { icon: "location-outline", title: "Saved addresses", description: "Check out faster with your delivery details ready." },
  { icon: "heart-outline", title: "Products you love", description: "Keep the pieces you are still thinking about." },
  { icon: "pricetags-outline", title: "Negotiate prices", description: "Agree a better price directly with Hook Markets." },
];

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
  const credits = useCreditsQuery(Boolean(session));
  const creditsLabel = credits.data
    ? `₦${Math.round(Number(credits.data.balanceMinor || 0) / 100).toLocaleString("en-NG")}`
    : undefined;

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  // Opening Profile signed out should go straight to sign-in rather than
  // making the user tap through the placeholder. The ref keeps it to one
  // prompt per visit, so dismissing the sheet doesn't immediately reopen it.
  const promptedThisVisit = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!local.isFetching && !session && !promptedThisVisit.current) {
      promptedThisVisit.current = true;
      openAuth("/(tabs)/profile");
    }
    return () => {
      promptedThisVisit.current = false;
    };
  }, [local.isFetching, session, openAuth]));

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
      <View className="flex-1 bg-[#F4F4F5]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="h-11 w-11" />
          <Text style={centeredHeaderTextStyle}>Profile</Text>
          <View className="h-11 w-11" />
        </View>

        <View className="mx-4 mt-3 overflow-hidden rounded-[24px] bg-[#171717] p-5">
          <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-white/10">
            <Ionicons name="person" size={22} color="#FFC809" />
          </View>
          <Text className="mt-5 text-[22px] font-black text-white">Your Hook account</Text>
          <Text className="mt-2 text-[13px] leading-5 text-white/60">
            Sign in to track orders, save delivery addresses, keep the products you love and negotiate prices with Hook Markets.
          </Text>
        </View>

        <View
          className="mx-4 mt-4 rounded-[24px] bg-white p-5"
          style={{ marginBottom: getHookTabBarContentInset(insets.bottom) }}
        >
          {SIGNED_OUT_BENEFITS.map((benefit, index) => (
            <View
              key={benefit.title}
              className={`flex-row items-center gap-3 ${index ? "mt-4 border-t border-[#F0F0F1] pt-4" : ""}`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#F4F4F5]">
                <Ionicons name={benefit.icon} size={19} color="#111" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-black text-black">{benefit.title}</Text>
                <Text className="mt-0.5 text-[12px] leading-4 text-[#77777B]">{benefit.description}</Text>
              </View>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => openAuth("/(tabs)/profile")}
            className="mt-6 h-[52px] items-center justify-center rounded-full bg-hook active:opacity-90"
          >
            <Text className="font-black text-black">Sign in or create account</Text>
          </Pressable>
          <Text className="mt-3 text-center text-[11px] leading-4 text-[#A0A0A3]">
            It only takes a moment, and your cart stays exactly as you left it.
          </Text>
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

          <ProfileSection title="Rewards">
            <ProfileRow
              icon="wallet"
              label="Hook credit"
              value={creditsLabel}
              onPress={() => router.push("/credits" as never)}
            />
            <ProfileRow icon="gift" label="Refer a friend" onPress={() => router.push("/referrals" as never)} />
          </ProfileSection>

          <ProfileSection title="Security">
            <ProfileRow icon="lock-closed" label="Password & biometrics" onPress={() => router.push("/profile/security" as never)} />
            <ProfileRow icon="notifications" label="Notifications" onPress={() => router.push("/profile/notifications" as never)} />
            <ProfileRow icon="phone-portrait" label="Your devices" onPress={() => router.push("/profile/devices" as never)} />
            <ProfileRow icon="language" label="Language" value="English" onPress={() => toast.info("Language settings", "More languages are coming soon.")} />
          </ProfileSection>

          <ProfileSection title="Support and legal">
            <ProfileRow icon="call" label="Help & support" onPress={() => toast.info("Hook support", "Support options are coming soon.")} neutral />
            <ProfileRow icon="document-text" label="Terms of Service" onPress={() => router.push("/legal/terms" as never)} neutral />
            <ProfileRow icon="shield-checkmark" label="Privacy Policy" onPress={() => router.push("/legal/privacy" as never)} neutral />
            <ProfileRow icon="refresh-circle" label="Returns Policy" onPress={() => router.push("/legal/returns" as never)} neutral />
            <ProfileRow icon="trash" label="Delete account" onPress={() => router.push("/profile/delete-account" as never)} danger />
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
