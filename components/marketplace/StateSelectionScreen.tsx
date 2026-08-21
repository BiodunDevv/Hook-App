import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookLoader } from "@/components/shared/HookLoader";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookRefreshIndicator } from "@/components/shared/HookRefreshIndicator";
import {
  ALL_STATES,
  type HookOperatingState,
  useHookLocation,
} from "@/lib/location-context";
import { useOperatingStatesQuery } from "@/lib/mobile-api";

import { HookYellowPattern } from "./HookYellowPattern";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { ScallopedEdge } from "./ScallopedEdge";

export function StateSelectionScreen() {
  const insets = useSafeAreaInsets();
  const query = useOperatingStatesQuery();
  const { selectedState, selectState } = useHookLocation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [compactHeaderVisible, setCompactHeaderVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const states = useMemo(() => {
    const source = [
      ALL_STATES,
      ...((query.data as HookOperatingState[] | undefined) || []),
    ];
    const value = search.trim().toLowerCase();
    return source.filter(
      (state) =>
        !value || `${state.name} ${state.code}`.toLowerCase().includes(value),
    );
  }, [query.data, search]);
  const showMoreComingSoon = Boolean(query.data && query.data.length < 37);

  async function choose(state: HookOperatingState) {
    await selectState(state);
    router.back();
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [110, 155],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const compactHeaderTranslateY = scrollY.interpolate({
    inputRange: [110, 155],
    outputRange: [-12, 0],
    extrapolate: "clamp",
  });

  const hero = (
    <>
      <View
        className="relative overflow-visible bg-[#FFDA55] px-4 pb-7"
        style={{ paddingTop: insets.top + 10 }}
      >
        <HookYellowPattern />
        <View className="relative z-10 flex-row items-center justify-between">
          <HookBackButton />
          <Text className="text-[18px] font-black text-black">
            Select state
          </Text>
          <View className="h-11 w-11 items-center justify-center rounded-full border border-black/5 bg-white/80">
            <Ionicons name="location-sharp" size={20} color="#8B6D52" />
          </View>
        </View>
        <Text className="relative z-10 mt-5 text-[30px] font-black text-black">
          {selectedState.name}
        </Text>
        <Text className="relative z-10 mt-1 text-sm text-black/60">
          Choose where you would like to discover Hook markets.
        </Text>
        <View className="relative z-10 mt-4">
          <MarketplaceSearch
            value={search}
            onChangeText={setSearch}
            placeholder="Search states"
            autoCapitalize="words"
            returnKeyType="search"
          />
        </View>
        <ScallopedEdge color="#FFDA55" count={14} size={30} />
      </View>

      <View className="px-4 pb-3 pt-7">
        <Text className="text-base font-bold text-black">Available states</Text>
        <Text className="mt-1 text-sm text-[#777]">
          Select All States to browse every active Hook market.
        </Text>
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      <Animated.FlatList
        data={states}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{
          gap: 10,
          paddingBottom: insets.bottom + 30,
        }}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: any) => {
              const next = event.nativeEvent.contentOffset.y >= 112;
              if (next !== compactHeaderVisible) setCompactHeaderVisible(next);
            },
          },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="transparent"
            colors={["transparent"]}
            progressBackgroundColor="transparent"
            progressViewOffset={insets.top + 8}
            onRefresh={() => void refresh()}
          />
        }
        ListHeaderComponent={hero}
        renderItem={({ item }) => {
          const selected = selectedState.code === item.code;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => void choose(item)}
              className={`mx-4 min-h-14 flex-row items-center rounded-2xl px-4 ${selected ? "bg-[#FFC809]" : "bg-white"}`}
            >
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-white/70" : "bg-[#F1F1F3]"}`}
              >
                <Ionicons
                  name={item.code === "ALL" ? "earth" : "location"}
                  size={18}
                  color="#111"
                />
              </View>
              <Text className="ml-3 flex-1 text-[15px] font-semibold text-black">
                {item.name}
              </Text>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color="#111" />
              ) : (
                <Text className="text-xs font-bold text-[#999]">
                  {item.code}
                </Text>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="items-center py-24">
              <HookLoader label="Loading states" />
            </View>
          ) : (
            <View className="items-center py-24">
              <Text className="font-bold text-black">No states found</Text>
              <Text className="mt-1 text-sm text-[#777]">
                Try another search.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          showMoreComingSoon ? (
            <View className="mx-4 mt-2 flex-row items-center rounded-2xl border border-[#F0D979] bg-[#FFF9DC] px-4 py-4">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#FFE88B]">
                <Ionicons name="time-outline" size={18} color="#665100" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-black text-[#665100]">More States coming soon</Text>
                <Text className="mt-0.5 text-xs leading-4 text-[#806D25]">Hook is expanding to more operating locations.</Text>
              </View>
            </View>
          ) : null
        }
      />

      <HookRefreshIndicator
        visible={refreshing}
        top={insets.top + 8}
      />

      <Animated.View
        pointerEvents={compactHeaderVisible ? "auto" : "none"}
        className="absolute inset-x-0 top-0 z-30 border-b border-black/5 bg-[#FFDA55] px-4 pb-3"
        style={{
          opacity: compactHeaderOpacity,
          paddingTop: insets.top + 8,
          transform: [{ translateY: compactHeaderTranslateY }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 8,
          overflow: "visible",
        }}
      >
        <HookYellowPattern opacity={0.72} />
        <View className="relative z-10 h-11 flex-row items-center justify-between">
          <HookBackButton className="h-10 w-10" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Current state: ${selectedState.name}`}
            className="h-10 max-w-[68%] flex-row items-center rounded-full border border-white/60 bg-white/90 px-4"
          >
            <Ionicons name="location" size={16} color="#111" />
            <Text className="ml-2 flex-shrink text-[14px] font-bold text-black" numberOfLines={1}>
              {selectedState.name}
            </Text>
          </Pressable>
          <View className="h-10 w-10" />
        </View>
        <View className="relative z-10 mt-2">
          <MarketplaceSearch
            value={search}
            onChangeText={setSearch}
            placeholder="Search states"
            autoCapitalize="words"
            returnKeyType="search"
          />
        </View>
        <ScallopedEdge color="#FFDA55" count={14} size={30} />
      </Animated.View>
    </View>
  );
}
