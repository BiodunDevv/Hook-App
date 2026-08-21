import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getHookTabBarContentInset } from "@/components/tab-bar/layout";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { HookLoader } from "@/components/shared/HookLoader";
import { HookRefreshIndicator } from "@/components/shared/HookRefreshIndicator";
import { useCategoriesQuery, useCustomerSessionQuery, useDiscoverQuery, useMarketsQuery, type PublicCategory } from "@/lib/mobile-api";
import { useHookLocation } from "@/lib/location-context";

import { MarketDiscoveryCard } from "./MarketDiscoveryCard";
import { CategoryCircle } from "./CategoryCircle";
import { HomeSearchOverlay } from "./HomeSearchOverlay";
import { HookYellowPattern } from "./HookYellowPattern";
import { MarketplaceCompactHeader } from "./MarketplaceCompactHeader";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { isCustomerSession } from "@/lib/session";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { ScallopedEdge } from "./ScallopedEdge";
import { ProfileAvatar } from "@/components/profile/ProfileComponents";

const HOOK_APP_ICON = require("../../assets/images/app-icon.png");

export function MarketplaceHomeScreen() {
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const insets = useSafeAreaInsets();
  const { selectedState, stateParams } = useHookLocation();
  const categoriesQuery = useCategoriesQuery();
  const marketsQuery = useMarketsQuery(stateParams);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [searchPinned, setSearchPinned] = useState(false);
  const scrollY = useSharedValue(0);
  const marketSectionY = useSharedValue(0);
  const headerVisibleValue = useSharedValue(false);
  const searchPinnedValue = useSharedValue(false);
  const categoryStripHeight = useSharedValue(120);
  const categoryStripMeasured = useSharedValue(false);
  const compactHeaderHeight = insets.top + 62;
  const displayCategories = useMemo<PublicCategory[]>(() => {
    const categories = categoriesQuery.data || [];
    const comingSoon: PublicCategory = {
      publicId: "categories-coming-soon",
      name: "More coming soon",
      slug: "categories-coming-soon",
      isComingSoon: true,
    };
    return categories.length ? [...categories.slice(0, 6), comingSoon] : [comingSoon];
  }, [categoriesQuery.data]);

  const markets = useMemo(() => {
    const value = search.trim().toLowerCase();
    return (marketsQuery.data || []).filter(
      (market) =>
        !value ||
        `${market.name} ${market.address || ""}`.toLowerCase().includes(value),
    );
  }, [marketsQuery.data, search]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(timeout);
  }, [search]);

  const searchActive = search.trim().length > 0;
  const discoverQuery = useDiscoverQuery(
    { q: debouncedSearch, ...stateParams, limit: 24 },
    Boolean(debouncedSearch),
  );

  const matchedMarkets = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return [];
    return (marketsQuery.data || [])
      .filter((market) => `${market.name} ${market.address || ""}`.toLowerCase().includes(value))
      .slice(0, 4);
  }, [marketsQuery.data, search]);

  const matchedProducts = useMemo(
    () => (discoverQuery.data?.products || []).slice(0, 6),
    [discoverQuery.data],
  );

  const matchedCategories = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return [];
    return (categoriesQuery.data || [])
      .filter((category) => category.name.toLowerCase().includes(value))
      .slice(0, 4);
  }, [categoriesQuery.data, search]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = event.contentOffset.y;
      scrollY.value = offset;

      const nextHeaderVisible = offset > 42;
      if (nextHeaderVisible !== headerVisibleValue.value) {
        headerVisibleValue.value = nextHeaderVisible;
        runOnJS(setHeaderVisible)(nextHeaderVisible);
      }

      if (marketSectionY.value > 0) {
        const searchStart = marketSectionY.value + 92 - compactHeaderHeight;
        const nextSearchPinned = offset >= searchStart;
        if (nextSearchPinned !== searchPinnedValue.value) {
          searchPinnedValue.value = nextSearchPinned;
          runOnJS(setSearchPinned)(nextSearchPinned);
        }
      }
    },
  });

  const categoryStripStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, 118],
      [categoryStripHeight.value, 0],
      Extrapolation.CLAMP,
    ),
    opacity: interpolate(
      scrollY.value,
      [0, 54, 118],
      [1, 0.72, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 118],
          [0, -18],
          Extrapolation.CLAMP,
        ),
      },
    ],
    overflow: "hidden",
  }));

  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [36, 86], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [36, 86],
          [-8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const originalSearchStyle = useAnimatedStyle(() => {
    if (marketSectionY.value <= 0) return { opacity: 1 };
    const searchStart = marketSectionY.value + 92 - compactHeaderHeight;
    return {
      opacity: interpolate(
      scrollY.value,
      [searchStart - 28, searchStart + 18],
      [1, 0],
      Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [searchStart - 28, searchStart + 18],
            [0, -8],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const stickySearchStyle = useAnimatedStyle(() => {
    if (marketSectionY.value <= 0) return { opacity: 0 };
    const searchStart = marketSectionY.value + 92 - compactHeaderHeight;
    return {
      opacity: interpolate(
        scrollY.value,
        [searchStart - 14, searchStart + 28],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [searchStart - 14, searchStart + 28],
            [-10, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([categoriesQuery.refetch(), marketsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const customer = isCustomerSession(session.data) ? session.data?.user : null;
  const customerName = customer
    ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email
    : "Hook customer";

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      <Animated.ScrollView
        onScroll={onScroll}
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
        contentContainerStyle={{ paddingBottom: getHookTabBarContentInset(insets.bottom) }}
      >
        <View className="relative bg-[#FFD93E]">
          <View
            className="overflow-hidden px-4 pb-5"
            style={{ paddingTop: insets.top + 8, zIndex: 1 }}
          >
            <HookYellowPattern />
            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityLabel="Open notifications"
                onPress={() => isCustomerSession(session.data) ? router.push("/notifications" as never) : openAuth("/notifications" as never)}
                className="h-11 w-11 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="notifications-outline" size={20} color="#8B6D52" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Operating state: ${selectedState.name}`}
                onPress={() => router.push("/states" as never)}
                className="h-11 min-w-[180px] flex-row items-center justify-center rounded-full bg-[#FFE58A] px-4"
              >
                <Ionicons name="location-sharp" size={14} color="#111" />
                <Text
                  numberOfLines={1}
                  className="mx-1 max-w-[145px] text-[11px] font-bold text-black"
                >
                  {selectedState.name}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#111" />
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityLabel="Open profile"
                  onPress={() => isCustomerSession(session.data) ? router.push("/(tabs)/profile") : openAuth("/(tabs)/profile")}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white"
                >
                  {customer ? (
                    <View className="rounded-full border-2 border-white bg-hook">
                      <ProfileAvatar name={customerName} uri={customer.avatarUrl} size={36} />
                    </View>
                  ) : (
                    <Ionicons name="person-outline" size={19} color="#8B6D52" />
                  )}
                </Pressable>
              </View>
            </View>

            <Animated.View
              className="-mx-4 overflow-hidden"
              onLayout={(event) => {
                if (!categoryStripMeasured.value) {
                  categoryStripHeight.value = event.nativeEvent.layout.height;
                  categoryStripMeasured.value = true;
                }
              }}
              style={categoryStripStyle}
            >
              {categoriesQuery.isLoading ? (
                <View className="h-28 items-center justify-center">
                  <HookLoader size="inline" />
                </View>
            ) : (
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 5,
                  paddingTop: 17,
                  paddingHorizontal: 0,
                }}
              >
                {displayCategories.map((category) => (
                  <CategoryCircle
                    key={category.publicId}
                    category={category}
                    onPress={() => {
                      if (category.isComingSoon) return;
                      router.push({
                        pathname: "/shop/[categoryId]",
                        params: { categoryId: category.publicId },
                      } as never);
                    }}
                  />
                ))}
              </Animated.ScrollView>
              )}
            </Animated.View>
          </View>
          <ScallopedEdge color="#FFD93E" zIndex={20} />
        </View>

        <View
          className="px-4 pt-8"
          onLayout={(event) => {
            marketSectionY.value = event.nativeEvent.layout.y;
          }}
        >
          <View className="mb-2 flex-row items-center">
            <View className="min-w-0 flex-1 pr-2">
              <Text
                className="text-[30px] font-black text-black"
                style={{ lineHeight: 36 }}
              >
                Get into the{"\n"}market
              </Text>
            </View>
            <Image
              source={HOOK_APP_ICON}
              contentFit="contain"
              accessibilityLabel="Hook"
              style={{ width: 76, height: 76, borderRadius: 18, flexShrink: 0 }}
            />
          </View>
          <Animated.View style={originalSearchStyle}>
            <MarketplaceSearch
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch("")}
              placeholder="What are you looking for"
              returnKeyType="search"
            />
            <HomeSearchOverlay
              visible={searchActive}
              query={debouncedSearch || search.trim()}
              loading={discoverQuery.isFetching}
              markets={matchedMarkets}
              products={matchedProducts}
              categories={matchedCategories}
            />
          </Animated.View>
          <View className="mt-4 gap-4">
            {marketsQuery.isLoading ? (
              <View className="h-56 items-center justify-center">
                <HookLoader label="Finding markets" />
              </View>
            ) : null}
            {!marketsQuery.isLoading &&
              markets.map((market, index) => (
                <MarketDiscoveryCard
                  key={market.publicId}
                  market={market}
                  index={index}
                />
              ))}
            {!marketsQuery.isLoading && !markets.length ? (
              <View className="items-center rounded-2xl bg-white px-6 py-12">
                <Ionicons name="storefront-outline" size={32} color="#AAA" />
                <Text className="mt-3 text-base font-bold">
                  No markets found
                </Text>
                <Text className="mt-1 text-center text-sm text-[#777]">
                  Try another search or select All States.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.ScrollView>

      <HookRefreshIndicator
          visible={refreshing}
        top={insets.top + 8}
      />

      <MarketplaceCompactHeader
        visible={headerVisible}
        stateName={selectedState.name}
        style={compactHeaderStyle}
      />

      <Animated.View
        pointerEvents={searchPinned ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            top: compactHeaderHeight + 16,
            left: 16,
            right: 16,
            zIndex: 35,
            padding: 1,
            borderRadius: 18,
            backgroundColor: "#F1F1F3",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
          stickySearchStyle,
        ]}
      >
        <MarketplaceSearch
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
          placeholder="What are you looking for"
          returnKeyType="search"
        />
      </Animated.View>
    </View>
  );
}
