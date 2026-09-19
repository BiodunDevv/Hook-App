import { Pressable, Text, View } from "react-native";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { screenPadding } from "@/constants/design-tokens";

const THUMB = 56;
/** How far each thumbnail slides under the previous one. */
const OVERLAP = 16;
/** Beyond this, the rest collapse into a "+N" chip so the row cannot grow. */
const MAX_THUMBS = 3;

type OrderItem = { id?: string; title?: string; imageUrl?: string };
type Order = {
  id: string;
  displayNumber?: string;
  statusLabel?: string;
  status?: string;
  itemCount?: number;
  items?: OrderItem[];
  paymentMethod?: string;
  totalMinor?: number;
  total?: number;
};

function naira(order: Order) {
  const minor = Number(order.totalMinor ?? Math.round(Number(order.total || 0) * 100));
  return `₦${(minor / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

/**
 * One row in the orders list.
 *
 * The item thumbnails are stacked with a negative offset rather than laid out
 * in a row: an order can hold many items, and a full row would either overflow
 * the card or shrink the status pill to nothing. Overlapping keeps the footprint
 * fixed no matter how many items there are.
 */
export function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const items = order.items || [];
  const shown = items.slice(0, MAX_THUMBS);
  const overflow = Math.max(items.length - shown.length, 0);
  const count = Number(order.itemCount || items.length || 0);
  const statusLabel = order.statusLabel || String(order.status || "").replaceAll("_", " ");

  return (
    <Pressable onPress={onPress} className="rounded-[22px] bg-white" style={{ padding: screenPadding }}>
      {/* Title and pill share a row but the pill may wrap to its own line:
          long status copy ("Hook is sourcing your items") previously ran off
          the right edge of the screen. */}
      <View className="flex-row flex-wrap items-center justify-between gap-y-2">
        <Text className="shrink font-black" numberOfLines={1}>
          {order.displayNumber || order.id}
        </Text>
        <View className="shrink-0 rounded-full bg-hook/20 px-3 py-1.5">
          <Text className="text-[10px] font-bold uppercase" numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          {shown.length ? (
            <View className="flex-row items-center">
              {shown.map((item, index) => (
                <View
                  key={item.id || `${order.id}-${index}`}
                  style={{
                    width: THUMB,
                    height: THUMB,
                    borderRadius: 16,
                    overflow: "hidden",
                    backgroundColor: "#F1F1F3",
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                    marginLeft: index === 0 ? 0 : -OVERLAP,
                    // Earlier items sit on top, so the stack reads left-to-right.
                    zIndex: shown.length - index,
                  }}
                >
                  <RemoteImage uri={item.imageUrl} fallbackIcon="cube-outline" />
                </View>
              ))}
              {overflow ? (
                <View
                  style={{
                    height: THUMB,
                    minWidth: THUMB,
                    paddingHorizontal: 8,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#111111",
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                    marginLeft: -OVERLAP,
                  }}
                >
                  <Text className="text-[13px] font-black text-white">+{overflow}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View className="min-w-0 shrink">
            <Text className="text-xs text-[#888]" numberOfLines={1}>
              {count} item{count === 1 ? "" : "s"}
            </Text>
            <Text className="mt-1 text-xs text-[#888]" numberOfLines={1}>
              {order.paymentMethod === "PAY_AT_HANDOVER" ? "Pay at handover" : "Prepaid"}
            </Text>
          </View>
        </View>

        <Text className="shrink-0 text-xl font-black">{naira(order)}</Text>
      </View>
    </Pressable>
  );
}
