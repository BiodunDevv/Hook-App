import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookLoader } from "@/components/shared/HookLoader";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookRefreshIndicator } from "@/components/shared/HookRefreshIndicator";
import { useHookLocation } from "@/lib/location-context";
import {
  useHomeFeedQuery,
  useCategoriesQuery,
  useMarketsQuery,
  useProductsQuery,
  type PublicCatalogProduct,
} from "@/lib/mobile-api";

import { CatalogProductCard } from "./CatalogProductCard";
import { MarketSelectionSheet } from "./MarketSelectionSheet";
import { HookYellowPattern } from "./HookYellowPattern";
import { MarketplaceCompactHeader } from "./MarketplaceCompactHeader";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { ProductLayoutToggle, type ProductLayout } from "./ProductLayoutToggle";
import { ScallopedEdge } from "./ScallopedEdge";

const FIGMA_CATEGORY_VECTOR = require("../../assets/images/figma/category-vector-3452.svg");
const FIGMA_MARKET_ART = require("../../assets/images/figma/category-market-art.png");
const CATEGORY_HERO_HEIGHT = 286;

export function CategoryStorefrontScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const insets = useSafeAreaInsets();
  const { stateParams } = useHookLocation();
  const routeCategoryId = Array.isArray(categoryId)
    ? categoryId[0]
    : categoryId;
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    routeCategoryId || "all",
  );
  const [marketId, setMarketId] = useState("all");
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

  const categoriesQuery = useCategoriesQuery();
  const marketsQuery = useMarketsQuery(stateParams);
  const homeFeedQuery = useHomeFeedQuery(stateParams);
  const categoryIdForQuery =
    selectedCategoryId !== "all" ? selectedCategoryId : undefined;
  const category = useMemo(
    () =>
      categoriesQuery.data?.find(
        (item) => item.publicId === selectedCategoryId,
      ),
    [categoriesQuery.data, selectedCategoryId],
  );
  const selectedMarket = marketsQuery.data?.find(
    (item) => item.publicId === marketId,
  );
  const productsQuery = useProductsQuery({
    ...stateParams,
    ...(categoryIdForQuery ? { categoryId: categoryIdForQuery } : {}),
    ...(marketId !== "all" ? { marketId } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
    limit: 50,
  });
  const products = productsQuery.data?.data || [];
  const flashDeals = homeFeedQuery.data?.flashDeals?.slice(0, 2) || [];
  const marketLabel =
    selectedMarket?.shortDisplayName || selectedMarket?.name || "All markets";
  const categoryDisplayName = useMemo(() => {
    const name = (category?.name || "All categories").trim();
    return name.split(/\s+/)[0] || "All";
  }, [category?.name]);

  useEffect(() => {
    setSelectedCategoryId(routeCategoryId || "all");
  }, [routeCategoryId]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = event.contentOffset.y;
      scrollY.value = offset;

      const nextHeaderVisible = offset > 52;
      if (nextHeaderVisible !== headerVisibleValue.value) {
        headerVisibleValue.value = nextHeaderVisible;
        runOnJS(setHeaderVisible)(nextHeaderVisible);
      }

      if (searchAnchorY.value > 0) {
        const nextSearchPinned =
          offset >= searchAnchorY.value - compactHeaderHeight - 8;
        if (nextSearchPinned !== searchPinnedValue.value) {
          searchPinnedValue.value = nextSearchPinned;
          runOnJS(setSearchPinned)(nextSearchPinned);
        }
      }
    },
  });

  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [42, 90], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [42, 90],
          [-8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const originalSearchStyle = useAnimatedStyle(() => {
    if (searchAnchorY.value <= 0) return { opacity: 1 };
    const start = searchAnchorY.value - compactHeaderHeight - 8;
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
    const start = searchAnchorY.value - compactHeaderHeight - 8;
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

  function selectCategory(nextCategoryId: string) {
    if (nextCategoryId === selectedCategoryId) return;
    setSelectedCategoryId(nextCategoryId);
    router.setParams({ categoryId: nextCategoryId });
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        productsQuery.refetch(),
        categoriesQuery.refetch(),
        marketsQuery.refetch(),
        homeFeedQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  if (categoriesQuery.isLoading && !category) {
    return <HookPageLoading label="Opening category" />;
  }

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      <Animated.FlatList<PublicCatalogProduct>
        key={layout}
        data={products}
        numColumns={layout === "grid" ? 2 : 1}
        keyExtractor={(item) => item.publicId}
        onScroll={onScroll}
        scrollEventThrottle={16}
        columnWrapperStyle={layout === "grid" ? { gap: 12, paddingHorizontal: 16, justifyContent: "flex-start" } : undefined}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, gap: layout === "grid" ? 18 : 12 }}
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
        ListHeaderComponent={
          <View>
            <View
              className="relative overflow-visible bg-[#FFDA55] px-4"
              style={{
                height: CATEGORY_HERO_HEIGHT,
                paddingTop: insets.top + 8,
              }}
            >
              <HookYellowPattern />

              <View className="relative z-10 flex-1">
                <View className="absolute left-0 top-0 z-10 w-[170px]">
                  <HookBackButton />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Choose market, currently ${marketLabel}`}
                    onPress={() => setMarketSheetVisible(true)}
                    className="mt-3 max-w-[158px]"
                  >
                    <Text className="text-[10px] text-black/65">
                      Choose Market
                    </Text>
                    <View className="mt-0.5 flex-row items-center">
                      <Text
                        numberOfLines={1}
                        className="max-w-[135px] text-[14px] font-bold text-black"
                      >
                        {marketLabel}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color="#111" />
                    </View>
                  </Pressable>

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    className="mt-4 max-w-[150px] text-[34px] font-black leading-9 text-black"
                  >
                    {categoryDisplayName}
                  </Text>
                </View>

                <View className="absolute -right-4 -top-3 h-[170px] w-[210px]">
                  <Image
                    source={FIGMA_CATEGORY_VECTOR}
                    contentFit="fill"
                    accessibilityLabel="Hook category artwork frame"
                    style={{
                      position: "absolute",
                      right: -108,
                      top: -26,
                      width: 411,
                      height: 209,
                    }}
                  />
                  <Image
                    source={FIGMA_MARKET_ART}
                    contentFit="contain"
                    accessibilityLabel="Hook market illustration"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: -4,
                      width: 146,
                      height: 164,
                    }}
                  />
                </View>
              </View>

              <Animated.View
                className="absolute inset-x-4 bottom-[30px] z-30"
                onLayout={(event) => {
                  searchAnchorY.value = event.nativeEvent.layout.y;
                }}
                style={originalSearchStyle}
              >
                <MarketplaceSearch
                  value={search}
                  onChangeText={setSearch}
                  iconPosition="right"
                  placeholder="What are you looking for"
                  returnKeyType="search"
                />
              </Animated.View>
              <ScallopedEdge color="#FFDA55" count={14} size={30} />
            </View>

            <View className="pt-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 7, paddingHorizontal: 16 }}
              >
                <Choice
                  label="All"
                  active={selectedCategoryId === "all"}
                  onPress={() => selectCategory("all")}
                />
                {(categoriesQuery.data || []).map((item) => (
                  <Choice
                    key={item.publicId}
                    label={item.name}
                    active={item.publicId === selectedCategoryId}
                    onPress={() => selectCategory(item.publicId)}
                  />
                ))}
              </ScrollView>
            </View>

            <View className="mt-5 flex-row items-center justify-between px-4">
              <Text className="text-base font-medium text-black">Explore</Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityLabel="Choose market"
                  onPress={() => setMarketSheetVisible(true)}
                  className="h-9 max-w-[170px] flex-row items-center rounded-lg border border-black/5 bg-white px-3"
                >
                  <Ionicons name="storefront-outline" size={15} color="#111" />
                  <Text
                    numberOfLines={1}
                    className="ml-1.5 flex-shrink text-[11px] font-semibold text-black"
                  >
                    {marketLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#777" />
                </Pressable>
                <ProductLayoutToggle value={layout} onChange={setLayout} />
              </View>
            </View>

            {productsQuery.isLoading ? (
              <View className="h-36 items-center justify-center">
                <HookLoader label="Loading products" />
              </View>
            ) : null}

            {flashDeals.length ? (
              <FlashSalePreview products={flashDeals} />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View
            className={layout === "list" ? "px-4" : ""}
            style={layout === "grid" ? { flexGrow: 1, flexBasis: 0, maxWidth: "48.5%" } : { width: "100%" }}
          >
            <CatalogProductCard product={item} variant="figma" displayMode={layout} />
          </View>
        )}
        ListEmptyComponent={
          !productsQuery.isLoading ? (
            <View className="mt-16 items-center px-8">
              <Ionicons name="bag-handle-outline" size={32} color="#999" />
              <Text className="mt-3 text-base font-bold text-black">
                No products found
              </Text>
              <Text className="mt-1 text-center text-sm text-[#777]">
                Try another market or search term.
              </Text>
            </View>
          ) : null
        }
      />

      <HookRefreshIndicator
        visible={
          refreshing
        }
        top={insets.top + 8}
      />

      <MarketplaceCompactHeader
        visible={headerVisible}
        title={marketLabel}
        subtitle="Choose Market"
        onBack={() => router.back()}
        onTitlePress={() => setMarketSheetVisible(true)}
        titleAccessibilityLabel={`Choose market, currently ${marketLabel}`}
        showActions={false}
        style={compactHeaderStyle}
      />
      <Animated.View
        pointerEvents={searchPinned ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            top: compactHeaderHeight + 12,
            left: 16,
            right: 16,
            zIndex: 35,
          },
          stickySearchStyle,
        ]}
      >
        <MarketplaceSearch
          value={search}
          onChangeText={setSearch}
          iconPosition="right"
          placeholder="What are you looking for"
          returnKeyType="search"
        />
      </Animated.View>

      <MarketSelectionSheet
        visible={marketSheetVisible}
        markets={marketsQuery.data || []}
        selectedMarketId={marketId}
        onSelect={setMarketId}
        onClose={() => setMarketSheetVisible(false)}
      />
    </View>
  );
}

function FlashSalePreview({ products }: { products: PublicCatalogProduct[] }) {
  return (
    <View className="mx-4 mt-5 overflow-hidden rounded-[22px] bg-[#FFDA55] p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[24px] font-black text-black">BIG SALE</Text>
          <Text className="mt-0.5 text-[11px] font-medium text-black/60">
            Limited Hook prices
          </Text>
        </View>
        <Ionicons name="sparkles" size={25} color="#111" />
      </View>
      <View className="mt-3 flex-row gap-3">
        {products.map((product) => (
          <View key={product.publicId} className="flex-1">
            <CatalogProductCard product={product} variant="figma" compact />
          </View>
        ))}
      </View>
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-3 ${active ? "bg-[#FFC809]" : "bg-white"}`}
    >
      <Text
        numberOfLines={1}
        className={`text-[11px] font-bold ${active ? "text-black" : "text-[#6B7280]"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
