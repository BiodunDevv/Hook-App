import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

import { HookLoader } from "@/components/shared/HookLoader";
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
import { CategoryCircle } from "./CategoryCircle";
import { HookYellowPattern } from "./HookYellowPattern";
import { MarketSelectionSheet } from "./MarketSelectionSheet";
import { MarketplaceCompactHeader } from "./MarketplaceCompactHeader";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { ProductLayoutToggle, type ProductLayout } from "./ProductLayoutToggle";
import { ScallopedEdge } from "./ScallopedEdge";

const HERO_HEIGHT = 326;
const CATEGORY_OVERLAP = 34;
const SEARCH_TOP = HERO_HEIGHT - 74;

export function MarketStorefrontScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const marketId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const market = useMarketQuery(marketId);
  const categories = useMarketCategoriesQuery(marketId);
  const markets = useMarketsQuery();
  const [categoryId, setCategoryId] = useState("all");
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
  const compactHeaderThreshold = HERO_HEIGHT - compactHeaderHeight;
  const products = useProductsQuery({
    marketId,
    ...(categoryId !== "all" ? { categoryId } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
    limit: 50,
  });

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
    return <HookPageLoading label="Opening market" />;
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
      <View className="relative" style={{ height: HERO_HEIGHT, zIndex: 20 }}>
        <View className="relative h-full overflow-hidden">
          <RemoteImage uri={item.imageUrl} />
          <LinearGradient
            colors={["rgba(0,0,0,.55)", "rgba(0,0,0,.04)", "rgba(0,0,0,.72)"]}
            className="absolute inset-0"
          />
          <View
            className="absolute left-5 right-5"
            style={{ top: insets.top + 8 }}
          >
            <HookBackButton />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Choose market, currently ${marketName}`}
              onPress={() => setMarketSheetVisible(true)}
              className="mt-3 max-w-[220px]"
            >
              <Text className="text-[10px] font-semibold text-white/80">
                Choose Market
              </Text>
              <View className="mt-0.5 flex-row items-center">
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  className="max-w-[200px] text-[14px] font-bold leading-5 text-white"
                >
                  {marketName}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#fff"
                />
              </View>
            </Pressable>
          </View>
          <Text
            numberOfLines={1}
            minimumFontScale={0.72}
            className="absolute left-5 right-5 z-10 text-[34px] font-black text-white"
            style={{ top: SEARCH_TOP - 50, lineHeight: 44 }}
          >
            {marketDisplayName}
          </Text>
        </View>
      </View>

      <View
        className="relative z-30 overflow-visible rounded-t-[28px] bg-[#FFD846] px-3 pb-5 pt-10"
        style={{ marginTop: -CATEGORY_OVERLAP }}
      >
        <HookYellowPattern opacity={0.72} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="relative z-10"
          contentContainerStyle={{ gap: 4, paddingHorizontal: 1 }}
        >
          <CategoryCircle
            category={{ publicId: "all", name: "All", slug: "all" }}
            selected={categoryId === "all"}
            compact
            onPress={() => setCategoryId("all")}
          />
          {(categories.data || []).map((category) => (
            <CategoryCircle
              key={category.publicId}
              category={category}
              selected={categoryId === category.publicId}
              compact
              onPress={() => setCategoryId(category.publicId)}
            />
          ))}
        </ScrollView>
        <ScallopedEdge color="#FFD846" count={14} size={30} />
      </View>

      <Animated.View
        className="absolute inset-x-4 z-50"
        onLayout={(event) => {
          searchAnchorY.value = event.nativeEvent.layout.y;
        }}
        style={[{ top: SEARCH_TOP }, originalSearchStyle]}
      >
        <MarketplaceSearch
          value={search}
          onChangeText={setSearch}
          placeholder="What are you looking for"
          iconPosition="right"
          returnKeyType="search"
        />
      </Animated.View>

      <View className="px-4 pt-6">
        <View className="mb-4 mt-5 flex-row items-center justify-between">
          <Text className="text-base font-bold">Explore</Text>
          <ProductLayoutToggle value={layout} onChange={setLayout} />
        </View>
        {products.isLoading ? (
          <HookLoader label="Loading market products" />
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      <Animated.FlatList<PublicCatalogProduct>
        key={layout}
        data={products.data?.data || []}
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
            <CatalogProductCard product={product} displayMode={layout} />
          </View>
        )}
        ListEmptyComponent={
          !products.isLoading ? (
            <View className="mt-20 items-center px-8">
              <Text className="font-bold">No products found</Text>
              <Text className="mt-1 text-center text-sm text-[#777]">
                Try another category or search.
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
