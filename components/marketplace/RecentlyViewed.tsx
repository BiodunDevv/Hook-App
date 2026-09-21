import { Reveal } from "@/components/motion/Reveal";
import { FlatList, Pressable, Text, View } from "react-native";

import { useRecentlyViewed } from "@/lib/recently-viewed";
import { CatalogProductCard } from "./CatalogProductCard";

/** A horizontal shelf of products the customer opened lately. Hidden when empty. */
export function RecentlyViewed({ excludeId, title = "Recently viewed" }: { excludeId?: string; title?: string }) {
  const { items, clear } = useRecentlyViewed(excludeId);
  if (!items.length) return null;
  return (
    <Reveal className="mt-6">
      <View className="flex-row items-center justify-between px-3">
        <Text className="text-base font-medium text-black">{title}</Text>
        <Pressable accessibilityRole="button" onPress={() => void clear()} hitSlop={8}>
          <Text className="text-xs font-semibold text-black/50">Clear</Text>
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.publicId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 12, paddingTop: 12 }}
        renderItem={({ item }) => (
          <View style={{ width: 150 }}>
            <CatalogProductCard product={item} variant="figma" />
          </View>
        )}
      />
    </Reveal>
  );
}
