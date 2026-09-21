import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { HookConfirmSheet } from "@/components/shared/HookConfirmSheet";
import {
  BottomActionBar,
  BottomActionButton,
} from "@/components/shared/BottomActionBar";
import { Button } from "@/components/ui/button";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { toast } from "@/components/shared/toast";
import { resolveColor } from "@/components/marketplace/product-colors";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import {
  useCartQuery,
  useMinimumCheckoutMinor,
  useCartMarketProductsQuery,
  useClearCartMutation,
  getCartItems,
  useCustomerSessionQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "@/lib/mobile-api";
import { useCommerceSyncing } from "@/lib/commerce-sync";
import { isCustomerSession } from "@/lib/session";
import { designTokens, centeredHeaderTextStyle } from "@/constants/design-tokens";
import { useCartAddAnimation } from './useCartAddAnimation';

const cartMoney = (minor: number) =>
  `₦${(minor / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export function CartScreen({
  showBackButton = true,
}: { showBackButton?: boolean } = {}) {
  const insets = useSafeAreaInsets();
  const cart = useCartQuery();
  const syncingCommerce = useCommerceSyncing();
  const update = useUpdateCartItemMutation();
  const remove = useRemoveCartItemMutation();
  const removalAnimation = useCartAddAnimation();
  const removalLock = useRef(false);
  const clearLock = useRef(false);
  const clear = useClearCartMutation();
  const session = useCustomerSessionQuery();
  const { openAuth } = useAuthSheet();
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [pendingQuantities, setPendingQuantities] = useState<
    Record<string, number>
  >({});
  const quantityQueue = useRef(new Map<string, number>());
  const quantityWorkers = useRef(new Map<string, Promise<void>>());
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{
    item: any;
    id: string;
    source: View | null;
    target: View | null;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const data = cart.data as any;
  const minimumMinor = useMinimumCheckoutMinor();
  const marketProducts = useCartMarketProductsQuery(data);

  async function refreshCart() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await cart.refetch();
      if (getCartItems(data).some((item) => !item.market?.name && !item.product?.market?.name)) await marketProducts.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function visibleSubtotal(groupItems: any[]) {
    return groupItems.reduce(
      (sum, item) =>
        sum + Number(item.unitPriceMinor || 0) * visibleQuantity(item),
      0,
    );
  }

  function change(item: any, quantity: number) {
    const itemId = cartItemIdentifier(item);
    if (
      quantity < 1 ||
      quantity > 99 ||
      !itemId ||
      item.checkoutEligible === false
    )
      return;
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
    return itemId
      ? (pendingQuantities[itemId] ?? Number(item.quantity || 1))
      : Number(item.quantity || 1);
  }

  async function removeItem(item: any) {
    const itemId = cartItemIdentifier(item);
    if (!itemId || pendingIds.has(itemId) || removalLock.current || clearLock.current) return;
    removalLock.current = true;
    const animationSource = pendingRemoval;
    setPendingRemoval(null);
    const flight = removalAnimation.playBetween(item.product?.imageUrl || item.product?.media?.[0]?.url || item.product?.images?.[0], animationSource?.source || null, animationSource?.target || null);
    quantityQueue.current.delete(itemId);
    setPendingQuantities((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setPendingIds((current) => new Set(current).add(itemId));
    try {
      await flight; // Capture the native thumbnail before the optimistic row disappears.
      await quantityWorkers.current.get(itemId)?.catch(() => undefined);
      await remove.mutateAsync(itemId);
      setPendingRemoval(null);
      AccessibilityInfo.announceForAccessibility(`${item.product?.title || 'Item'} removed from cart`);
    } catch (error) {
      removalAnimation.reverse();
      toast.error(
        error instanceof Error ? error.message : "Could not remove item",
      );
    } finally {
      removalLock.current = false;
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }
  function requestRemoveItem(item: any, source: View | null, target: View | null) {
    if (removalLock.current || clearLock.current) return;
    const itemId = cartItemIdentifier(item);
    if (!itemId) return toast.error("This cart item cannot be removed yet");
    setPendingRemoval({ item, id: itemId, source, target });
  }
  async function clearCart() {
    if (clearLock.current || removalLock.current || quantityWorkers.current.size) return;
    clearLock.current = true;
    setConfirmClear(false);
    try {
      await clear.mutateAsync();
      AccessibilityInfo.announceForAccessibility('Cart cleared');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not clear cart",
      );
    } finally {
      clearLock.current = false;
    }
  }
  function continueShopping() {
    router.push("/(tabs)/discover" as never);
  }
  function checkout() {
    if (belowMinimum) {
      toast.info("Add a little more to check out", `Orders start at ₦${(minimumMinor / 100).toLocaleString("en-NG")}. Your cart stays saved.`);
      return;
    }
    if (getCartItems(data).some((item) => item.checkoutEligible === false)) {
      toast.info(
        "Some products need confirmation",
        "Remove unavailable products or check back once Hook confirms them.",
      );
      return;
    }
    if (!isCustomerSession(session.data)) {
      openAuth("/checkout" as never);
      return;
    }
    router.push("/checkout" as never);
  }

  if (cart.isLoading || syncingCommerce)
    return <HookPageLoading variant="cart" title="Your cart" label="Loading your cart" />;
  // A failed background refresh must not replace a cart we already have; only show the error when there is nothing to show.
  if (cart.isError && !cart.data) return <CartError retry={() => cart.refetch()} />;
  const items = getCartItems(data);
  const checkoutBlocked = items.some((item) => item.checkoutEligible === false);
  if (!items.length) return <View ref={removalAnimation.containerRef} collapsable={false} style={{ flex: 1 }}><EmptyCart showBackButton={showBackButton} />{remove.isPending || clear.isPending ? <View accessibilityLiveRegion="polite" className="absolute inset-x-4 bottom-10 items-center"><Text className="rounded-full bg-[#FFF4CC] px-4 py-2 text-sm font-semibold text-[#4D3A00]">Updating cart…</Text></View> : null}{removalAnimation.overlay}</View>;
  const marketMap = new Map<
    string,
    { key: string; name: string; items: any[] }
  >();
  const productMarkets = new Map<string, NonNullable<typeof marketProducts.data>[number]['market']>();
  for (const product of marketProducts.data || []) {
    productMarkets.set(product.publicId, product.market);
    if (product.hookId) productMarkets.set(product.hookId, product.market);
  }
  for (const item of items) {
    const productId = String(item.product?.publicId || item.product?.id || item.productId || '');
    const market = item.market?.name ? item.market : item.product?.market?.name ? item.product.market : productMarkets.get(productId);
    const key = String(market?.publicId || item.marketId || `unknown-${productId}`);
    const group: { key: string; name: string; items: any[] } = marketMap.get(key) || {
      key,
      name: market?.name || (marketProducts.isFetching ? 'Loading market…' : 'Market name unavailable'),
      items: [],
    };
    group.items.push(item);
    marketMap.set(key, group);
  }
  const marketGroups = [...marketMap.values()];
  const subtotalMinor = visibleSubtotal(items);
  const shortfallMinor = Math.max(0, minimumMinor - subtotalMinor);
  const belowMinimum = minimumMinor > 0 && shortfallMinor > 0;
  const unitCount = items.reduce((sum, item) => sum + visibleQuantity(item), 0);
  const cartBusy =
    Object.keys(pendingQuantities).length > 0 ||
    pendingIds.size > 0 ||
    clear.isPending;

  return (
    <View
      ref={removalAnimation.containerRef}
      collapsable={false}
      className="flex-1"
      style={{
        paddingTop: insets.top,
        backgroundColor: designTokens.color.background,
      }}
    >
      <View className="flex-row items-center justify-between px-4 py-3">
        {showBackButton ? <HookBackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/discover')} /> : <View className="h-11 w-11" />}
        <Text style={centeredHeaderTextStyle}>Your Cart</Text>
        <View
          accessibilityLabel={`${unitCount} items in your cart`}
          className="h-8 min-w-8 items-center justify-center rounded-full bg-hook px-2"
        >
          <Text className="text-xs font-semibold">{unitCount}</Text>
        </View>
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
          paddingBottom: designTokens.control.bottomContentInset + insets.bottom + 16,
        }}
      >
        <View className="gap-6">
          {marketGroups.map((group) => (
            <View
              key={group.key}
              className="gap-3 rounded-[20px] bg-white p-2.5"
            >
              <View className="flex-row items-center justify-between gap-2 px-1">
                <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                  <Ionicons name="location" size={16} color="#FFC809" />
                  <Text
                    numberOfLines={1}
                    className="flex-1 text-xs font-semibold uppercase tracking-wide text-black"
                  >
                    {group.name}
                  </Text>
                </View>
                <Text className="text-sm font-bold">
                  {cartMoney(visibleSubtotal(group.items))}
                </Text>
              </View>
              {group.items.map((item: any, index: number) => {
                const itemId = cartItemIdentifier(item);
                return (
                  <CartRow
                    key={itemId || group.key + "-" + index}
                    item={item}
                    busy={Boolean(itemId && pendingIds.has(itemId))}
                    quantity={visibleQuantity(item)}
                    onChange={(quantity) => change(item, quantity)}
                    onRemove={(source, target) => requestRemoveItem(item, source, target)}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <View className="mt-7 gap-3">
          <Text className="text-xl font-black">Details</Text>
          <SummaryRow
            label={
              "Subtotal (" +
              unitCount +
              (unitCount === 1 ? " item)" : " items)")
            }
            value={subtotalMinor / 100}
          />
          <View className="flex-row items-start justify-between gap-4">
            <Text className="text-sm text-[#666]">Delivery fee</Text>
            <Text className="flex-1 text-right text-xs leading-5 text-[#666]">
              Calculated at checkout
            </Text>
          </View>
          <View className="bg-[#FFE166] px-3.5 py-3">
            <SummaryRow
              label="Total before delivery"
              value={subtotalMinor / 100}
              strong
            />
          </View>
          {belowMinimum ? (
            <View accessibilityRole="alert" className="rounded-xl bg-[#FFF4CC] p-3">
              <Text className="text-xs font-semibold text-[#4D3A00]">
                Orders start at ₦{(minimumMinor / 100).toLocaleString("en-NG")}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-[#4D3A00]/80">
                Add ₦{(shortfallMinor / 100).toLocaleString("en-NG")} more to check out. Your cart stays saved until you are ready.
              </Text>
              <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#FFC809]/30">
                <View className="h-full rounded-full bg-[#FFC809]" style={{ width: `${Math.min(100, Math.round((subtotalMinor / minimumMinor) * 100))}%` }} />
              </View>
            </View>
          ) : null}
          {checkoutBlocked ? (
            <Text
              accessibilityRole="alert"
              className="text-xs leading-5 text-[#A2392C]"
            >
              Remove unavailable products or wait for Hook to confirm them
              before checkout.
            </Text>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              onPress={continueShopping}
              className="min-h-11 justify-center"
            >
              <Text className="text-xs font-semibold text-[#666]">
                Continue shopping
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={cartBusy}
              onPress={() => setConfirmClear(true)}
              className="min-h-11 justify-center disabled:opacity-40"
            >
              <Text className="text-xs font-semibold text-red-500">
                Clear cart
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <BottomActionBar>
        <BottomActionButton
          label={cartBusy ? "Updating cart…" : belowMinimum ? `Add ₦${(shortfallMinor / 100).toLocaleString("en-NG")} more to check out` : "Proceed to Checkout"}
          disabled={checkoutBlocked || cartBusy || belowMinimum}
          onPress={checkout}
        />
      </BottomActionBar>
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
        message={
          pendingRemoval
            ? `Remove ${pendingRemoval.item.product?.title || "this product"} from your cart?`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Keep item"
        destructive
        busy={Boolean(pendingRemoval && pendingIds.has(pendingRemoval.id))}
        onConfirm={() =>
          pendingRemoval ? removeItem(pendingRemoval.item) : undefined
        }
        onClose={() => setPendingRemoval(null)}
      />
      {removalAnimation.overlay}
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
  onRemove: (source: View | null, target: View | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  const imageRef = useRef<View>(null);
  const trashRef = useRef<View>(null);
  const product = item.product;
  const selectedColorValue =
    item.selectedVariants?.color || item.selectedVariants?.colour;
  const displayColor = selectedColorValue
    ? resolveColor(selectedColorValue)
    : undefined;
  // Size and anything else the category asks for (capacity, length, connector...).
  const otherDetails = Object.entries(item.selectedVariants || {})
    .filter(([key, value]) => key !== "color" && key !== "colour" && Boolean(value))
    .sort(([a], [b]) => (a === "size" ? -1 : b === "size" ? 1 : a.localeCompare(b)))
    .map(([, value]) => String(value));
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
    <Animated.View
      layout={LinearTransition.duration(reducedMotion ? 0 : 220)}
      exiting={FadeOut.duration(reducedMotion ? 0 : 180)}
      className={`flex-row gap-3 rounded-[16px] bg-[#F1F1F3] p-2.5 ${item.checkoutEligible === false ? "border border-red-100" : ""}`}
    >
      <Pressable
        ref={imageRef}
        collapsable={false}
        accessibilityRole="button"
        accessibilityLabel={`View ${product?.title || "product"} details`}
        disabled={!productId}
        onPress={openProduct}
        className="overflow-hidden rounded-[10px] border border-black/20 bg-white active:opacity-80"
        style={{ width: 80, height: 80, flexShrink: 0 }}
      >
        <RemoteImage
          uri={
            product?.imageUrl ||
            product?.media?.[0]?.url ||
            product?.images?.[0]
          }
        />
      </Pressable>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            numberOfLines={2}
            className="flex-1 text-sm font-semibold leading-5 text-black/60"
          >
            {product?.title || "Unavailable product"}
          </Text>
          <Pressable
            ref={trashRef}
            collapsable={false}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${product?.title || "product"}`}
            disabled={busy}
            onPress={() => onRemove(imageRef.current, trashRef.current)}
            hitSlop={10}
          >
            <Ionicons name="trash" size={21} color="#FF2525" />
          </Pressable>
        </View>
        {displayColor || otherDetails.length ? (
          <View className="mt-2 flex-row items-center gap-2">
            {displayColor ? (
              <View
                className="h-4 w-4 rounded-full border border-black/10"
                style={{ backgroundColor: displayColor.hex }}
              />
            ) : null}
            <Text numberOfLines={1} className="flex-1 text-xs text-[#777]">
              {[displayColor?.name, ...otherDetails]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ) : null}
        <View className="mt-2 flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-[#777]">
              ₦{(Number(item.unitPriceMinor || 0) / 100).toLocaleString()} each
            </Text>
            {item.negotiatedQuote ? (
              <View className="mt-1 flex-row items-center gap-1.5">
                <Text className="text-[10px] font-black text-[#8A6500]">
                  Negotiated price
                </Text>
                <Text className="text-[10px] text-[#999] line-through">
                  ₦
                  {(
                    Number(item.negotiatedQuote.originalPriceMinor || 0) / 100
                  ).toLocaleString()}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-sm font-black">
            ₦{(lineTotalMinor / 100).toLocaleString()}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          {item.checkoutEligible === false ? (
            <View className="flex-1 rounded-lg bg-[#FFF8DB] px-2.5 py-2">
              <Text className="text-[11px] font-bold text-[#725A0A]">
                Hook is confirming availability
              </Text>
              <Text className="mt-0.5 text-[9px] text-[#8A7440]">
                Keep it here and check back soon.
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center rounded-full bg-[#E2E2E2] p-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${product?.title || "product"} quantity`}
                disabled={busy || quantity <= 1}
                onPress={() => onChange(quantity - 1)}
                className="h-7 w-7 items-center justify-center rounded-full bg-black disabled:opacity-40"
              >
                <Ionicons name="remove" size={15} color="white" />
              </Pressable>
              <View className="w-9 items-center">
                <Text className="text-xs font-black">{quantity}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Increase ${product?.title || "product"} quantity`}
                disabled={busy || quantity >= 99}
                onPress={() => onChange(quantity + 1)}
                className="h-7 w-7 items-center justify-center rounded-full bg-black disabled:opacity-40"
              >
                <Ionicons name="add" size={15} color="white" />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
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
      <Text
        className={
          strong ? "flex-1 text-base font-bold" : "flex-1 text-sm text-[#666]"
        }
      >
        {label}
      </Text>
      <Text className="text-sm font-bold">
        ₦{Number(value || 0).toLocaleString()}
      </Text>
    </View>
  );
}
function EmptyCart({ showBackButton }: { showBackButton: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-[#F4F4F5]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        {showBackButton ? <HookBackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/discover')} /> : <View className="h-11 w-11" />}
        <Text style={centeredHeaderTextStyle}>Your cart</Text>
        <View className="h-11 w-11" />
      </View>
      <View className="mx-4 mt-3 overflow-hidden rounded-[24px] bg-[#171717] p-5">
        <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-white/10">
          <Ionicons name="bag-handle" size={22} color="#FFC809" />
        </View>
        <Text className="mt-5 text-[22px] font-black text-white">
          Ready when you are
        </Text>
        <Text className="mt-2 text-[13px] leading-5 text-white/60">
          Your selected products, quantities and current Hook prices will be
          organized here.
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-8 pb-20">
        <View className="h-24 w-24 items-center justify-center rounded-[28px] bg-white">
          <Ionicons name="cart-outline" size={42} color="#B0B0B3" />
          <View className="absolute -right-1 -top-1 h-8 w-8 items-center justify-center rounded-full bg-hook">
            <Ionicons name="add" size={18} color="#111" />
          </View>
        </View>
        <Text className="mt-6 text-[22px] font-black text-black">
          Your cart is empty
        </Text>
        <Text className="mt-2 text-center text-[14px] leading-5 text-[#77777B]">
          Browse products from Hook Markets and add something you love.
        </Text>
        <Button
          title="Discover products"
          onPress={() => router.replace("/(tabs)/discover")}
          className="mt-7 w-full"
        />
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
