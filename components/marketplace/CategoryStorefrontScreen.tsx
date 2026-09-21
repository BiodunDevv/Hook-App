import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/lib/haptics";
import { Image, Image as ExpoImage } from "expo-image";
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
  FadeInDown,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RemoteImage } from "@/components/shared/RemoteImage";
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
import { BannerCarousel } from "./BannerCarousel";
import { CategoryCircle } from "./CategoryCircle";
import { SKELETON_ITEMS, SkeletonProductCard, isSkeletonItem, type SkeletonItem } from "@/components/motion/Skeleton";
import { MarketSelectionSheet } from "./MarketSelectionSheet";
import { HookYellowPattern } from "./HookYellowPattern";
import { MarketplaceCompactHeader } from "./MarketplaceCompactHeader";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { ProductLayoutToggle, type ProductLayout } from "./ProductLayoutToggle";

const FIGMA_MARKET_ART = require("../../assets/images/figma/category-market-art.png");

type SortKey = "newest" | "price_asc" | "price_desc" | "negotiable";
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "negotiable", label: "Negotiable first" },
];

type PriceBand = "any" | "under20" | "20to50" | "50to100" | "over100";
const PRICE_BANDS: Array<{ key: PriceBand; label: string; min: number; max: number }> = [
  { key: "any", label: "Any price", min: 0, max: Infinity },
  { key: "under20", label: "Under ₦20k", min: 0, max: 20_000 },
  { key: "20to50", label: "₦20k – ₦50k", min: 20_000, max: 50_000 },
  { key: "50to100", label: "₦50k – ₦100k", min: 50_000, max: 100_000 },
  { key: "over100", label: "Over ₦100k", min: 100_000, max: Infinity },
];

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
  const [sort, setSort] = useState<SortKey>("newest");
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
  // Top-level categories carry their sub-categories; the selection may be either.
  const category = useMemo(
    () =>
      categoriesQuery.data
        ?.flatMap((item) => [item, ...(item.children || [])])
        .find((item) => item.publicId === selectedCategoryId),
    [categoriesQuery.data, selectedCategoryId],
  );
  const parentCategory = useMemo(
    () =>
      categoriesQuery.data?.find(
        (item) =>
          item.publicId === selectedCategoryId ||
          item.children?.some((child) => child.publicId === selectedCategoryId),
      ),
    [categoriesQuery.data, selectedCategoryId],
  );
  const subCategories = parentCategory?.children || [];
  const selectedMarket = marketsQuery.data?.find(
    (item) => item.publicId === marketId,
  );
  const productsQuery = useProductsQuery({
    ...stateParams,
    ...(categoryIdForQuery ? { categoryId: categoryIdForQuery } : {}),
    ...(marketId !== "all" ? { marketId } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
    ...(sort === "price_asc" || sort === "price_desc" ? { sort } : {}),
    limit: 50,
  });
  const loadedProducts = useMemo(() => productsQuery.data?.data || [], [productsQuery.data]);
  const [priceBand, setPriceBand] = useState<PriceBand>("any");
  const [negotiableOnly, setNegotiableOnly] = useState(false);
  const products = useMemo(() => {
    const band = PRICE_BANDS.find((item) => item.key === priceBand)!;
    const list = loadedProducts.filter((item) => {
      const naira = item.effectivePriceMinor / 100;
      return naira >= band.min && naira < band.max && (!negotiableOnly || item.negotiationAvailable);
    });
    // Price sorting happens on the server; "negotiable first" keeps order otherwise.
    return sort === "negotiable" ? [...list].sort((a, b) => Number(b.negotiationAvailable) - Number(a.negotiationAvailable)) : list;
  }, [loadedProducts, priceBand, negotiableOnly, sort]);
  // While a new category loads, show skeletons instead of the previous category's products.
  const [transitioning, setTransitioning] = useState(false);
  // Any filter or sort change reloads the list behind a short skeleton so the change is felt.
  function withReload(change: () => void) {
    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 450);
    change();
  }
  const switching = productsQuery.isPlaceholderData || transitioning;
  const filtersActive = priceBand !== "any" || negotiableOnly;
  const flashDeals = homeFeedQuery.data?.flashDeals?.slice(0, 2) || [];
  const marketLabel =
    selectedMarket?.shortDisplayName || selectedMarket?.name || "All markets";
  const categoryDisplayName = useMemo(() => {
    return (category?.name || "All categories").trim();
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
    // Hold the skeleton briefly so a cached category still reads as a deliberate reload.
    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 500);
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
    return <HookPageLoading variant="storefront" showBack={false} label="Opening category" />;
  }

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      <Animated.FlatList<PublicCatalogProduct | SkeletonItem>
        key={layout}
        data={productsQuery.isLoading || switching ? SKELETON_ITEMS : products}
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
              className="relative overflow-hidden rounded-b-[28px] bg-[#FFDA55] px-4 pb-4"
              style={{ paddingTop: insets.top + 6 }}
            >
              <HookYellowPattern />

              <View pointerEvents="none" className="absolute -right-2 top-0 h-[150px] w-[150px]" style={{ marginTop: insets.top }}>
                <Image
                  source={FIGMA_MARKET_ART}
                  contentFit="contain"
                  accessibilityLabel="Hook market illustration"
                  style={{ width: 130, height: 146, alignSelf: "flex-end" }}
                />
              </View>

              <View className="relative z-10 flex-row items-center gap-3">
                <HookBackButton />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Choose market, currently ${marketLabel}`}
                  onPress={() => setMarketSheetVisible(true)}
                  className="max-w-[170px]"
                >
                  <Text className="text-[10px] text-black/65">Choose Market</Text>
                  <View className="flex-row items-center">
                    <Text numberOfLines={1} className="max-w-[140px] text-[14px] font-bold text-black">{marketLabel}</Text>
                    <Ionicons name="chevron-down" size={14} color="#111" />
                  </View>
                </Pressable>
              </View>

              <Text
                numberOfLines={1}
                className="relative z-10 mt-3 max-w-[62%] font-black text-black"
                style={{ fontSize: 28, lineHeight: 36, paddingTop: 2, includeFontPadding: false }}
              >
                {categoryDisplayName}
              </Text>

              <Animated.View
                className="relative z-20 mt-4"
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

              <BannerCarousel placement="category" className="-mx-4 mt-3" />
            </View>

            <View className="pt-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 4, paddingHorizontal: 12 }}
              >
                <CategoryCircle
                  category={{ publicId: "all", name: "All", slug: "all" }}
                  compact
                  selected={selectedCategoryId === "all"}
                  onPress={() => selectCategory("all")}
                />
                {(categoriesQuery.data || []).map((item, index) => (
                  <CategoryCircle
                    key={item.publicId}
                    category={item}
                    index={index}
                    compact
                    selected={item.publicId === parentCategory?.publicId}
                    onPress={() => selectCategory(item.publicId)}
                  />
                ))}
              </ScrollView>
              {subCategories.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}
                >
                  <CategoryTile
                    label={`All ${parentCategory?.name}`}
                    uri={parentCategory?.iconUrl}
                    active={selectedCategoryId === parentCategory?.publicId}
                    onPress={() => selectCategory(parentCategory!.publicId)}
                  />
                  {subCategories.map((item) => (
                    <CategoryTile
                      key={item.publicId}
                      label={item.name}
                      uri={item.iconUrl}
                      count={item.productCount}
                      active={item.publicId === selectedCategoryId}
                      onPress={() => selectCategory(item.publicId)}
                    />
                  ))}
                </ScrollView>
              ) : null}
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingTop: 12 }}
            >
              {SORTS.map((item) => (
                <Choice key={item.key} label={item.label} active={sort === item.key} onPress={() => withReload(() => setSort(item.key))} />
              ))}
              <View className="mx-1 w-px self-stretch bg-black/10" />
              <Choice label="Negotiable" active={negotiableOnly} onPress={() => withReload(() => setNegotiableOnly((current) => !current))} />
              {PRICE_BANDS.filter((band) => band.key !== "any").map((band) => (
                <Choice
                  key={band.key}
                  label={band.label}
                  active={priceBand === band.key}
                  onPress={() => withReload(() => setPriceBand((current) => (current === band.key ? "any" : band.key)))}
                />
              ))}
              {filtersActive || sort !== "newest" ? (
                <Choice label="Clear filters" active={false} onPress={() => withReload(() => { setPriceBand("any"); setNegotiableOnly(false); setSort("newest"); })} />
              ) : null}
            </ScrollView>

            {flashDeals.length ? (
              <FlashSalePreview products={flashDeals} />
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(320)}
            className={layout === "list" ? "px-4" : ""}
            style={layout === "grid" ? { flexGrow: 1, flexBasis: 0, maxWidth: "48.5%" } : { width: "100%" }}
          >
            {isSkeletonItem(item) ? <SkeletonProductCard /> : <CatalogProductCard product={item} variant="figma" displayMode={layout} />}
          </Animated.View>
        )}
        ListEmptyComponent={
          !productsQuery.isLoading && !switching ? (
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
        ListFooterComponent={
          parentCategory && subCategories.length > 1 && selectedCategoryId !== parentCategory.publicId ? (
            <View className="mt-6 pb-10">
              <Text className="px-4 text-base font-medium text-black">Related in {parentCategory.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
                {subCategories
                  .filter((item) => item.publicId !== selectedCategoryId)
                  .map((item) => (
                    <Pressable key={item.publicId} accessibilityRole="button" onPress={() => selectCategory(item.publicId)} className="w-[132px] overflow-hidden rounded-2xl bg-white">
                      <View className="h-[88px] bg-[#F1F1F3]"><RemoteImage uri={item.iconUrl} contentFit="cover" /></View>
                      <Text numberOfLines={1} className="px-3 pt-2 text-[12px] font-bold text-black">{item.name}</Text>
                      <Text className="px-3 pb-2.5 text-[10px] text-black/45">{item.productCount ? `${item.productCount} items` : "Browse"}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
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
      onPress={() => { haptics.select(); onPress(); }}
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

function CategoryTile({ label, uri, count, active, onPress }: { label: string; uri?: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => { haptics.select(); onPress(); }}
      style={{ flexDirection: "row", alignItems: "center", height: 44, paddingLeft: 6, paddingRight: 14, borderRadius: 22, backgroundColor: active ? "#FFC809" : "#FFFFFF" }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", backgroundColor: "#F1F1F3", marginRight: 8 }}>
        {uri ? <ExpoImage source={{ uri }} contentFit="cover" style={{ width: 32, height: 32 }} /> : null}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: active ? "800" : "600", color: active ? "#111" : "#4B5563" }}>{label}</Text>
      {typeof count === "number" && count > 0 ? (
        <Text style={{ marginLeft: 6, fontSize: 10.5, fontWeight: "700", color: active ? "rgba(0,0,0,0.55)" : "#9CA3AF" }}>{count}</Text>
      ) : null}
    </Pressable>
  );
}
