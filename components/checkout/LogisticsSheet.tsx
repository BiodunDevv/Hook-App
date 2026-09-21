import { Ionicons } from "@expo/vector-icons";
import { SkeletonRows } from "@/components/motion/Skeleton";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { BottomSheetScrollView as ScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckoutSheet } from "./CheckoutSheet";
import { HookLoader } from "@/components/shared/HookLoader";
import type { LogisticsProvider } from "@/lib/mobile-api";

export function LogisticsSheet({
  visible,
  providers,
  loading,
  error = false,
  onRetry,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  providers: LogisticsProvider[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  selectedId?: string;
  onSelect: (provider: LogisticsProvider) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <CheckoutSheet visible={visible} onClose={onClose} title="Choose logistics">
      {loading ? (
        <View style={{ marginHorizontal: -16 }} accessibilityLiveRegion="polite">
          <SkeletonRows count={3} label="Loading delivery options" />
        </View>
      ) : error ? (
        <View style={{ padding: 24, alignItems: "center", gap: 16 }}>
          <Text style={{ color: "#666", textAlign: "center" }}>Couldn’t load delivery options. Please try again.</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: "#FFC809" }}>
            <Text style={{ color: "#111", fontFamily: "NunitoSans-Bold" }}>Retry</Text>
          </Pressable>
        </View>
      ) : !providers.length ? (
        <View className="items-center py-10">
          <Ionicons name="cube-outline" size={30} color="#777" />
          <Text className="mt-3 text-base font-bold text-black">No delivery options yet</Text>
          <Text className="mt-1 text-center text-sm text-[#666]">
            Hook is setting up couriers for your area. Please try again shortly.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12 }}>
            {providers.map((provider) => {
              const id = provider.publicId || provider.id;
              const active = id === selectedId;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(provider)}
                  className={`flex-row items-center justify-between rounded-[10px] px-4 py-2.5 ${active ? "border border-hook bg-[#fff9e5]" : "bg-white"}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: active ? "#FFC809" : "#DDD", backgroundColor: active ? "#FFF9E5" : "white" }}
                >
                  {/* expo-image renders the SVG marks couriers publish; the
                      fallback tile keeps the row aligned when one has no logo. */}
                  {provider.logoUrl ? (
                    <Image
                      source={{ uri: provider.logoUrl }}
                      style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "white" }}
                      contentFit="contain"
                      transition={120}
                      accessibilityLabel={`${provider.name} logo`}
                    />
                  ) : (
                    <View
                      style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#F1F1F3", alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="cube-outline" size={20} color="#777" />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text className="text-base leading-7 text-[#111]">{provider.name}</Text>
                    {provider.description ? (
                      <Text className="text-xs text-[#777]">{provider.description}</Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {active ? <Ionicons name="checkmark-circle" size={20} color="#FFC809" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-6 text-center text-xs text-[#30b940]">
            Your money is protected with hook until you receive your order
          </Text>
        </ScrollView>
      )}
    </CheckoutSheet>
  );
}
