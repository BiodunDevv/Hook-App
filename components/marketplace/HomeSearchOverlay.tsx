import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Reveal } from "@/components/motion/Reveal";
import { SkeletonBlock, SkeletonGroup } from "@/components/motion/Skeleton";
import { RemoteImage } from "@/components/shared/RemoteImage";
import type { PublicCatalogProduct, PublicCategory, PublicMarket } from "@/lib/mobile-api";

type Props = {
  visible: boolean;
  /** What the customer has typed (used for labels); results follow the debounced value. */
  query: string;
  loading: boolean;
  markets: PublicMarket[];
  products: PublicCatalogProduct[];
  categories: PublicCategory[];
  /** Shown before typing, and as ways out of an empty result. */
  popularCategories?: PublicCategory[];
  recents?: string[];
  onPickRecent?: (term: string) => void;
  onRemoveRecent?: (term: string) => void;
  onClearRecents?: () => void;
  /** Called with the term whenever the customer opens something from a search. */
  onOpened?: (term: string) => void;
};

const Heading = ({ children, action }: { children: string; action?: { label: string; onPress: () => void } }) => (
  <View className="flex-row items-center justify-between px-4 pb-1.5 pt-3">
    <Text className="text-[11px] font-black uppercase tracking-wider text-black/40">{children}</Text>
    {action ? (
      <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
        <Text className="text-[12px] font-bold text-black/50">{action.label}</Text>
      </Pressable>
    ) : null}
  </View>
);

const Row = ({ onPress, children }: { onPress: () => void; children: React.ReactNode }) => (
  <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center gap-3 px-4 py-2.5" android_ripple={{ color: "rgba(0,0,0,0.05)" }} style={({ pressed }) => ({ backgroundColor: pressed ? "rgba(0,0,0,0.04)" : "transparent" })}>
    {children}
  </Pressable>
);

/**
 * The search panel for the home screen. Before typing it offers recent
 * searches and popular categories; while typing it groups markets, products
 * and categories, loads with skeleton rows, and ends with "See all results".
 * It replaces the market list while open, so closing search returns to it.
 */
export function HomeSearchOverlay({ visible, query, loading, markets, products, categories, popularCategories = [], recents = [], onPickRecent, onRemoveRecent, onClearRecents, onOpened }: Props) {
  if (!visible) return null;
  const term = query.trim();
  const hasResults = markets.length > 0 || products.length > 0 || categories.length > 0;

  const openMarket = (market: PublicMarket) => { onOpened?.(term); router.push({ pathname: "/markets/[id]", params: { id: market.publicId } } as never); };
  const openProduct = (product: PublicCatalogProduct) => { onOpened?.(term); router.push({ pathname: "/products/[id]", params: { id: product.publicId } } as never); };
  const openCategory = (category: PublicCategory) => { onOpened?.(term); router.push({ pathname: "/shop/[categoryId]", params: { categoryId: category.publicId } } as never); };
  const seeAll = () => { onOpened?.(term); router.push({ pathname: "/(tabs)/discover", params: { q: term } } as never); };

  // One horizontal row that scrolls smoothly, instead of a wrapping grid.
  const categoryGrid = (list: PublicCategory[]) => (
    <ScrollView
      horizontal
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 14, gap: 6 }}
    >
      {list.map((category, index) => (
        <Reveal key={category.publicId} index={index} from="none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Browse ${category.name}`}
            onPress={() => openCategory(category)}
            style={({ pressed }) => ({ width: 78, alignItems: "center", paddingVertical: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ width: 62, height: 62, borderRadius: 31, overflow: "hidden", backgroundColor: "#F1F1F3", borderWidth: 3, borderColor: "#FFC809" }}>
              <RemoteImage uri={category.iconUrl} contentFit="cover" />
            </View>
            <Text numberOfLines={2} style={{ marginTop: 6, fontSize: 11, lineHeight: 14, fontWeight: "600", color: "#111", textAlign: "center" }}>{category.name}</Text>
          </Pressable>
        </Reveal>
      ))}
    </ScrollView>
  );

  return (
    <Reveal from="top" className="mt-2 overflow-hidden rounded-[20px] bg-white">
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {!term ? (
          <>
            {recents.length ? (
              <>
                <Heading action={{ label: "Clear all", onPress: () => onClearRecents?.() }}>Recent searches</Heading>
                {recents.map((item) => (
                  <Row key={item} onPress={() => onPickRecent?.(item)}>
                    <Ionicons name="time-outline" size={18} color="#98989D" />
                    <Text numberOfLines={1} className="flex-1 text-[14px] text-black">{item}</Text>
                    <Pressable accessibilityLabel={`Remove ${item}`} onPress={() => onRemoveRecent?.(item)} hitSlop={10}>
                      <Ionicons name="close" size={16} color="#B0B0B5" />
                    </Pressable>
                  </Row>
                ))}
              </>
            ) : null}
            {popularCategories.length ? (
              <>
                <Heading>Browse categories</Heading>
                {categoryGrid(popularCategories)}
              </>
            ) : null}
            {!recents.length && !popularCategories.length ? (
              <Text className="px-4 py-8 text-center text-[13px] text-black/50">Search products, markets and categories.</Text>
            ) : null}
          </>
        ) : (
          <>
            {loading && !hasResults ? (
              <SkeletonGroup label="Searching Hook" style={{ gap: 14, padding: 16 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <SkeletonBlock width={40} height={40} radius={10} />
                    <View style={{ flex: 1, gap: 7 }}>
                      <SkeletonBlock width="65%" height={13} />
                      <SkeletonBlock width="35%" height={11} />
                    </View>
                    <SkeletonBlock width={48} height={13} />
                  </View>
                ))}
              </SkeletonGroup>
            ) : null}

            {markets.length ? (
              <>
                <Heading>Markets</Heading>
                {markets.map((market) => (
                  <Row key={market.publicId} onPress={() => openMarket(market)}>
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#FFF4C7]"><Ionicons name="storefront-outline" size={18} color="#8B6D52" /></View>
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-[14px] font-bold text-black">{market.name}</Text>
                      {market.address ? <Text numberOfLines={1} className="mt-0.5 text-[11px] text-black/45">{market.address}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B0B0B5" />
                  </Row>
                ))}
              </>
            ) : null}

            {products.length ? (
              <>
                <Heading>Products</Heading>
                {products.map((product) => (
                  <Row key={product.publicId} onPress={() => openProduct(product)}>
                    <View className="h-10 w-10 overflow-hidden rounded-[10px] bg-[#F1F1F3]"><RemoteImage uri={product.media?.[0]?.url} /></View>
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-[14px] font-bold text-black">{product.title}</Text>
                      <Text numberOfLines={1} className="mt-0.5 text-[11px] text-black/45">{[product.category?.name, product.market?.name].filter(Boolean).join(" · ")}</Text>
                    </View>
                    <Text className="text-[13px] font-black text-black">₦{Math.round(Number(product.effectivePriceMinor || 0) / 100).toLocaleString("en-NG")}</Text>
                  </Row>
                ))}
              </>
            ) : null}

            {categories.length ? (
              <>
                <Heading>Categories</Heading>
                {categories.map((category) => (
                  <Row key={category.publicId} onPress={() => openCategory(category)}>
                    <View className="h-10 w-10 overflow-hidden rounded-full bg-[#F1F1F3]"><RemoteImage uri={category.iconUrl} contentFit="cover" /></View>
                    <Text numberOfLines={1} className="flex-1 text-[14px] font-bold text-black">{category.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B0B0B5" />
                  </Row>
                ))}
              </>
            ) : null}

            {hasResults ? (
              <Pressable accessibilityRole="button" onPress={seeAll} className="m-3 mt-2 flex-row items-center justify-center rounded-full bg-[#FFC809] py-3">
                <Text className="text-[14px] font-black text-black">See all results for &quot;{term}&quot;</Text>
                <Ionicons name="arrow-forward" size={16} color="#111" style={{ marginLeft: 6 }} />
              </Pressable>
            ) : null}

            {!loading && !hasResults ? (
              <View className="items-center px-6 pb-2 pt-8">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-[#FFF4C7]"><Ionicons name="search-outline" size={26} color="#111" /></View>
                <Text className="mt-4 text-center text-[15px] font-black text-black">No results for &quot;{term}&quot;</Text>
                <Text className="mt-1.5 text-center text-[13px] leading-5 text-black/50">Check the spelling, try a shorter word, or browse a category instead.</Text>
                {popularCategories.length ? <View className="mt-3 self-stretch">{categoryGrid(popularCategories)}</View> : <View className="h-4" />}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Reveal>
  );
}
