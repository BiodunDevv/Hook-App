import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CartButton } from "@/components/cart/CartButton";
import { useCartAddAnimation } from "@/components/cart/useCartAddAnimation";
import { CatalogProductCard } from "@/components/marketplace/CatalogProductCard";
import { NegotiationPrompt } from "@/components/marketplace/NegotiationPrompt";
import { NegotiationOptionsSheet } from "@/components/negotiation/NegotiationOptionsSheet";
import { ProductInformation } from "@/components/marketplace/ProductInformation";
import { BottomActionBar, BottomActionButton } from "@/components/shared/BottomActionBar";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookSheet } from "@/components/shared/HookSheet";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { toast } from "@/components/shared/toast";
import { resolveColor } from "@/components/marketplace/product-colors";
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { isCustomerSession } from "@/lib/session";
import { ApiError } from "@/lib/api";
import { designTokens } from "@/constants/design-tokens";
import {
  useAddCartItemMutation,
  useActiveNegotiationQuery,
  useCustomerSessionQuery,
  useLikedProductsQuery,
  useProductQuery,
  useProductsQuery,
  useToggleProductLikeMutation,
  type PublicCatalogProduct,
} from "@/lib/mobile-api";

type ProductVariant = PublicCatalogProduct["variants"][number];

function variantColor(variant: ProductVariant) {
  return (
    variant.colour ||
    variant.attributes?.color ||
    variant.attributes?.colour ||
    ""
  );
}

export default function ProductDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const optionPositions = useRef({ details: 0, colour: 0, size: 0 });
  const reducedMotion = useReducedMotion();
  const query = useProductQuery(id);
  const add = useAddCartItemMutation();
  const addLock = useRef(false);
  const session = useCustomerSessionQuery();
  const likes = useLikedProductsQuery();
  const toggleLike = useToggleProductLikeMutation();
  const { openAuth } = useAuthSheet();
  const product = query.data;
  const cartAnimation = useCartAddAnimation(product?.publicId);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>();
  const [selectedSize, setSelectedSize] = useState<string>();
  const [addedToCart, setAddedToCart] = useState(false);
  const [pendingCartAction, setPendingCartAction] = useState<'add' | 'buy' | null>(null);
  const [cartError, setCartError] = useState<{ message: string; uncertain: boolean; buy: boolean } | null>(null);
  const [sizeGuideVisible, setSizeGuideVisible] = useState(false);
  const [negotiationOptionsVisible, setNegotiationOptionsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const addedFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refreshProduct() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function goBack() {
    if (returnTo === "/(app)/cart") {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(app)/cart");
      }
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }

  const variants = useMemo(() => product?.variants || [], [product?.variants]);
  const colorOptions = useMemo(() => {
    const values = new Map<string, string>();
    variants.forEach((variant) => {
      const value = variantColor(variant);
      if (value && !values.has(value.toLowerCase()))
        values.set(value.toLowerCase(), value);
    });
    return [...values.values()];
  }, [variants]);
  const sizeOptions = useMemo(() => {
    const values = new Set<string>();
    variants.forEach((variant) => {
      if (variant.size) values.add(variant.size);
    });
    return [...values];
  }, [variants]);
  const selectedVariant = variants.find((variant) => {
    const colorMatches =
      !colorOptions.length ||
      variantColor(variant).toLowerCase() === selectedColor?.toLowerCase();
    const sizeMatches = !sizeOptions.length || variant.size === selectedSize;
    return colorMatches && sizeMatches;
  });
  const negotiated = useActiveNegotiationQuery(
    isCustomerSession(session.data) ? product?.publicId : undefined,
    selectedVariant?.publicId,
    quantity,
  );
  const quote = negotiated.data?.quote;
  const negotiatedPriceMinor = Number(quote?.agreedPriceMinor || 0);
  const displayPriceMinor =
    negotiatedPriceMinor || Number(product?.effectivePriceMinor || 0);
  const relatedByMarket = useProductsQuery(
    { marketId: product?.market?.publicId, limit: 10 },
    Boolean(product?.market?.publicId),
  );
  const relatedByCategory = useProductsQuery(
    { categoryId: product?.category?.publicId, limit: 10 },
    Boolean(product?.category?.publicId),
  );
  const suggestions = useMemo(() => {
    const currentId = product?.publicId;
    const seen = new Set<string>();
    const result: PublicCatalogProduct[] = [];
    for (const item of relatedByMarket.data?.data || []) {
      if (item.publicId === currentId || seen.has(item.publicId)) continue;
      seen.add(item.publicId);
      result.push(item);
    }
    if (result.length < 4) {
      for (const item of relatedByCategory.data?.data || []) {
        if (item.publicId === currentId || seen.has(item.publicId)) continue;
        seen.add(item.publicId);
        result.push(item);
      }
    }
    return result.slice(0, 8);
  }, [relatedByMarket.data, relatedByCategory.data, product?.publicId]);
  const images = product?.media?.length ? product.media : [{ url: "" }];
  const heroHeight = Math.min(Math.max(width * 1.1, 380), 460);
  const isLiked = Boolean(
    product && likes.data?.productIds.includes(product.publicId),
  );

  useEffect(() => {
    setQuantity(1);
    setActiveImage(0);

    setSelectedColor(undefined);
    setSelectedSize(undefined);
  }, [product?.publicId, product?.variants]);

  useEffect(
    () => () => {
      if (addedFeedbackTimer.current) clearTimeout(addedFeedbackTimer.current);
    },
    [],
  );

  function chooseColor(value: string) {
    if (selectedColor?.toLowerCase() === value.toLowerCase()) return;
    setSelectedColor(value);
    // A colour change creates a new choice: never carry a size across silently.
    setSelectedSize(undefined);
  }

  function chooseSize(value: string) {
    if (colorOptions.length && !selectedColor) return;
    const matching = variants.some(
      (variant) =>
        variant.size === value &&
        (!selectedColor ||
          variantColor(variant).toLowerCase() === selectedColor.toLowerCase()),
    );
    if (matching) setSelectedSize(value);
  }

  function addToCart(redirectToCart = false) {
    if (!product || !product.isPurchasable || add.isPending || addLock.current)
      return;
    if (variants.length > 0 && !selectedVariant) {
      const missing = [
        colorOptions.length && !selectedColor ? "a colour" : null,
        sizeOptions.length && !selectedSize ? "a size" : null,
      ].filter(Boolean);
      toast.error(
        `Choose ${missing.join(" and ") || "an option"} before adding to cart`,
      );
      return;
    }
    addLock.current = true;
    setPendingCartAction(redirectToCart ? 'buy' : 'add');
    setCartError(null);
    setAddedToCart(false);
    if (addedFeedbackTimer.current) {
      clearTimeout(addedFeedbackTimer.current);
      addedFeedbackTimer.current = null;
    }
    const input = {
      productId: product.publicId,
      variantId: selectedVariant?.publicId,
      quantity,
      selectedVariants: {
        color:
          variantColor(selectedVariant || ({} as ProductVariant)) || undefined,
        size: selectedVariant?.size,
      },
      ...(quote?.id ? { quoteId: quote.id } : {}),
      optimisticProduct: product,
    };
    const addedImageUri = images[activeImage]?.url || images[0]?.url;
    // Acknowledge the tap immediately; this is not a saved-cart receipt.
    if (!redirectToCart) void cartAnimation.play(addedImageUri);

    add.mutate(input, {
      onSuccess: () => {
        if (redirectToCart) {
          router.push('/(app)/cart' as never);
        } else {
          setAddedToCart(true);
          AccessibilityInfo.announceForAccessibility(`${product.title} added to cart`);
        }
      },
      onError: (error) => {
        setAddedToCart(false);
        cartAnimation.reverse();
        const uncertain = !(error instanceof ApiError) || !error.status || error.status >= 500;
        setCartError({ uncertain, buy: redirectToCart, message: uncertain
          ? 'We could not confirm the save. Check your cart before adding again.'
          : error.message || 'Could not add this item. Please try again.' });
      },
      onSettled: () => {
        addLock.current = false;
        setPendingCartAction(null);
        addedFeedbackTimer.current = setTimeout(
          () => setAddedToCart(false),
          1400,
        );
      },
    });
  }

  async function toggleProductLike() {
    if (!product || session.isPending) return;
    try {
      await toggleLike.mutateAsync({
        productId: product.publicId,
        liked: isLiked,
        product,
      });
      toast.success(isLiked ? "Removed from saved" : "Saved to your likes");
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 401
          ? "Sign in to save products"
          : "Could not update saved products",
      );
    }
  }

  if (query.isLoading) {
    return (
      <HookPageLoading
        title="Product details"
        label="Loading product"
        onBack={goBack}
      />
    );
  }

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F1F1F3] px-8">
        <Text className="text-lg font-black text-black">
          Product unavailable
        </Text>
        <Pressable
          onPress={goBack}
          className="mt-4 rounded-full bg-[#FFC809] px-6 py-3"
        >
          <Text className="font-bold text-black">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const variantRequired = variants.length > 0 && !selectedVariant;
  const selectionPrompt =
    colorOptions.length && !selectedColor
      ? "Select a colour to continue"
      : sizeOptions.length && !selectedSize
        ? "Now select your size to continue"
        : "Select the available options to continue";
  const availableQuantity = product.availableQuantity;
  const outOfStock = availableQuantity === 0;
  const unavailable = product.isPurchasable === false || outOfStock;
  // Only nudge once stock is genuinely low — the threshold is set by admin.
  const lowStock =
    typeof availableQuantity === "number" &&
    availableQuantity > 0 &&
    availableQuantity <= (product.lowStockThreshold ?? 5);

  return (
    <View ref={cartAnimation.containerRef} collapsable={false} className="flex-1 bg-[#F1F1F3]">
      <ScrollView
        ref={scrollRef}
        alwaysBounceVertical
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 124 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshProduct()}
            tintColor="#FFC809"
            colors={["#FFC809"]}
            progressViewOffset={insets.top}
          />
        }
      >
        <View
          ref={cartAnimation.heroRef}
          collapsable={false}
          className="relative overflow-hidden rounded-b-[22px] bg-white"
          style={{ height: heroHeight }}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              setActiveImage(
                Math.round(event.nativeEvent.contentOffset.x / width),
              );
            }}
          >
            {images.map((image, index) => (
              <View
                key={`${image.url || "fallback"}-${index}`}
                style={{ width, height: heroHeight }}
              >
                <RemoteImage uri={image.url} />
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="h-10 flex-row items-center justify-center gap-1.5">
          {images.slice(0, 5).map((image, index) => (
            <View
              key={`${image.url || "dot"}-${index}`}
              className={`h-2 rounded-full ${index === activeImage ? "w-5 bg-[#FFC809]" : "w-2 bg-[#96969B]"}`}
            />
          ))}
        </View>

        <View className="gap-7 px-3 pb-4" onLayout={(event) => { optionPositions.current.details = event.nativeEvent.layout.y; }}>
          {unavailable && !outOfStock ? (
            <View className="flex-row items-start rounded-[16px] border border-amber-200 bg-[#FFF8DB] p-4">
              <Ionicons name="time-outline" size={21} color="#8A6500" />
              <View className="ml-3 flex-1">
                <Text className="font-black text-[#4D3A00]">
                  Temporarily unavailable
                </Text>
                <Text className="mt-1 text-[12px] leading-5 text-[#725A0A]">
                  {product.availabilityNote ||
                    "A Hook Market Associate is confirming availability. Keep it saved and check back soon."}
                </Text>
              </View>
            </View>
          ) : null}
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text
                numberOfLines={2}
                className="text-[24px] font-black leading-7 text-black"
              >
                {product.title}
              </Text>
              <View className="mt-2 flex-row items-center gap-2">
                <Text className="text-[20px] font-black text-[#FFC809]">
                  ₦{(displayPriceMinor / 100).toLocaleString()}
                </Text>
                {negotiatedPriceMinor > 0 ? (
                  <Text className="text-[13px] text-black/50 line-through">
                    ₦{(product.effectivePriceMinor / 100).toLocaleString()}
                  </Text>
                ) : product.discountMinor > 0 ? (
                  <Text className="text-[13px] text-black/50 line-through">
                    ₦{(product.sellingPriceMinor / 100).toLocaleString()}
                  </Text>
                ) : null}
                {outOfStock ? (
                  <View className="rounded-full bg-[#EDEDED] px-2.5 py-1">
                    <Text className="text-[11px] font-black text-[#5A5A5A]">
                      Out of stock
                    </Text>
                  </View>
                ) : lowStock ? (
                  <View className="rounded-full bg-[#FDE8E4] px-2.5 py-1">
                    <Text className="text-[11px] font-black text-[#B3402A]">
                      Only {availableQuantity} left
                    </Text>
                  </View>
                ) : null}
              </View>
              {negotiatedPriceMinor > 0 ? (
                <View className="mt-2 self-start rounded-full bg-[#FFF2B8] px-3 py-1.5">
                  <Text className="text-[11px] font-black text-[#765700]">
                    Your negotiated price applies to each item
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row items-center rounded-full bg-[#E2E2E2] px-1 py-1">
              <Pressable
                accessibilityLabel="Decrease quantity"
                disabled={quantity <= 1}
                onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-7 w-7 items-center justify-center rounded-full bg-black"
              >
                <Ionicons name="remove" size={15} color="white" />
              </Pressable>
              <Text className="w-8 text-center text-[13px] font-medium text-black">
                {String(quantity).padStart(2, "0")}
              </Text>
              <Pressable
                accessibilityLabel="Increase quantity"
                disabled={quantity >= 20}
                onPress={() => setQuantity((value) => Math.min(20, value + 1))}
                className="h-7 w-7 items-center justify-center rounded-full bg-black"
              >
                <Ionicons name="add" size={15} color="white" />
              </Pressable>
            </View>
          </View>

          {product.negotiationAvailable && !unavailable ? (
            <NegotiationPrompt
              onPress={() => { setNegotiationOptionsVisible(true); void query.refetch(); }}
            />
          ) : null}

          <ProductInformation key={product.publicId} name={product.title} description={product.description} />

          {colorOptions.length ? (
            <View onLayout={(event) => { optionPositions.current.colour = event.nativeEvent.layout.y; }}>
              <Text className="text-sm font-semibold text-black">
                Colour
                    {!selectedColor ? (
                      <Text className="text-[#C53B35]"> *</Text>
                    ) : null}
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {colorOptions.map((value) => {
                  const selected = selectedColor?.toLowerCase() === value.toLowerCase();
                  const displayColor = resolveColor(value);
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${displayColor.name} colour`}
                      accessibilityState={{ selected }}
                      onPress={() => chooseColor(value)}
                      className={`flex-row items-center rounded-full border px-2.5 py-1.5 ${selected ? "border-black" : "border-black/25"}`}
                    >
                      <View className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: displayColor.hex }} />
                      <Text className="ml-1.5 text-[13px] text-black">{displayColor.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {sizeOptions.length ? (
            <View onLayout={(event) => { optionPositions.current.size = event.nativeEvent.layout.y; }}>
                  <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-black">
                  Size
                      {!selectedSize ? (
                        <Text className="text-[#C53B35]"> *</Text>
                      ) : null}
                    </Text>
                    {product.category?.sizingGuide?.summary ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open size guide"
                        onPress={() => setSizeGuideVisible(true)}
                        className="flex-row items-center gap-1"
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={16}
                          color="#555"
                        />
                        <Text className="text-xs font-semibold text-black/60">
                          Size guide
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
              <View className="mt-3 flex-row flex-wrap gap-2">
                    {sizeOptions.map((size) => {
                      const enabled =
                        !colorOptions.length ||
                        Boolean(
                          selectedColor &&
                          variants.some(
                            (variant) =>
                              variant.size === size &&
                              variantColor(variant).toLowerCase() ===
                                selectedColor.toLowerCase(),
                          ),
                        );
                      const selected = selectedSize === size;
                      return (
                        <Pressable
                          key={size}
                          accessibilityRole="button"
                          accessibilityLabel={`Select size ${size}`}
                          accessibilityState={{ selected, disabled: !enabled }}
                          disabled={!enabled}
                          onPress={() => chooseSize(size)}
                          className={`min-w-11 items-center rounded-lg border px-3.5 py-2.5 ${selected ? "border-black bg-black" : enabled ? "border-black/20 bg-white" : "border-black/5 bg-black/[0.03] opacity-40"}`}
                        >
                          <Text
                            className={`text-[14px] font-semibold ${selected ? "text-white" : "text-black"}`}
                          >
                            {size}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
          ) : null}

          <Text className="text-xs text-black/55">
            {unavailable
              ? "Purchase actions will return after Market Associate confirmation."
              : product.market?.name
                ? `Available from ${product.market.name}`
                : "Available from a verified Hook Market"}
          </Text>
        </View>

        {suggestions.length ? (
          <View className="mt-2">
            <Text className="px-3 text-base font-medium text-black">
              You might also like
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 12,
                paddingTop: 12,
              }}
            >
              {suggestions.map((item) => (
                <View key={item.publicId} style={{ width: 150 }}>
                  <CatalogProductCard product={item} variant="figma" />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
      <View
        className="absolute inset-x-0 z-50 flex-row items-center justify-between px-4"
        pointerEvents="box-none"
        style={{ top: insets.top + 10, height: 44 }}
      >
        <HookBackButton onPress={goBack} />
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isLiked ? "Remove product from likes" : "Save product to likes"
            }
            accessibilityState={{
              selected: isLiked,
              disabled: toggleLike.isPending,
            }}
            disabled={toggleLike.isPending}
            onPress={() => void toggleProductLike()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/90"
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? "#FFC809" : "#111"}
            />
          </Pressable>
          <Animated.View style={cartAnimation.cartAnimatedStyle}>
            <View ref={cartAnimation.cartRef} collapsable={false}><CartButton tone="white" /></View>
          </Animated.View>
        </View>
      </View>

      {variantRequired && !unavailable ? (
        <View
          className="absolute inset-x-0 bottom-0 items-center px-4 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={selectionPrompt} accessibilityHint="Scrolls to the required product options" accessibilityLiveRegion="polite"
            onPress={() => {
              const section = colorOptions.length && !selectedColor ? 'colour' : sizeOptions.length && !selectedSize ? 'size' : colorOptions.length ? 'colour' : 'size';
              scrollRef.current?.scrollTo({ y: Math.max(0, optionPositions.current.details + optionPositions.current[section] - insets.top - 72), animated: !reducedMotion });
            }}
            className="min-h-11 max-w-full flex-row items-center gap-2 rounded-2xl border border-[#E3C458] bg-[#FFF4CC] px-4 py-3 active:opacity-80">
            <Ionicons name={colorOptions.length && !selectedColor ? 'color-palette-outline' : 'resize-outline'} size={19} color="#614A00" />
            <Text className="flex-shrink text-center text-[14px] font-bold leading-5 text-[#4D3A00]">{selectionPrompt}</Text>
            <Ionicons name="chevron-down" size={16} color="#614A00" />
          </Pressable>
        </View>
      ) : (
        <BottomActionBar>
          <View ref={cartAnimation.triggerRef} collapsable={false} style={{ flex: 1, height: designTokens.control.actionHeight }}>
            <BottomActionButton
              label={pendingCartAction === 'add' ? "Adding…" : addedToCart ? "Added" : unavailable ? "Unavailable" : "Add to cart"}
              icon={addedToCart ? "checkmark-circle" : undefined}
              disabled={unavailable || pendingCartAction !== null}
              busy={pendingCartAction === 'add'}
              onPress={() => void addToCart(false)}
              tone="secondary"
            />
          </View>
          <BottomActionButton
            label={unavailable ? "Check back soon" : "Buy now"}
            disabled={unavailable || pendingCartAction !== null}
            loading={pendingCartAction === 'buy'}
            onPress={() => void addToCart(true)}
            flex={1.2}
          />
        </BottomActionBar>
      )}
      {cartError ? (
        <View accessibilityLiveRegion="polite" className="absolute inset-x-4 rounded-2xl border border-[#E7C3BD] bg-[#FFF0ED] px-4 py-3" style={{ bottom: Math.max(insets.bottom, 8) + designTokens.control.actionHeight + 16 }}>
          <Text className="text-[13px] leading-5 text-[#7D2C20]">{cartError.message}</Text>
          <Pressable accessibilityRole="button" className="mt-1 min-h-11 justify-center" onPress={() => cartError.uncertain ? router.push('/(app)/cart' as never) : addToCart(cartError.buy)}>
            <Text className="text-[13px] font-bold text-[#7D2C20]">{cartError.uncertain ? 'Check cart' : 'Try again'}</Text>
          </Pressable>
        </View>
      ) : null}
      {cartAnimation.overlay}

      {negotiationOptionsVisible ? <NegotiationOptionsSheet
        visible product={product} quantity={quantity} initialVariantId={selectedVariant?.publicId}
        onClose={() => setNegotiationOptionsVisible(false)}
        onContinue={(variant) => {
          if (!variant.publicId) return;
          setSelectedColor(variantColor(variant)); setSelectedSize(variant.size);
          setNegotiationOptionsVisible(false);
          const destination = `/negotiations/new?productId=${encodeURIComponent(product.publicId)}&variantId=${encodeURIComponent(variant.publicId)}&quantity=${quantity}` as never;
          if (!isCustomerSession(session.data)) return openAuth(destination);
          router.push(destination);
        }}
      /> : null}
      <HookSheet
        visible={sizeGuideVisible}
        onClose={() => setSizeGuideVisible(false)}
        title="Size guide"
        maxHeight="80%"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {product.category?.sizingGuide?.summary ? (
            <Text className="text-[14px] leading-6 text-black">
              {product.category.sizingGuide.summary}
            </Text>
          ) : null}
          {product.category?.sizingGuide?.howToMeasure ? (
            <Text className="mt-3 text-[13px] leading-6 text-black/70">
              {product.category.sizingGuide.howToMeasure}
            </Text>
          ) : null}
          {product.category?.sizingGuide?.chart?.length ? (
            <View className="mt-4 overflow-hidden rounded-2xl bg-[#f4f4f5]">
              {product.category.sizingGuide.chart.map((row, index) => (
                <View
                  key={row.size}
                  className={`px-4 py-3 ${index ? "border-t border-black/5" : ""}`}
                >
                  <Text className="text-[13px] font-black text-black">
                    {row.size}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap gap-x-4 gap-y-1">
                    {Object.entries(row.measurements).map(([label, value]) => (
                      <Text key={label} className="text-[12px] text-black/60">
                        {label}: {value}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </HookSheet>
    </View>
  );
}
