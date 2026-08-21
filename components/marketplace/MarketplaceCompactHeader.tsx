import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated from "react-native-reanimated";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScallopedEdge } from "./ScallopedEdge";
import { HookYellowPattern } from "./HookYellowPattern";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { useCustomerSessionQuery } from "@/lib/mobile-api";
import { isCustomerSession } from "@/lib/session";
import { ProfileAvatar } from "@/components/profile/ProfileComponents";
import { HookBackButton } from "@/components/shared/HookBackButton";

type MarketplaceCompactHeaderProps = {
  title?: string;
  subtitle?: string;
  stateName?: string;
  onBack?: () => void;
  onTitlePress?: () => void;
  titleAccessibilityLabel?: string;
  showActions?: boolean;
  visible?: boolean;
  plain?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function MarketplaceCompactHeader({
  title,
  subtitle,
  stateName,
  onBack,
  onTitlePress,
  titleAccessibilityLabel,
  showActions = true,
  visible = true,
  plain = false,
  style,
}: MarketplaceCompactHeaderProps) {
  const insets = useSafeAreaInsets();
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const hasBack = Boolean(onBack);
  const isHomeHeader = Boolean(stateName) && !hasBack;
  const customer = isCustomerSession(session.data) ? session.data?.user : null;
  const customerName = customer
    ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email
    : "Hook customer";

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          height: insets.top + 62,
          paddingTop: insets.top + 8,
          paddingHorizontal: 14,
          backgroundColor: "#FFD93E",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.28)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
    >
      {!plain ? <HookYellowPattern opacity={0.62} /> : null}

      <ScallopedEdge color="#FFD93E" count={14} size={30} />

      <View className="relative z-10 w-full flex-1 flex-row items-center justify-between">
        <View className="flex-row items-center">
          {hasBack ? (
            <HookBackButton onPress={onBack} />
          ) : (
            <Pressable
              accessibilityLabel="Open notifications"
              onPress={() => isCustomerSession(session.data) ? router.push("/notifications" as never) : openAuth("/notifications" as never)}
              className="h-11 w-11 items-center justify-center rounded-full bg-white"
            >
              <Ionicons name="notifications-outline" size={20} color="#8B6D52" />
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            titleAccessibilityLabel ||
            (stateName ? `Operating state: ${stateName}` : title)
          }
          disabled={!stateName && !onTitlePress}
          onPress={
            stateName ? () => router.push("/states" as never) : onTitlePress
          }
          className={`h-11 items-center justify-center rounded-full px-3 ${
            stateName ? "w-44 flex-none bg-[#FFE58A]" : "mx-2 flex-1"
          }`}
        >
          {stateName ? (
            <View className="flex-row items-center">
              <Ionicons name="location-sharp" size={14} color="#111" />
              <Text
                className="ml-1 max-w-[122px] flex-shrink text-[13px] font-bold leading-4 text-[#111]"
              >
                {stateName}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#777" />
            </View>
          ) : (
            <View className="min-w-0 max-w-[240px] items-center">
              {subtitle ? (
                <Text
                  className="text-[9px] font-medium text-black/60"
                >
                  {subtitle}
                </Text>
              ) : null}
              <Text
                className="max-w-[230px] flex-shrink text-center text-[15px] font-black leading-5 text-[#111]"
              >
                {title}
              </Text>
            </View>
          )}
        </Pressable>

        {showActions ? (
          <View className="flex-row items-center justify-end gap-2">
            {!isHomeHeader ? (
              <Pressable
                accessibilityLabel="Open orders"
                onPress={() => router.push("/orders" as never)}
                className="h-11 w-11 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="cube-outline" size={21} color="#E6B000" />
              </Pressable>
            ) : null}
            {!isHomeHeader ? <Pressable
              accessibilityLabel="Open notifications"
              onPress={() => isCustomerSession(session.data) ? router.push("/notifications" as never) : openAuth("/notifications" as never)}
              className="h-11 w-11 items-center justify-center rounded-full bg-white"
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#8B6D52"
              />
            </Pressable> : null}
            {isHomeHeader ? (
              <Pressable
                accessibilityLabel="Open profile"
                onPress={() => isCustomerSession(session.data) ? router.push("/(tabs)/profile") : openAuth("/(tabs)/profile")}
                className="h-11 w-11 items-center justify-center rounded-full bg-white"
              >
                {customer ? (
                  <ProfileAvatar name={customerName} uri={customer.avatarUrl} size={36} />
                ) : (
                  <Ionicons name="person-outline" size={19} color="#8B6D52" />
                )}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="h-11 w-11" />
        )}
      </View>
    </Animated.View>
  );
}
