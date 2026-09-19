import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { CatalogProductCard } from "@/components/marketplace/CatalogProductCard";
import { MarketSelectionSheet } from "@/components/marketplace/MarketSelectionSheet";
import { ScallopedEdge } from "@/components/marketplace/ScallopedEdge";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { RemoteImage } from "@/components/shared/RemoteImage";
import {
  type PublicCategory,
  type PublicCatalogProduct,
  useDiscoverQuery,
  useMarketsQuery,
  useSearchSuggestionsQuery,
} from "@/lib/mobile-api";
import { useHookLocation } from "@/lib/location-context";
import { categoryVector3452Xml } from "@/components/marketplace/figmaShapes";
import { MarketplaceCompactHeader } from "@/components/marketplace/MarketplaceCompactHeader";
import { ProductLayoutToggle } from "@/components/marketplace/ProductLayoutToggle";
import { getHookTabBarContentInset } from "@/components/tab-bar/layout";

const ALL_CATEGORY_IMAGE = require("../../assets/images/discover/all-category.png");
const MAGNIFIER_IMAGE = require("../../assets/images/discover/magnifier.png");
const DEFAULT_CATEGORY_IMAGE = require("../../assets/images/figma/category-market-art.png");

function DiscoverProductSkeleton({
  layout,
  cardWidth,
}: {
  layout: "grid" | "list";
  cardWidth: number;
}) {
  const opacity = useSharedValue(0.48);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 720 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (layout === "list") {
    return (
      <View className="gap-3 px-4" accessibilityLabel="Loading products">
        {Array.from({ length: 5 }).map((_, index) => (
          <Animated.View
            key={index}
            className="h-[116px] flex-row rounded-[14px] bg-white p-2.5"
            style={pulseStyle}
          >
            <View className="h-24 w-24 rounded-[11px] bg-black/[0.08]" />
            <View className="flex-1 justify-center px-3">
              <View className="h-4 w-4/5 rounded-full bg-black/[0.08]" />
              <View className="mt-3 h-3 w-2/5 rounded-full bg-black/[0.06]" />
              <View className="mt-3 h-4 w-1/3 rounded-full bg-[#FFC809]/30" />
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View
      className="flex-row flex-wrap gap-x-3 gap-y-[18px] px-4"
      accessibilityLabel="Loading products"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Animated.View key={index} style={[{ width: cardWidth }, pulseStyle]}>
          <View className="aspect-square rounded-t-[10px] rounded-b-[20px] bg-black/[0.08]" />
          <View className="mt-2 h-3.5 w-4/5 rounded-full bg-black/[0.08]" />
          <View className="mt-2 h-3.5 w-2/5 rounded-full bg-[#FFC809]/30" />
        </Animated.View>
      ))}
    </View>
  );
}

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { stateParams } = useHookLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryId, setCategoryId] = useState("all");
  const [marketId, setMarketId] = useState("all");
  const [marketSheetOpen, setMarketSheetOpen] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [headerVisible, setHeaderVisible] = useState(false);
  const [searchPinned, setSearchPinned] = useState(false);
  const scrollY = useSharedValue(0);
  const searchAnchorY = useSharedValue(0);
  const categoryAnchorY = useSharedValue(0);
  const compactHeaderHeight = insets.top + 62;
  const headerVisibleValue = useSharedValue(false);
  const searchPinnedValue = useSharedValue(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(timeout);
  }, [search]);

  const params = {
    ...stateParams,
    ...(marketId !== "all" ? { marketId } : {}),
    ...(categoryId !== "all" ? { categoryId } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    limit: 30,
  };
  const discover = useDiscoverQuery(params);
  const markets = useMarketsQuery(stateParams);
  const suggestions = useSearchSuggestionsQuery(debouncedSearch, stateParams);
  const marketRows = markets.data || [];
  const selectedMarket = marketRows.find((market) => market.publicId === marketId);
  const products = discover.data?.products || [];
  const gridCardWidth = Math.floor((screenWidth - 44) / 2);

  function handleSearchChange(value: string) {
    setSearch(value);
    setSuggestionsOpen(true);
  }

  const categoryRows = useMemo(
    () => [
      { publicId: "all", name: "All", slug: "all" } as PublicCategory,
      ...(discover.data?.categories || []),
    ],
    [discover.data?.categories],
  );

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([discover.refetch(), markets.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = event.contentOffset.y;
      scrollY.value = offset;
      const nextHeaderVisible = offset > 38;
      if (nextHeaderVisible !== headerVisibleValue.value) {
        headerVisibleValue.value = nextHeaderVisible;
        runOnJS(setHeaderVisible)(nextHeaderVisible);
      }
      if (searchAnchorY.value > 0) {
        const nextSearchPinned = offset >= searchAnchorY.value - compactHeaderHeight;
        if (nextSearchPinned !== searchPinnedValue.value) {
          searchPinnedValue.value = nextSearchPinned;
          runOnJS(setSearchPinned)(nextSearchPinned);
        }
      }
    },
  });

  const categoryStripStyle = useAnimatedStyle(() => {
    const start = categoryAnchorY.value - compactHeaderHeight;
    return {
      height: categoryAnchorY.value > 0
        ? interpolate(scrollY.value, [start - 20, start + 100], [112, 0], Extrapolation.CLAMP)
        : 112,
      opacity: categoryAnchorY.value > 0
        ? interpolate(scrollY.value, [start - 20, start + 82], [1, 0], Extrapolation.CLAMP)
        : 1,
      transform: [{ translateY: categoryAnchorY.value > 0
        ? interpolate(scrollY.value, [start - 20, start + 100], [0, -18], Extrapolation.CLAMP)
        : 0 }],
      overflow: "hidden",
    };
  });

  const originalSearchStyle = useAnimatedStyle(() => {
    if (searchAnchorY.value <= 0) return { opacity: 1 };
    const start = searchAnchorY.value - compactHeaderHeight;
    return {
      opacity: interpolate(scrollY.value, [start - 24, start + 24], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(scrollY.value, [start - 24, start + 24], [0, -8], Extrapolation.CLAMP) }],
    };
  });

  const stickySearchStyle = useAnimatedStyle(() => {
    if (searchAnchorY.value <= 0) return { opacity: 0 };
    const start = searchAnchorY.value - compactHeaderHeight;
    return {
      opacity: interpolate(scrollY.value, [start - 12, start + 28], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(scrollY.value, [start - 12, start + 28], [-8, 0], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      <Animated.FlatList<PublicCatalogProduct>
        key={layout}
        data={discover.isLoading ? [] : products}
        numColumns={layout === "grid" ? 2 : 1}
        keyExtractor={(product) => product.publicId}
        renderItem={({ item: product }) => (
          <View
            className={layout === "list" ? "px-4" : ""}
            style={layout === "grid" ? { flex: 1, maxWidth: gridCardWidth } : { width: "100%" }}
          >
            <CatalogProductCard product={product} variant="figma" displayMode={layout} />
          </View>
        )}
        columnWrapperStyle={layout === "grid" ? { gap: 12, paddingHorizontal: 16 } : undefined}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor="#111"
            progressViewOffset={insets.top + 8}
          />
        }
        contentContainerStyle={{
          paddingBottom: getHookTabBarContentInset(insets.bottom),
          gap: layout === "grid" ? 18 : 12,
        }}
        ListHeaderComponent={(
          <View>
        <View
          className="relative bg-[#FFD93E] px-4"
          style={{ paddingTop: insets.top + 10, paddingBottom: 32 }}
        >
          <View pointerEvents="none" className="absolute inset-x-0 top-0 h-[210px] overflow-hidden">
            <SvgXml xml={categoryVector3452Xml} width="100%" height="100%" />
          </View>
          <View className="relative h-11 flex-row items-center">
            <HookBackButton />
            <View pointerEvents="none" className="absolute -right-5 -top-10 h-44 w-44">
              <Image source={MAGNIFIER_IMAGE} contentFit="contain" style={{ width: "100%", height: "100%" }} />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose market"
            onPress={() => setMarketSheetOpen(true)}
            className="mt-1 self-start"
          >
            <Text className="text-xs font-semibold text-black/65">Choose Market</Text>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <Text className="max-w-[220px] text-[15px] font-bold text-black">
                {selectedMarket?.name || "All markets"}
              </Text>
              <Ionicons name="chevron-down" size={15} color="#111" />
            </View>
          </Pressable>

          <Text className="mt-3 text-[36px] font-black leading-[42px] text-black">Discover</Text>

          <Animated.View
            className="mt-4 h-14 flex-row items-center rounded-[20px] bg-[#F1F1F3] px-4"
            onLayout={(event) => { searchAnchorY.value = event.nativeEvent.layout.y; }}
            style={originalSearchStyle}
          >
            <TextInput
              accessibilityLabel="Search products"
              className="h-full flex-1 text-[15px] text-black"
              placeholder="What are you looking for"
              placeholderTextColor="#777"
              returnKeyType="search"
              value={search}
              onChangeText={handleSearchChange}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search ? (
              <Pressable accessibilityLabel="Clear search" onPress={() => { setSearch(""); setSuggestionsOpen(false); }} className="mr-2">
                <Ionicons name="close-circle" size={19} color="#888" />
              </Pressable>
            ) : null}
            <Ionicons name="search" size={25} color="#111" />
          </Animated.View>
          {suggestionsOpen && search.trim() && suggestions.data?.length ? (
            <View className="mt-2 overflow-hidden rounded-[16px] bg-white">
              {suggestions.data.slice(0, 6).map((suggestion, index) => (
                <Pressable
                  key={`${suggestion}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setSearch(suggestion);
                    setDebouncedSearch(suggestion);
                    setSuggestionsOpen(false);
                    Keyboard.dismiss();
                  }}
                  className={`flex-row items-center px-4 py-3.5 ${index ? "border-t border-black/5" : ""}`}
                >
                  <Ionicons name="search-outline" size={17} color="#858585" />
                  <Text className="ml-3 flex-1 text-[13px] font-semibold text-black">{suggestion}</Text>
                  <Ionicons name="arrow-up-outline" size={16} color="#A0A0A0" />
                </Pressable>
              ))}
            </View>
          ) : null}
          <ScallopedEdge color="#FFD93E" count={15} size={28} edge="bottom" zIndex={0} />
        </View>

        <Animated.View
          onLayout={(event) => { categoryAnchorY.value = event.nativeEvent.layout.y; }}
          style={categoryStripStyle}
        >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 4 }}
          className="pt-5"
        >
          {categoryRows.map((category) => {
            const selected = category.publicId === categoryId;
            return (
              <Pressable
                key={category.publicId}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCategoryId(category.publicId)}
                className="w-[66px] items-center"
              >
                <View
                  className={`h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full border-hook ${selected ? "border-[6px] bg-[#FFF4C7]" : "border-[4px] bg-white"}`}
                >
                  {category.publicId === "all" ? (
                    <Image source={ALL_CATEGORY_IMAGE} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <RemoteImage uri={category.iconUrl} fallbackSource={DEFAULT_CATEGORY_IMAGE} contentFit="cover" />
                  )}
                </View>
                <Text className="mt-1.5 text-center text-[11px] font-semibold text-black">{category.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        </Animated.View>

        <View className="mt-5 flex-row items-center justify-between px-4">
          <View>
            <Text className="text-[25px] font-black text-black">Explore</Text>
            <Text className="mt-0.5 text-xs text-black/45">
              {discover.data?.resultCount ?? products.length} products
            </Text>
          </View>
          <ProductLayoutToggle value={layout} onChange={setLayout} />
        </View>

        {discover.isError ? (
          <View className="mx-4 mt-8 items-center rounded-[20px] bg-white px-6 py-10">
            <Ionicons name="cloud-offline-outline" size={30} color="#777" />
            <Text className="mt-3 font-black text-black">Discover could not be loaded</Text>
            <Pressable onPress={() => void discover.refetch()} className="mt-4 rounded-full bg-hook px-5 py-2.5">
              <Text className="font-bold text-black">Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {!discover.isLoading && !discover.isError && !products.length ? (
          <View className="mx-4 mt-8 items-center rounded-[20px] bg-white px-6 py-10">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#FFF4C7]">
              <Ionicons name="search-outline" size={26} color="#111" />
            </View>
            <Text className="mt-4 text-lg font-black text-black">No matching products</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-black/50">Try another search, category, or market.</Text>
          </View>
        ) : null}
          </View>
        )}
        ListEmptyComponent={discover.isLoading ? <DiscoverProductSkeleton layout={layout} cardWidth={gridCardWidth} /> : null}
      />

      <MarketplaceCompactHeader
        visible={headerVisible}
        title="Discover"
        onBack={() => router.back()}
        showActions={false}
        plain
        style={{ opacity: headerVisible ? 1 : 0 }}
      />

      <Animated.View
        pointerEvents={searchPinned ? "auto" : "none"}
        style={[{
          position: "absolute",
          top: compactHeaderHeight + 10,
          left: 16,
          right: 16,
          zIndex: 35,
          padding: 1,
          borderRadius: 20,
          backgroundColor: "#F1F1F3",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }, stickySearchStyle]}
      >
        <View className="h-14 flex-row items-center rounded-[20px] bg-[#F1F1F3] px-4">
          <TextInput
            accessibilityLabel="Search products"
            className="h-full flex-1 text-[15px] text-black"
            placeholder="What are you looking for"
            placeholderTextColor="#777"
            returnKeyType="search"
            value={search}
            onChangeText={handleSearchChange}
          />
          <Ionicons name="search" size={25} color="#111" />
        </View>
      </Animated.View>

      <MarketSelectionSheet
        visible={marketSheetOpen}
        markets={marketRows}
        selectedMarketId={marketId}
        onSelect={setMarketId}
        onClose={() => setMarketSheetOpen(false)}
      />
    </View>
  );
}
