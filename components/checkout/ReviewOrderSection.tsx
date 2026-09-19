import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { useCartMarketProductsQuery } from "@/lib/mobile-api";

function naira(minor: number) {
  return `₦${Math.round(Number(minor || 0) / 100).toLocaleString("en-NG")}`;
}

function lineTotalMinor(item: any) {
  return Number(item.totalPriceMinor ?? Number(item.unitPriceMinor || 0) * Number(item.quantity || 0));
}

function productImage(item: any) {
  return (
    item.product?.imageUrl
    || item.product?.media?.[0]?.url
    || item.product?.images?.[0]
    || item.productSnapshot?.image
  );
}

/**
 * Items grouped by market, matching the design's "Review order" block. Uses
 * the same market-resolution fallback chain as the cart screen so a line that
 * only carries marketId still lands in the right group.
 */
export function ReviewOrderSection({ items, onEditOrder }: { items: any[]; onEditOrder: () => void }) {
  const [open, setOpen] = useState(true);
  const catalog = useCartMarketProductsQuery({ items });

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: any[]; subtotalMinor: number }>();
    for (const item of items) {
      const product = catalog.data?.find((product) => product.publicId === String(item.product?.publicId || item.product?.id || item.productId));
      const market = item.market?.name ? item.market : item.product?.market?.name ? item.product.market : product?.market;
      const key = String(market?.publicId || item.marketId || "hook-market");
      const group = map.get(key) || {
        key,
        name: String(market?.name || item.marketName || "Market details loading"),
        items: [],
        subtotalMinor: 0,
      };
      group.items.push(item);
      group.subtotalMinor += lineTotalMinor(item);
      map.set(key, group);
    }
    return [...map.values()];
  }, [items, catalog.data]);

  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text className="flex-1 text-base font-medium text-black">Review order</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit items in cart"
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onEditOrder();
          }}
          style={{ minHeight: 36, justifyContent: "center", borderRadius: 18, backgroundColor: "white", paddingHorizontal: 14 }}
        >
          <Text style={{ fontSize: 12, fontFamily: "NunitoSans-Bold", color: "#7A6200" }}>Edit order</Text>
        </Pressable>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color="#111" />
      </Pressable>

      {open ? (
        <View style={{ gap: 12 }}>
          {groups.map((group) => (
            <View key={group.key} style={{ gap: 12, borderRadius: 22, backgroundColor: "white", padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="location" size={14} color="#FFC809" />
                  <Text style={{ flex: 1, fontSize: 12, color: "#111" }}>
                    {group.name}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-black">{naira(group.subtotalMinor)}</Text>
              </View>

              {group.items.map((item, index) => {
                const image = productImage(item);
                return (
                  <View
                    key={String(item.publicId || item.id || `${group.key}-${index}`)}
                    style={{ flexDirection: "row", alignItems: "flex-start", borderRadius: 16, backgroundColor: "#F1F1F3", padding: 12, gap: 12 }}
                  >
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                      <View style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden" }}>
                        <RemoteImage uri={image ? String(image) : undefined} />
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: "#111", fontFamily: "NunitoSans-Bold" }}>
                          {item.product?.title || item.productSnapshot?.title || "Product"}
                        </Text>
                        <Text style={{ fontSize: 12, lineHeight: 18, color: "#666" }}>
                          {Object.values(item.selectedVariants || {}).filter(Boolean).join(" · ") || "Standard item"}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 8, maxWidth: "35%" }}>
                      <View style={{ minWidth: 28, minHeight: 28, padding: 4, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFC809" }}>
                        <Text className="text-sm text-black">{Number(item.quantity || 0)}</Text>
                      </View>
                      <Text className="text-base font-semibold text-black">
                        {naira(lineTotalMinor(item))}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
