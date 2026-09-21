import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/lib/haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  RefreshControl,
  FlatList,
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
import { ProductCardSkeleton } from "@/components/marketplace/ProductCardSkeleton";
import { RecentlyViewed } from "@/components/marketplace/RecentlyViewed";
import { rememberViewedProduct } from "@/lib/recently-viewed";
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
  useInfiniteProductsQuery,
  useToggleProductLikeMutation,
  type PublicCatalogProduct,
} from "@/lib/mobile-api";
import { autoSelection, availableValues, buildAxes, choose, findVariant, nextMissingAxis, valueOf, variantDetails, type Selection } from "@/lib/variant-axes";

export default function ProductDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const heroPager = useRef<ScrollView>(null);
  const optionPositions = useRef<Record<string, number>>({ details: 0 });
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
  const [selection, setSelection] = useState<Selection>({});
  const [addedToCart, setAddedToCart] = useState(false);
  const [pendingCartAction, setPendingCartAction] = useState<'add' | 'buy' | null>(null);
  const [cartError, setCartError] = useState<{ message: string; uncertain: boolean; buy: boolean; code?: string } | null>(null);
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
  // What the customer chooses comes from the product's category: size and
  // colour for shoes, capacity and colour for a powerbank, length and texture
  // for a wig. Axes with a single value choose themselves.
  const axes = useMemo(() => buildAxes(variants, product?.category?.attributes), [variants, product?.category?.attributes]);
  const activeSelection = useMemo(() => autoSelection(axes, selection), [axes, selection]);
  const missingAxis = nextMissingAxis(axes, activeSelection);
  const selectedVariant = axes.length
    ? (missingAxis ? undefined : findVariant(variants, activeSelection))
    : variants.length === 1 ? variants[0] : undefined;
  const negotiated = useActiveNegotiationQuery(
    isCustomerSession(session.data) ? product?.publicId : undefined,
    selectedVariant?.publicId,
    quantity,
  );
  const quote = negotiated.data?.quote;
  const negotiatedPriceMinor = Number(quote?.agreedPriceMinor || 0);
  const displayPriceMinor =
    negotiatedPriceMinor || Number(product?.effectivePriceMinor || 0);
  // Endless "more like this": the parent category (so sibling sub-categories
  // appear too), then a market-wide fallback. Items from the same
  // sub-category float first within what has loaded.
  const related = useInfiniteProductsQuery(
    { categoryId: product?.category?.parent?.publicId || product?.category?.publicId, limit: 12 },
    Boolean(product?.category?.publicId),
  );
  const relatedByMarket = useInfiniteProductsQuery(
    { marketId: product?.market?.publicId, limit: 12 },
    Boolean(product?.market?.publicId) && !product?.category?.publicId,
  );
  const feed = product?.category?.publicId ? related : relatedByMarket;
  const suggestions = useMemo(() => {
    const seen = new Set<string>([product?.publicId || ""]);
    const items: PublicCatalogProduct[] = [];
    for (const page of feed.data?.pages || []) {
      for (const item of page.data) {
        if (seen.has(item.publicId)) continue;
        seen.add(item.publicId);
        items.push(item);
      }
    }
    const leaf = product?.category?.publicId;
    return items.sort((x, y) => Number(y.category?.publicId === leaf) - Number(x.category?.publicId === leaf));
  }, [feed.data, product?.publicId, product?.category?.publicId]);
  useEffect(() => {
    if (product) void rememberViewedProduct(product);
  }, [product]);
  const loadMoreSuggestions = () => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  };
  const images = product?.media?.length ? product.media : [{ url: "" }];
  const heroHeight = Math.min(Math.max(width * 1.1, 380), 460);
  const isLiked = Boolean(
    product && likes.data?.productIds.includes(product.publicId),
  );

  useEffect(() => {
    setQuantity(1);
    setActiveImage(0);

    setSelection({});
  }, [product?.publicId]);

  useEffect(
    () => () => {
      if (addedFeedbackTimer.current) clearTimeout(addedFeedbackTimer.current);
    },
    [],
  );

  function pick(axisKey: string, value: string) {
    haptics.select();
    setSelection((current) => choose(variants, axes, current, axisKey, value));
  }

  /**
   * The buttons stay visible before the options are chosen. Tapping one says what is left to choose and brings that
   * option into view, instead of the buttons disappearing.
   */
  function promptForOptions() {
    haptics.select();
    const labels = axes.filter((axis) => !activeSelection[axis.key]).map((axis) => axis.label.toLowerCase());
    toast.info(
      missingAxis ? `Choose a ${missingAxis.label.toLowerCase()}` : "Choose your options",
      labels.length > 1 ? `Still to choose: ${labels.join(", ")}.` : "Pick an available option above to continue.",
    );
    const section = missingAxis?.key || axes[0]?.key || "details";
    scrollRef.current?.scrollTo({ y: Math.max(0, optionPositions.current.details + (optionPositions.current[section] || 0) - insets.top - 72), animated: !reducedMotion });
  }

  function addToCart(redirectToCart = false) {
    if (!product || !product.isPurchasable || add.isPending || addLock.current)
      return;
    if (variants.length > 0 && !selectedVariant) {
      toast.error(
        `Choose ${missingAxis ? `a ${missingAxis.label.toLowerCase()}` : "an option"} before adding to cart`,
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
      selectedVariants: selectedVariant ? variantDetails(selectedVariant) : {},
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
        setCartError({ uncertain, buy: redirectToCart, code: error instanceof ApiError ? error.code : undefined, message: uncertain
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
        variant="product"
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
          {query.isError ? "Couldn’t load this product" : "Product unavailable"}
        </Text>
        {query.isError ? (
          <Pressable onPress={() => void query.refetch()} className="mt-4 rounded-full bg-black px-6 py-3">
            <Text className="font-bold text-white">{query.isFetching ? "Trying…" : "Try again"}</Text>
          </Pressable>
        ) : null}
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
  const availableQuantity = product.availableQuantity;
  const outOfStock = availableQuantity === 0;
  // The most a customer can add: 20, or what is actually in stock when that is fewer.
  const maxQuantity = Math.max(1, Math.min(20, typeof availableQuantity === "number" ? availableQuantity : 20));
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
            ref={heroPager}
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

        {images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 14, justifyContent: "center", flexGrow: 1 }}
          >
            {images.slice(0, 8).map((image, index) => (
              <Pressable
                key={`${image.url || "thumb"}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Show image ${index + 1}`}
                accessibilityState={{ selected: index === activeImage }}
                onPress={() => {
                  setActiveImage(index);
                  heroPager.current?.scrollTo({ x: index * width, animated: true });
                }}
                className={`h-16 w-16 overflow-hidden rounded-2xl bg-white ${index === activeImage ? "border-2 border-[#FFC809]" : "border border-black/10"}`}
              >
                <RemoteImage uri={image.url} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : <View className="h-4" />}

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
                    "Hook is confirming availability. Keep it saved and check back soon."}
                </Text>
              </View>
            </View>
          ) : null}
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text
                numberOfLines={2}
                className="text-[26px] font-bold leading-8 text-black"
              >
                {product.title}
              </Text>
              <View className="mt-1.5 flex-row flex-wrap items-center gap-x-2">
                {product.category?.parent?.name ? (
                  <Text className="text-[12px] text-black/45">{product.category.parent.name} ›</Text>
                ) : null}
                {product.category?.name ? <Text className="text-[12px] text-black/45">{product.category.name}</Text> : null}
              </View>
              {product.market?.name ? (
                <Text className="mt-1 text-[13px] text-black/50">
                  By <Text className="font-semibold text-[#B98A00]">{product.market.name}</Text>
                </Text>
              ) : null}
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <Text className="text-[24px] font-black text-black">
                  ₦{(displayPriceMinor / 100).toLocaleString()}
                </Text>
                {negotiatedPriceMinor > 0 ? (
                  <Text className="text-[14px] text-black/40 line-through">
                    ₦{(product.effectivePriceMinor / 100).toLocaleString()}
                  </Text>
                ) : product.discountMinor > 0 ? (
                  <Text className="text-[14px] text-black/40 line-through">
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

            <View className="flex-row items-center gap-2.5 pt-2">
              <Pressable
                accessibilityLabel="Decrease quantity"
                disabled={quantity <= 1}
                onPress={() => { haptics.select(); setQuantity((value) => Math.max(1, value - 1)); }}
                className="h-9 w-9 items-center justify-center rounded-full border border-black/20 bg-white disabled:opacity-35"
              >
                <Ionicons name="remove" size={17} color="#111" />
              </Pressable>
              <Text className="w-5 text-center text-[15px] font-semibold text-black">{quantity}</Text>
              <Pressable
                accessibilityLabel="Increase quantity"
                disabled={quantity >= maxQuantity}
                onPress={() => { haptics.select(); setQuantity((value) => Math.min(maxQuantity, value + 1)); }}
                className="h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFC809] bg-[#FFF8DB] disabled:opacity-35"
              >
                <Ionicons name="add" size={17} color="#111" />
              </Pressable>
            </View>
          </View>

          {product.negotiationAvailable && !unavailable ? (
            <NegotiationPrompt
              onPress={() => { setNegotiationOptionsVisible(true); void query.refetch(); }}
            />
          ) : null}

          <ProductInformation key={product.publicId} name={product.title} description={product.description} />

          {axes.map((axis) => {
            const chosen = activeSelection[axis.key] || "";
            const available = availableValues(variants, activeSelection, axis.key);
            return (
              <View key={axis.key} onLayout={(event) => { optionPositions.current[axis.key] = event.nativeEvent.layout.y; }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px] font-bold text-black">
                    {axis.label}
                    {!chosen ? <Text className="text-[#C53B35]"> *</Text> : null}
                  </Text>
                  {axis.type === "size" && product.category?.sizingGuide?.summary ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Open size guide"
                      onPress={() => setSizeGuideVisible(true)}
                      className="flex-row items-center gap-1"
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#555" />
                      <Text className="text-xs font-semibold text-black/60">Size guide</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {axis.values.map((value) => {
                    const selected = chosen.toLowerCase() === value.toLowerCase();
                    const enabled = available.has(value.toLowerCase());
                    if (axis.type === "colour") {
                      const displayColor = resolveColor(value);
                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${displayColor.name} colour`}
                          accessibilityState={{ selected, disabled: !enabled }}
                          disabled={!enabled}
                          onPress={() => pick(axis.key, value)}
                          className={`flex-row items-center rounded-full border px-2.5 py-1.5 ${selected ? "border-[#FFC809] bg-[#FFF8DB]" : "border-black/15 bg-white"} ${enabled ? "" : "opacity-40"}`}
                        >
                          <View className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: displayColor.hex }} />
                          <Text className="ml-1.5 text-[13px] text-black">{displayColor.name}</Text>
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${axis.label.toLowerCase()} ${value}`}
                        accessibilityState={{ selected, disabled: !enabled }}
                        disabled={!enabled}
                        onPress={() => pick(axis.key, value)}
                        className={`min-w-11 items-center rounded-lg border px-3.5 py-2.5 ${selected ? "border-[#FFC809] bg-[#FFF8DB]" : enabled ? "border-black/15 bg-white" : "border-black/5 bg-black/[0.03] opacity-40"}`}
                      >
                        <Text className={`text-[14px] ${selected ? "font-bold text-black" : "font-medium text-black/70"}`}>{value}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <Text className="text-xs text-black/55">
            {unavailable
              ? "Purchase actions will return once Hook confirms availability."
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
            <FlatList
              horizontal
              data={suggestions}
              keyExtractor={(item) => item.publicId}
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              onEndReached={loadMoreSuggestions}
              onEndReachedThreshold={0.6}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 12, paddingTop: 12 }}
              renderItem={({ item }) => (
                <View style={{ width: 150 }}>
                  <CatalogProductCard product={item} variant="figma" />
                </View>
              )}
              ListFooterComponent={feed.isFetchingNextPage ? <View style={{ width: 150 }}><ProductCardSkeleton /></View> : null}
            />
          </View>
        ) : null}
        <RecentlyViewed excludeId={product?.publicId} />
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

      {(
        <BottomActionBar>
          <View ref={cartAnimation.triggerRef} collapsable={false} style={{ flex: 1, height: designTokens.control.actionHeight }}>
            <BottomActionButton
              label={pendingCartAction === 'add' ? "Adding…" : addedToCart ? "Added" : unavailable ? "Unavailable" : "Add to cart"}
              icon={addedToCart ? "checkmark-circle" : undefined}
              disabled={unavailable || pendingCartAction !== null}
              busy={pendingCartAction === 'add'}
              onPress={() => (variantRequired ? promptForOptions() : void addToCart(false))}
              tone="secondary"
            />
          </View>
          <BottomActionButton
            label={unavailable ? "Check back soon" : "Buy now"}
            disabled={unavailable || pendingCartAction !== null}
            loading={pendingCartAction === 'buy'}
            onPress={() => (variantRequired ? promptForOptions() : void addToCart(true))}
            flex={1.2}
          />
        </BottomActionBar>
      )}
      {cartError ? (
        <View accessibilityLiveRegion="polite" className="absolute inset-x-4 rounded-2xl border border-[#E7C3BD] bg-[#FFF0ED] px-4 py-3" style={{ bottom: Math.max(insets.bottom, 8) + designTokens.control.actionHeight + 16 }}>
          <Text className="text-[13px] leading-5 text-[#7D2C20]">{cartError.message}</Text>
          <Pressable
            accessibilityRole="button"
            className="mt-1 min-h-11 justify-center"
            onPress={() => {
              if (cartError.uncertain) return router.push('/(app)/cart' as never);
              // An expired agreed price will keep failing if we resend it: reload the negotiation, then let them add again.
              if (cartError.code === 'NEGOTIATION_QUOTE_EXPIRED') {
                setCartError(null);
                void negotiated.refetch();
                return toast.info('Your negotiated price expired', 'The current price is shown. Add to cart again, or negotiate a new price.');
              }
              addToCart(cartError.buy);
            }}
          >
            <Text className="text-[13px] font-bold text-[#7D2C20]">{cartError.uncertain ? 'Check cart' : cartError.code === 'NEGOTIATION_QUOTE_EXPIRED' ? 'Refresh price' : 'Try again'}</Text>
          </Pressable>
        </View>
      ) : null}
      {cartAnimation.overlay}

      {negotiationOptionsVisible ? <NegotiationOptionsSheet
        visible product={product} quantity={quantity} initialVariantId={selectedVariant?.publicId}
        onClose={() => setNegotiationOptionsVisible(false)}
        onContinue={(variant) => {
          if (!variant.publicId) return toast.info('Choose an option first', 'Pick the exact option you want to negotiate on.');
          setSelection(Object.fromEntries(axes.map((axis) => [axis.key, valueOf(variant, axis.key)]).filter(([, value]) => value)) as Selection);
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
