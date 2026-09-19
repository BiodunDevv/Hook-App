import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { RemoteImage } from "@/components/shared/RemoteImage";
import { HookLoader } from "@/components/shared/HookLoader";
import type { PublicCatalogProduct, PublicCategory, PublicMarket } from "@/lib/mobile-api";

/**
 * Grouped search-everything panel for the home screen. Floats over the
 * market list without replacing it — closing search always returns to the
 * exact same market-browsing view underneath, untouched.
 */
export function HomeSearchOverlay({
  visible,
  query,
  loading,
  markets,
  products,
  categories,
  onSelectMarket,
  onSelectCategory,
}: {
  visible: boolean;
  query: string;
  loading: boolean;
  markets: PublicMarket[];
  products: PublicCatalogProduct[];
  categories: PublicCategory[];
  onSelectMarket?: (market: PublicMarket) => void;
  onSelectCategory?: (category: PublicCategory) => void;
}) {
  if (!visible) return null;

  const hasResults = markets.length > 0 || products.length > 0 || categories.length > 0;

  function openMarket(market: PublicMarket) {
    onSelectMarket?.(market);
    router.push({ pathname: "/markets/[id]", params: { id: market.publicId } } as never);
  }

  function openProduct(product: PublicCatalogProduct) {
    router.push({ pathname: "/products/[id]", params: { id: product.publicId } } as never);
  }

  function openCategory(category: PublicCategory) {
    onSelectCategory?.(category);
    router.push({ pathname: "/shop/[categoryId]", params: { categoryId: category.publicId } } as never);
  }

  return (
    <View
      className="mt-2 overflow-hidden rounded-[20px] bg-white"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }} nestedScrollEnabled>
        {loading && !hasResults ? (
          <View className="items-center py-8">
            <HookLoader size="inline" label="Searching Hook" />
          </View>
        ) : null}

        {markets.length ? (
          <View className="border-b border-black/5 py-2">
            <Text className="px-4 pb-1 text-[11px] font-black uppercase tracking-wide text-black/40">
              Markets
            </Text>
            {markets.map((market) => (
              <Pressable
                key={market.publicId}
                accessibilityRole="button"
                onPress={() => openMarket(market)}
                className="flex-row items-center gap-3 px-4 py-2.5 active:bg-black/3"
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-[#FFF4C7]">
                  <Ionicons name="storefront-outline" size={17} color="#8B6D52" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-[14px] font-bold text-black">
                    {market.name}
                  </Text>
                  {market.address ? (
                    <Text numberOfLines={1} className="mt-0.5 text-[11px] text-black/45">
                      {market.address}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B0B0B5" />
              </Pressable>
            ))}
          </View>
        ) : null}

        {products.length ? (
          <View className="border-b border-black/5 py-2">
            <Text className="px-4 pb-1 text-[11px] font-black uppercase tracking-wide text-black/40">
              Products
            </Text>
            {products.map((product) => (
              <Pressable
                key={product.publicId}
                accessibilityRole="button"
                onPress={() => openProduct(product)}
                className="flex-row items-center gap-3 px-4 py-2.5 active:bg-black/3"
              >
                <View className="h-10 w-10 overflow-hidden rounded-[10px] bg-[#F1F1F3]">
                  <RemoteImage uri={product.media?.[0]?.url} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-[14px] font-bold text-black">
                    {product.title}
                  </Text>
                  {product.market?.name ? (
                    <Text numberOfLines={1} className="mt-0.5 text-[11px] text-black/45">
                      {product.market.name}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[13px] font-black text-[#FFC809]">
                  ₦{(Number(product.effectivePriceMinor || 0) / 100).toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {categories.length ? (
          <View className="py-2">
            <Text className="px-4 pb-1 text-[11px] font-black uppercase tracking-wide text-black/40">
              Categories
            </Text>
            {categories.map((category) => (
              <Pressable
                key={category.publicId}
                accessibilityRole="button"
                onPress={() => openCategory(category)}
                className="flex-row items-center gap-3 px-4 py-2.5 active:bg-black/3"
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F1F3]">
                  <Ionicons name="pricetag-outline" size={16} color="#555" />
                </View>
                <Text numberOfLines={1} className="flex-1 text-[14px] font-bold text-black">
                  {category.name}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#B0B0B5" />
              </Pressable>
            ))}
          </View>
        ) : null}

        {!loading && !hasResults ? (
          <View className="items-center px-6 py-8">
            <Ionicons name="search-outline" size={24} color="#B0B0B5" />
            <Text className="mt-3 text-center text-[13px] font-semibold text-black/60">
              No results for &quot;{query}&quot;
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
