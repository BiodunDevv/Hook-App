import { Reveal } from "@/components/motion/Reveal";
import { FlatList, Text, View } from "react-native";

import { useLikedProductsQuery, useProductsQuery } from "@/lib/mobile-api";
import { CatalogProductCard } from "./CatalogProductCard";

/** Products from the same category as the most recently liked item. Hidden when nothing has been liked. */
export function BecauseYouLiked() {
  const likes = useLikedProductsQuery();
  const latest = likes.data?.items?.find((item) => item.product?.category?.publicId)?.product;
  const categoryId = latest?.category?.publicId;
  const related = useProductsQuery({ categoryId, limit: 14 }, Boolean(categoryId));
  const liked = new Set(likes.data?.productIds || []);
  const items = (related.data?.data || []).filter((item) => !liked.has(item.publicId)).slice(0, 10);
  if (!latest || !items.length) return null;
  return (
    <Reveal className="mt-6">
      <Text className="px-4 text-base font-medium text-black" numberOfLines={1}>
        Because you liked <Text className="font-black">{latest.title}</Text>
      </Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.publicId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 12 }}
        renderItem={({ item }) => (
          <View style={{ width: 150 }}>
            <CatalogProductCard product={item} variant="figma" />
          </View>
        )}
      />
    </Reveal>
  );
}
