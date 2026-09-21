import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/lib/haptics";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useCartAddAnimation } from "@/components/cart/useCartAddAnimation";

import { SkeletonBlock, SkeletonGroup } from "@/components/motion/Skeleton";
import { HookSheet } from "@/components/shared/HookSheet";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { resolveColor } from "@/components/marketplace/product-colors";
import { ApiError } from "@/lib/api";
import { useAddCartItemMutation, useProductQuery, type PublicCatalogProduct } from "@/lib/mobile-api";
import {
  autoSelection,
  availableValues,
  buildAxes,
  choose,
  findVariant,
  nextMissingAxis,
  valueOf,
  variantDetails,
  type Selection,
} from "@/lib/variant-axes";

const naira = (minor: number) => `₦${Math.round(minor / 100).toLocaleString("en-NG")}`;

/**
 * Add-to-cart from a product card. Shows the options this product asks for,
 * a quantity, then confirms exactly what was added, with a way to open the
 * cart or keep shopping. Nothing is added until the customer confirms.
 */
export function QuickAddSheet({ product: listed, visible, onClose }: { product: PublicCatalogProduct; visible: boolean; onClose: () => void }) {
  const add = useAddCartItemMutation();
  // The photo flies from the sheet's thumbnail into its cart icon, which bounces: the same tap feedback as the product page.
  const cartAnimation = useCartAddAnimation(listed.publicId);
  const thumbRef = useRef<View>(null);
  // Cards carry a light product. The full one has the category's questions
  // (phone model, length, capacity...) and every variant, so load it when opened.
  const full = useProductQuery(visible ? listed.publicId : undefined);
  const product = full.data || listed;
  const loadingOptions = visible && full.isLoading;
  // If the full product cannot load we do not know its options, so adding blind would create an unspecified line.
  const loadFailed = visible && full.isError && !full.data;
  const variants = useMemo(() => product.variants || [], [product.variants]);
  const axes = useMemo(() => buildAxes(variants, product.category?.attributes), [variants, product.category?.attributes]);
  const [selection, setSelection] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<{ quantity: number; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) cartAnimation.cancel();
    if (visible) {
      setSelection({});
      setQuantity(1);
      setAdded(null);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const active = useMemo(() => autoSelection(axes, selection), [axes, selection]);
  const missing = nextMissingAxis(axes, active);
  const variant = axes.length ? (missing ? undefined : findVariant(variants, active)) : variants.length === 1 ? variants[0] : undefined;
  const stock = product.availableQuantity ?? 99;
  const maxQuantity = Math.max(1, Math.min(stock, 10));
  const summary = axes.map((axis) => `${axis.label}: ${active[axis.key] || "—"}`).join(" · ");

  function confirm() {
    if (add.isPending) return;
    if (variants.length > 0 && !variant) {
      setError(`Choose ${missing ? `a ${missing.label.toLowerCase()}` : "an option"} first`);
      return;
    }
    setError(null);
    // Acknowledge the tap at once; it is reversed if the save fails.
    void cartAnimation.playBetween(product.media?.[0]?.url, thumbRef.current, cartAnimation.cartRef.current);
    add.mutate(
      {
        productId: product.publicId,
        variantId: variant?.publicId,
        quantity,
        selectedVariants: variant ? variantDetails(variant) : {},
        optimisticProduct: product,
      },
      {
        onSuccess: () => {
          setAdded({ quantity, summary });
          AccessibilityInfo.announceForAccessibility(`${quantity} ${product.title} added to cart`);
        },
        onError: (err) => {
          cartAnimation.reverse();
          setError(err instanceof ApiError && err.message ? err.message : "Could not add this item. Please try again.");
        },
      },
    );
  }

  return (
    <HookSheet visible={visible} onClose={onClose} accessibilityLabel={`Add ${product.title} to cart`} maxHeight="88%">
      <View ref={cartAnimation.containerRef} collapsable={false}>
      <View className="flex-row gap-3">
        <View ref={thumbRef} collapsable={false} className="h-20 w-20 overflow-hidden rounded-xl bg-[#F1F1F3]">
          <RemoteImage uri={product.media?.[0]?.url} />
        </View>
        <View className="min-w-0 flex-1 justify-center">
          <Text numberOfLines={2} className="text-[15px] font-bold text-black">{product.title}</Text>
          <Text className="mt-1 text-[15px] font-black text-[#D9A700]">{naira(product.effectivePriceMinor * quantity)}</Text>
          {quantity > 1 ? <Text className="text-[11px] text-black/45">{naira(product.effectivePriceMinor)} each</Text> : null}
        </View>
        <Animated.View style={cartAnimation.cartAnimatedStyle}>
          <View ref={cartAnimation.cartRef} collapsable={false} className="h-10 w-10 items-center justify-center rounded-full bg-[#F1F1F3]">
            <Ionicons name="cart-outline" size={20} color="#111" />
          </View>
        </Animated.View>
      </View>

      {added ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} className="mt-5">
          <View className="items-center rounded-2xl bg-[#ECFDF3] px-4 py-5">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#12B76A]">
              <Ionicons name="checkmark" size={26} color="#fff" />
            </View>
            <Text className="mt-3 text-[15px] font-bold text-black">Added to your cart</Text>
            <Text className="mt-1 text-center text-[13px] text-black/70">
              {added.quantity} × {product.title}
            </Text>
            {added.summary ? <Text className="mt-1 text-center text-[12px] text-black/50">{added.summary}</Text> : null}
          </View>
          <View className="mt-4 flex-row gap-3">
            <Pressable accessibilityRole="button" onPress={onClose} className="h-12 flex-1 items-center justify-center rounded-full bg-[#F1F1F3]">
              <Text className="text-[13px] font-bold text-black">Keep shopping</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                router.push("/(app)/cart" as never);
              }}
              className="h-12 flex-1 items-center justify-center rounded-full bg-[#FFC809]"
            >
              <Text className="text-[13px] font-bold text-black">View cart</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <>
          {loadFailed ? (
            <View accessibilityRole="alert" className="mt-5 items-center rounded-2xl bg-[#FFF0ED] px-4 py-5">
              <Text className="text-center text-[13px] font-semibold text-[#7D2C20]">Couldn’t load this product’s options</Text>
              <Pressable accessibilityRole="button" onPress={() => void full.refetch()} className="mt-3 rounded-full bg-[#FFC809] px-5 py-2.5">
                <Text className="text-[13px] font-bold text-black">{full.isFetching ? "Trying…" : "Try again"}</Text>
              </Pressable>
            </View>
          ) : null}
          {loadingOptions ? (
            <SkeletonGroup label="Loading options" style={{ marginTop: 20, gap: 14 }}>
              <SkeletonBlock width="30%" height={14} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[64, 72, 56, 68].map((w, i) => <SkeletonBlock key={i} width={w} height={40} radius={20} />)}
              </View>
              <SkeletonBlock width="24%" height={14} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[84, 96].map((w, i) => <SkeletonBlock key={i} width={w} height={40} radius={20} />)}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <SkeletonBlock width="22%" height={14} />
                <SkeletonBlock width={112} height={40} radius={20} />
              </View>
              <SkeletonBlock height={48} radius={24} />
            </SkeletonGroup>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false} className="mt-4" style={{ maxHeight: 360, display: loadingOptions || loadFailed ? "none" : "flex" }}>
            {axes.map((axis) => {
              const chosen = active[axis.key] || "";
              const enabledValues = availableValues(variants, active, axis.key);
              return (
                <View key={axis.key} className="mb-4">
                  <Text className="text-[13px] font-semibold text-black">
                    {axis.label}
                    {!chosen ? <Text className="text-[#C53B35]"> *</Text> : null}
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {axis.values.map((value) => {
                      const selected = chosen.toLowerCase() === value.toLowerCase();
                      const enabled = enabledValues.has(value.toLowerCase());
                      const colour = axis.type === "colour" ? resolveColor(value) : null;
                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityState={{ selected, disabled: !enabled }}
                          disabled={!enabled}
                          onPress={() => {
                            haptics.select();
                            setError(null);
                            setSelection((current) => choose(variants, axes, current, axis.key, value));
                          }}
                          className={`flex-row items-center rounded-full border px-3 py-2 ${selected ? "border-black bg-black" : "border-black/20 bg-white"} ${enabled ? "" : "opacity-35"}`}
                        >
                          {colour ? <View className="mr-1.5 h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: colour.hex }} /> : null}
                          <Text className={`text-[13px] font-medium ${selected ? "text-white" : "text-black"}`}>{colour ? colour.name : value}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-black">Quantity</Text>
              <View className="flex-row items-center rounded-full bg-[#F1F1F3]">
                <Pressable accessibilityLabel="Decrease quantity" disabled={quantity <= 1} onPress={() => { haptics.select(); setQuantity((q) => Math.max(1, q - 1)); }} className="h-10 w-10 items-center justify-center disabled:opacity-30">
                  <Ionicons name="remove" size={18} color="#111" />
                </Pressable>
                <Text className="w-8 text-center text-[14px] font-bold text-black">{quantity}</Text>
                <Pressable accessibilityLabel="Increase quantity" disabled={quantity >= maxQuantity} onPress={() => { haptics.select(); setQuantity((q) => Math.min(maxQuantity, q + 1)); }} className="h-10 w-10 items-center justify-center disabled:opacity-30">
                  <Ionicons name="add" size={18} color="#111" />
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {error ? <Text accessibilityRole="alert" className="mt-3 text-[12px] text-[#C53B35]">{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={add.isPending || loadingOptions || loadFailed}
            onPress={confirm}
            className="mt-4 h-12 items-center justify-center rounded-full bg-[#FFC809] disabled:opacity-60"
            style={{ display: loadingOptions || loadFailed ? "none" : "flex" }}
          >
            <Text className="text-[14px] font-bold text-black">
              {add.isPending ? "Adding…" : `Add to cart · ${naira(product.effectivePriceMinor * quantity)}`}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push({ pathname: "/products/[id]", params: { id: product.publicId } } as never); }} className="mt-1 h-10 items-center justify-center" style={{ display: loadingOptions ? "none" : "flex" }}>
            <Text className="text-[12px] font-semibold text-black/55">View full details</Text>
          </Pressable>
        </>
      )}
      {cartAnimation.overlay}
      </View>
    </HookSheet>
  );
}
