import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookRefreshIndicator } from "@/components/shared/HookRefreshIndicator";
import { RemoteImage } from "@/components/shared/RemoteImage";
import {
  type PublicCatalogProduct,
  useMarketCategoriesQuery,
  useMarketQuery,
  useMarketsQuery,
  useProductsQuery,
} from "@/lib/mobile-api";

import { CatalogProductCard } from "./CatalogProductCard";
import { rememberSearch } from "@/lib/recent-searches";
import { useDebouncedValue } from "@/lib/use-debounced";
import { BannerCarousel } from "./BannerCarousel";
import { CategoryCircle } from "./CategoryCircle";
import { SKELETON_ITEMS, SkeletonProductCard, isSkeletonItem, type SkeletonItem } from "@/components/motion/Skeleton";
import { HookYellowPattern } from "./HookYellowPattern";
import { MarketSelectionSheet } from "./MarketSelectionSheet";
import { MarketplaceCompactHeader } from "./MarketplaceCompactHeader";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { ProductLayoutToggle, type ProductLayout } from "./ProductLayoutToggle";
import { ScallopedEdge } from "./ScallopedEdge";

const HERO_BODY = 168; // photo height below the status bar
const HERO_OVERLAP = 24;

export function MarketStorefrontScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const marketId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const market = useMarketQuery(marketId);
  const categories = useMarketCategoriesQuery(marketId);
  const markets = useMarketsQuery();
  const [categoryId, setCategoryIdState] = useState("all");
  const [transitioning, setTransitioning] = useState(false);
  const setCategoryId = (next: string) => {
    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 500);
    setCategoryIdState(next);
  };
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<ProductLayout>("grid");
  const [refreshing, setRefreshing] = useState(false);
  const [marketSheetVisible, setMarketSheetVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [searchPinned, setSearchPinned] = useState(false);
  const scrollY = useSharedValue(0);
  const searchAnchorY = useSharedValue(0);
  const headerVisibleValue = useSharedValue(false);
  const searchPinnedValue = useSharedValue(false);
  const compactHeaderHeight = insets.top + 62;
  const heroHeight = insets.top + HERO_BODY;
  const compactHeaderThreshold = heroHeight - compactHeaderHeight;
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const searching = search.trim() !== debouncedSearch;
  const products = useProductsQuery({
    marketId,
    ...(categoryId !== "all" ? { categoryId } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    limit: 50,
  });

  // Items with a deal or open to negotiation surface first as "Popular here".
  const popular = useMemo(
    () =>
      [...(products.data?.data || [])]
        .filter((item) => item.isPurchasable !== false)
        .sort((a, b) => Number(b.discountMinor > 0) + Number(b.negotiationAvailable) - (Number(a.discountMinor > 0) + Number(a.negotiationAvailable)))
        .slice(0, 8),
    [products.data],
  );

  function selectMarket(nextMarketId: string) {
    setMarketSheetVisible(false);
    if (nextMarketId === "all") {
      router.replace("/(tabs)" as never);
      return;
    }
    if (nextMarketId === marketId) return;
    router.replace({
      pathname: "/(app)/markets/[id]",
      params: { id: nextMarketId },
    } as never);
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        products.refetch(),
        market.refetch(),
        categories.refetch(),
        markets.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = event.contentOffset.y;
      scrollY.value = offset;

      const nextHeaderVisible = offset > compactHeaderThreshold;
      if (nextHeaderVisible !== headerVisibleValue.value) {
        headerVisibleValue.value = nextHeaderVisible;
        runOnJS(setHeaderVisible)(nextHeaderVisible);
      }

      if (searchAnchorY.value > 0) {
        const nextSearchPinned =
          offset >= searchAnchorY.value - compactHeaderHeight - 6;
        if (nextSearchPinned !== searchPinnedValue.value) {
          searchPinnedValue.value = nextSearchPinned;
          runOnJS(setSearchPinned)(nextSearchPinned);
        }
      }
    },
  });

  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [compactHeaderThreshold - 28, compactHeaderThreshold + 22],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [compactHeaderThreshold - 28, compactHeaderThreshold + 22],
          [-8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const originalSearchStyle = useAnimatedStyle(() => {
    if (searchAnchorY.value <= 0) return { opacity: 1 };
    const start = searchAnchorY.value - compactHeaderHeight - 6;
    return {
      opacity: interpolate(
        scrollY.value,
        [start - 24, start + 18],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [start - 24, start + 18],
            [0, -8],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const stickySearchStyle = useAnimatedStyle(() => {
    if (searchAnchorY.value <= 0) return { opacity: 0 };
    const start = searchAnchorY.value - compactHeaderHeight - 6;
    return {
      opacity: interpolate(
        scrollY.value,
        [start - 12, start + 28],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [start - 12, start + 28],
            [-10, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  if (market.isLoading) {
    return <HookPageLoading variant="storefront" showBack={false} label="Opening market" />;
  }

  if (!market.data) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F1F1F3] px-8">
        <Text className="text-lg font-black">Market unavailable</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-full bg-[#FFC809] px-6 py-3"
        >
          <Text className="font-bold">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const item = market.data;
  const marketName = item.name || item.shortDisplayName || "Market";
  const marketDisplayName =
    item.shortDisplayName || marketName.trim().split(/\s+/)[0] || marketName;
  const listHeader = (
    <View className="relative">
      <View className="relative overflow-hidden" style={{ height: heroHeight }}>
        <RemoteImage uri={item.imageUrl} />
        <LinearGradient colors={["rgba(0,0,0,.55)", "rgba(0,0,0,.05)", "rgba(0,0,0,.7)"]} className="absolute inset-0" />
        <View className="absolute left-5 right-5 flex-row items-center gap-3" style={{ top: insets.top + 8 }}>
          <HookBackButton />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose market, currently ${marketName}`}
            onPress={() => setMarketSheetVisible(true)}
            className="max-w-[220px]"
          >
            <Text className="text-[10px] font-semibold text-white/80">Choose Market</Text>
            <View className="flex-row items-center">
              <Text numberOfLines={1} className="max-w-[190px] text-[14px] font-bold leading-5 text-white">{marketName}</Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </View>
          </Pressable>
        </View>
        <Text
          numberOfLines={1}
          className="absolute bottom-10 left-5 right-5 font-black text-white"
          style={{ fontSize: 32, lineHeight: 40, includeFontPadding: false }}
        >
          {marketDisplayName}
        </Text>
      </View>

      <View className="relative z-10 overflow-hidden rounded-t-[28px] rounded-b-[28px] bg-[#FFD846] px-4 pb-4 pt-4" style={{ marginTop: -HERO_OVERLAP }}>
        <HookYellowPattern opacity={0.72} />
        <Animated.View
          className="relative z-20"
          onLayout={(event) => {
            searchAnchorY.value = heroHeight - HERO_OVERLAP + event.nativeEvent.layout.y;
          }}
          style={originalSearchStyle}
        >
          <MarketplaceSearch
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch("")}
            onSubmitEditing={() => void rememberSearch(search)}
            autoCorrect={false}
            placeholder={`Search ${marketDisplayName}`}
            iconPosition="right"
            returnKeyType="search"
          />
        </Animated.View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="relative z-10 -mx-4 mt-2"
          contentContainerStyle={{ gap: 4, paddingHorizontal: 12 }}
        >
          <CategoryCircle category={{ publicId: "all", name: "All", slug: "all" }} selected={categoryId === "all"} compact onPress={() => setCategoryId("all")} />
          {(categories.data || []).map((category, index) => (
            <CategoryCircle key={category.publicId} category={category} index={index} selected={categoryId === category.publicId} compact onPress={() => setCategoryId(category.publicId)} />
          ))}
        </ScrollView>
        {categoryId === "all" && !search.trim() ? <BannerCarousel placement="category" className="-mx-4 mt-1" /> : null}
      </View>

      {categoryId === "all" && !search.trim() && popular.length ? (
        <View className="mt-5">
          <Text className="px-4 text-base font-bold text-black">Popular here</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 10 }}>
            {popular.map((entry) => (
              <View key={entry.publicId} style={{ width: 150 }}>
                <CatalogProductCard product={entry} variant="figma" />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View className="mb-3 mt-5 flex-row items-center justify-between px-4">
        <Text className="text-base font-bold">Explore</Text>
        <ProductLayoutToggle value={layout} onChange={setLayout} />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      <Animated.FlatList<PublicCatalogProduct | SkeletonItem>
        key={layout}
        data={products.isLoading || products.isPlaceholderData || transitioning || searching ? SKELETON_ITEMS : products.data?.data || []}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        numColumns={layout === "grid" ? 2 : 1}
        keyExtractor={(product) => product.publicId}
        columnWrapperStyle={layout === "grid" ? { gap: 12, paddingHorizontal: 16, justifyContent: "flex-start" } : undefined}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, gap: layout === "grid" ? 16 : 12 }}
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
        ListHeaderComponent={listHeader}
        renderItem={({ item: product }) => (
          <View
            className={layout === "list" ? "px-4" : ""}
            style={layout === "grid" ? { flexGrow: 1, flexBasis: 0, maxWidth: "48.5%" } : { width: "100%" }}
          >
            {isSkeletonItem(product) ? <SkeletonProductCard /> : <CatalogProductCard product={product} displayMode={layout} />}
          </View>
        )}
        ListEmptyComponent={
          !products.isLoading && !products.isPlaceholderData && !transitioning && !searching ? (
            <View className="mt-20 items-center px-8">
              <Text className="font-bold">{debouncedSearch ? `No results for "${debouncedSearch}"` : "No products found"}</Text>
              <Text className="mt-1 text-center text-sm text-[#777]">
                {debouncedSearch ? `Nothing in ${marketDisplayName} matches that. Check the spelling or try a shorter word.` : "Try another category."}
              </Text>
            </View>
          ) : null
        }
      />

      <HookRefreshIndicator
        visible={refreshing}
        top={insets.top + 8}
      />

      <MarketplaceCompactHeader
        visible={headerVisible}
        title={marketName}
        subtitle="Choose Market"
        onBack={() => router.back()}
        onTitlePress={() => setMarketSheetVisible(true)}
        titleAccessibilityLabel={`Choose market, currently ${marketName}`}
        showActions={false}
        style={compactHeaderStyle}
      />
      <Animated.View
        pointerEvents={searchPinned ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            top: compactHeaderHeight + 10,
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
          placeholder="What are you looking for"
          iconPosition="right"
          returnKeyType="search"
        />
      </Animated.View>

      <MarketSelectionSheet
        visible={marketSheetVisible}
        markets={markets.data || []}
        selectedMarketId={marketId || ""}
        onSelect={selectMarket}
        onClose={() => setMarketSheetVisible(false)}
      />
    </View>
  );
}
