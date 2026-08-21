import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookConfirmSheet } from "@/components/shared/HookConfirmSheet";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { toast } from "@/components/shared/toast";
import { resolveColor } from "@/components/marketplace/product-colors";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import {
  useCartQuery,
  useClearCartMutation,
  getCartItems,
  useCustomerSessionQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "@/lib/mobile-api";
import { isCustomerSession } from "@/lib/session";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const cart = useCartQuery();
  const update = useUpdateCartItemMutation();
  const remove = useRemoveCartItemMutation();
  const clear = useClearCartMutation();
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const quantityQueue = useRef(new Map<string, number>());
  const quantityWorkers = useRef(new Map<string, Promise<void>>());
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{ item: any; id: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const data = cart.data as any;

  async function refreshCart() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await cart.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function visibleSubtotal(groupItems: any[]) {
    return groupItems.reduce(
      (sum, item) => sum + Number(item.unitPriceMinor || 0) * visibleQuantity(item),
      0,
    );
  }

  function change(item: any, quantity: number) {
    const itemId = cartItemIdentifier(item);
    if (quantity < 1 || quantity > 99 || !itemId || item.checkoutEligible === false) return;
    quantityQueue.current.set(itemId, quantity);
    setPendingQuantities((current) => ({ ...current, [itemId]: quantity }));
    if (quantityWorkers.current.has(itemId)) return;

    const worker = (async () => {
      try {
        while (quantityQueue.current.has(itemId)) {
          const target = quantityQueue.current.get(itemId)!;
          await update.mutateAsync({ itemId, quantity: target });
          if (quantityQueue.current.get(itemId) === target) {
            quantityQueue.current.delete(itemId);
            setPendingQuantities((current) => {
              const next = { ...current };
              delete next[itemId];
              return next;
            });
          }
        }
      } catch (error) {
        quantityQueue.current.delete(itemId);
        setPendingQuantities((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
        toast.error(
          error instanceof Error ? error.message : "Could not update quantity",
        );
      } finally {
        quantityWorkers.current.delete(itemId);
      }
    })();
    quantityWorkers.current.set(itemId, worker);
  }

  function visibleQuantity(item: any) {
    const itemId = cartItemIdentifier(item);
    return itemId ? pendingQuantities[itemId] ?? Number(item.quantity || 1) : Number(item.quantity || 1);
  }

  async function removeItem(item: any) {
    const itemId = cartItemIdentifier(item);
    if (!itemId || pendingIds.has(itemId)) return;
    quantityQueue.current.delete(itemId);
    setPendingQuantities((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setPendingIds((current) => new Set(current).add(itemId));
    try {
      await quantityWorkers.current.get(itemId)?.catch(() => undefined);
      await remove.mutateAsync(itemId);
      setPendingRemoval(null);
      toast.success("Item removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove item",
      );
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }
  function requestRemoveItem(item: any) {
    const itemId = cartItemIdentifier(item);
    if (!itemId) return toast.error("This cart item cannot be removed yet");
    setPendingRemoval({ item, id: itemId });
  }
  async function clearCart() {
    try {
      await clear.mutateAsync();
      setConfirmClear(false);
      toast.success("Cart cleared");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not clear cart",
      );
    }
  }
  function continueShopping() {
    router.push("/(tabs)/discover" as never);
  }
  function checkout() {
    if (getCartItems(data).some((item) => item.checkoutEligible === false)) {
      toast.info("Some products need confirmation", "Remove unavailable products or check back after a Runner confirms them.");
      return;
    }
    if (!isCustomerSession(session.data)) {
      openAuth("/checkout" as never);
      return;
    }
    router.push("/checkout" as never);
  }

  if (cart.isLoading)
    return <HookPageLoading title="Your cart" label="Loading your cart" />;
  if (cart.isError) return <CartError retry={() => cart.refetch()} />;
  const items = getCartItems(data);
  const checkoutBlocked = items.some((item) => item.checkoutEligible === false);
  if (!items.length) return <EmptyCart />;

  return (
    <View className="flex-1 bg-[#f4f4f5]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <HookBackButton />
        <Text className="text-xl font-black">Your cart</Text>
        <Pressable
          onPress={() => setConfirmClear(true)}
          className="h-11 items-center justify-center px-2"
        >
          <Text className="text-sm font-bold text-red-500">Clear</Text>
        </Pressable>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshCart()}
            tintColor="#111"
          />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 180,
        }}
      >
        <Pressable
          onPress={continueShopping}
          className="flex-row items-center gap-3 rounded-[22px] bg-[#171717] p-4"
        >
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Ionicons name="bag-handle-outline" size={22} color="#FFC809" />
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-black text-white">
              Hook marketplace
            </Text>
            <Text numberOfLines={1} className="mt-1 text-xs text-white/60">
              Continue browsing the commercial catalog
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#fff" />
        </Pressable>
        <View className="mt-4 overflow-hidden rounded-[24px] bg-white">
              <View className="flex-row items-center justify-between border-b border-black/5 px-4 py-4">
                <View><Text className="text-xs font-semibold uppercase text-[#777]">Your products</Text><Text className="mt-1 text-base font-black">{items.length} item{items.length === 1 ? "" : "s"}</Text></View>
                <View className="items-end"><Text className="text-xs text-[#777]">Subtotal</Text><Text className="mt-1 font-black">₦{Number(visibleSubtotal(items) / 100).toLocaleString()}</Text></View>
              </View>
              <View className="gap-3 p-3">
                {items.map((item: any, itemIndex: number) => {
                  const itemId = cartItemIdentifier(item);
                  const rowKey =
                    itemId ||
                    `cart-row-${item.productId || "product"}-${item.variantKey || "default"}-${itemIndex}`;

                  return (
                    <CartRow
                      key={rowKey}
                      item={item}
                      busy={Boolean(itemId && pendingIds.has(itemId))}
                      quantity={visibleQuantity(item)}
                      onChange={(quantity) => change(item, quantity)}
                      onRemove={() => requestRemoveItem(item)}
                    />
                  );
                })}
              </View>
        </View>
        <View className="mt-5 rounded-[22px] bg-white p-5">
          <SummaryRow
            label="Cart subtotal"
            value={
              getCartItems(data).reduce(
                (sum, item) =>
                  sum + Number(item.unitPriceMinor || 0) * visibleQuantity(item),
                0,
              ) / 100
            }
            strong
          />
          <Text className="mt-2 text-xs leading-5 text-[#777]">
            Delivery is calculated once when you confirm your address.
          </Text>
        </View>
      </ScrollView>
      <View
        className="absolute inset-x-0 bottom-0 border-t border-black/5 bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 10 }}
      >
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: checkoutBlocked }} onPress={checkout} className={`h-[54px] flex-row items-center justify-center rounded-2xl ${checkoutBlocked ? "bg-[#D5D5D8]" : "bg-hook"}`}>
          <Text className="font-black text-black">{checkoutBlocked ? "Review unavailable products" : "Checkout"}</Text>
          <Ionicons name="arrow-forward" size={18} color="#111" style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
      <HookConfirmSheet
        visible={confirmClear}
        title="Clear your cart?"
        message="This removes every item currently saved in your cart."
        confirmLabel="Clear cart"
        cancelLabel="Keep items"
        destructive
        busy={clear.isPending}
        onConfirm={clearCart}
        onClose={() => setConfirmClear(false)}
      />
      <HookConfirmSheet
        visible={Boolean(pendingRemoval)}
        title="Remove item?"
        message={pendingRemoval ? `Remove ${pendingRemoval.item.product?.title || "this product"} from your cart?` : ""}
        confirmLabel="Remove"
        cancelLabel="Keep item"
        destructive
        busy={Boolean(pendingRemoval && pendingIds.has(pendingRemoval.id))}
        onConfirm={() => (pendingRemoval ? removeItem(pendingRemoval.item) : undefined)}
        onClose={() => setPendingRemoval(null)}
      />
    </View>
  );
}

function CartRow({
  item,
  busy,
  quantity,
  onChange,
  onRemove,
}: {
  item: any;
  busy: boolean;
  quantity: number;
  onChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const product = item.product;
  const selectedColorValue =
    item.selectedVariants?.color || item.selectedVariants?.colour;
  const displayColor = selectedColorValue
    ? resolveColor(selectedColorValue)
    : undefined;
  const lineTotalMinor = Number(item.unitPriceMinor || 0) * quantity;
  const productId = product?.publicId || product?.id || item.productId;

  function openProduct() {
    if (!productId) return;
    router.push({
      pathname: "/(app)/products/[id]",
      params: { id: String(productId), returnTo: "/(app)/cart" },
    });
  }

  return (
    <View
      className={`flex-row gap-3 rounded-[18px] bg-[#fafafa] p-3 ${item.checkoutEligible ? "" : "border border-red-100"}`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${product?.title || "product"} details`}
        disabled={!productId}
        onPress={openProduct}
        className="h-24 w-24 overflow-hidden rounded-[16px] bg-[#f1f1f3] active:opacity-80"
      >
        <RemoteImage uri={product?.imageUrl || product?.media?.[0]?.url || product?.images?.[0]} />
      </Pressable>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            numberOfLines={2}
            className="flex-1 text-sm font-black leading-5"
          >
            {product?.title || "Unavailable product"}
          </Text>
          <Pressable disabled={busy} onPress={onRemove} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color="#aaa" />
          </Pressable>
        </View>
        {item.selectedVariants?.color ||
        item.selectedVariants?.colour ||
        item.selectedVariants?.size ? (
          <View className="mt-2 flex-row items-center gap-2">
            {displayColor ? (
              <View
                className="h-4 w-4 rounded-full border border-black/10"
                style={{ backgroundColor: displayColor.hex }}
              />
            ) : null}
            <Text numberOfLines={1} className="flex-1 text-xs text-[#777]">
              {[
                displayColor?.name,
                item.selectedVariants?.size,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ) : null}
        <View className="mt-2 flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-[#777]">₦{(Number(item.unitPriceMinor || 0) / 100).toLocaleString()} each</Text>
            {item.negotiatedQuote ? <View className="mt-1 flex-row items-center gap-1.5"><Text className="text-[10px] font-black text-[#8A6500]">Negotiated price</Text><Text className="text-[10px] text-[#999] line-through">₦{(Number(item.negotiatedQuote.originalPriceMinor || 0) / 100).toLocaleString()}</Text></View> : null}
          </View>
          <Text className="text-sm font-black">
            ₦{(lineTotalMinor / 100).toLocaleString()}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          {!item.checkoutEligible ? (
            <View className="flex-1 rounded-lg bg-[#FFF8DB] px-2.5 py-2">
              <Text className="text-[11px] font-bold text-[#725A0A]">Runner confirmation required</Text>
              <Text className="mt-0.5 text-[9px] text-[#8A7440]">Keep it here and check back soon.</Text>
            </View>
          ) : (
            <View
              className="flex-row items-center rounded-full bg-[#f2f2f3] p-1"
            >
              <Pressable
                disabled={quantity <= 1}
                onPress={() => onChange(quantity - 1)}
                className="h-7 w-7 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="remove" size={15} />
              </Pressable>
              <View className="w-9 items-center">
                <Text className="text-xs font-black">{quantity}</Text>
              </View>
              <Pressable
                disabled={quantity >= 99}
                onPress={() => onChange(quantity + 1)}
                className="h-7 w-7 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="add" size={15} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function cartItemIdentifier(item: any): string | null {
  const identifier = item?.id || item?.publicId || item?._id;
  return identifier ? String(identifier) : null;
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={strong ? "text-base font-black" : "text-sm text-[#666]"}>
        {label}
      </Text>
      <Text className={strong ? "text-xl font-black" : "text-sm font-bold"}>
        ₦{Number(value || 0).toLocaleString()}
      </Text>
    </View>
  );
}
function EmptyCart() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-[#F4F4F5]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <HookBackButton />
        <Text className="text-xl font-black text-black">Your cart</Text>
        <View className="h-11 w-11" />
      </View>
      <View className="mx-4 mt-3 overflow-hidden rounded-[24px] bg-[#171717] p-5">
        <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-white/10">
          <Ionicons name="bag-handle" size={22} color="#FFC809" />
        </View>
        <Text className="mt-5 text-[22px] font-black text-white">Ready when you are</Text>
        <Text className="mt-2 text-[13px] leading-5 text-white/60">Your selected products, quantities and current Hook prices will be organized here.</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8 pb-20">
        <View className="h-24 w-24 items-center justify-center rounded-[28px] bg-white">
          <Ionicons name="cart-outline" size={42} color="#B0B0B3" />
          <View className="absolute -right-1 -top-1 h-8 w-8 items-center justify-center rounded-full bg-hook"><Ionicons name="add" size={18} color="#111" /></View>
        </View>
        <Text className="mt-6 text-[22px] font-black text-black">Your cart is empty</Text>
        <Text className="mt-2 text-center text-[14px] leading-5 text-[#77777B]">Browse products from Hook Markets and add something you love.</Text>
        <Pressable onPress={() => router.replace("/(tabs)/discover")} className="mt-7 h-[52px] w-full items-center justify-center rounded-full bg-hook">
          <Text className="font-black text-black">Discover products</Text>
        </Pressable>
      </View>
    </View>
  );
}
function CartError({ retry }: { retry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-[#f4f4f5] px-8">
      <Ionicons name="cloud-offline-outline" size={44} color="#aaa" />
      <Text className="mt-4 text-xl font-black">Cart unavailable</Text>
      <Text className="mt-2 text-center text-sm text-[#777]">
        Check your connection and try again.
      </Text>
      <Pressable
        onPress={retry}
        className="mt-5 rounded-full bg-hook px-6 py-3"
      >
        <Text className="font-bold">Try again</Text>
      </Pressable>
    </View>
  );
}
