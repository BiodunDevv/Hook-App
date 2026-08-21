import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import * as Crypto from "expo-crypto";

import { apiRequest } from "@/lib/api";
import { getSession, isCustomerSession, onSessionChanged } from "@/lib/session";
import {
  addAnonymousCartItem,
  anonymousCartResponse,
  clearAnonymousCart,
  getAnonymousCommerce,
  onAnonymousCommerceChanged,
  removeAnonymousCartItem,
  setAnonymousCartQuantity,
  toggleAnonymousLike,
} from "@/lib/anonymous-commerce";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface PublicCatalogMedia {
  type: "image";
  url: string;
  width: number;
  height: number;
  alt: string;
}

export type SizingGuide = {
  summary?: string;
  howToMeasure?: string;
  presetGroups: ("clothing" | "shoes" | "general")[];
  chart?: { size: string; measurements: Record<string, string> }[];
};

export interface PublicCatalogProduct {
  publicId: string;
  title: string;
  slug: string;
  description?: string;
  media: PublicCatalogMedia[];
  sourceState: { publicId: string; name: string; code: string } | null;
  market: { publicId: string; name: string } | null;
  category: {
    publicId: string;
    name: string;
    slug: string;
    iconUrl?: string;
    sizingGuide?: SizingGuide | null;
  } | null;
  variants: {
    publicId: string;
    size?: string;
    colour?: string;
    attributes: Record<string, string>;
  }[];
  currency: string;
  sellingPriceMinor: number;
  effectivePriceMinor: number;
  discountMinor: number;
  negotiationAvailable: boolean;
  availabilityStatus: string;
  availabilityNote?: string;
  isPurchasable: boolean;
  publishedAt?: string;
}

export interface PublicCategory {
  publicId: string;
  name: string;
  slug: string;
  iconUrl?: string;
  description?: string;
  productCount?: number;
  isComingSoon?: boolean;
}

export interface PublicProductPage {
  data: PublicCatalogProduct[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PublicMarket {
  publicId: string;
  name: string;
  address?: string | null;
  imageUrl?: string | null;
  shortDisplayName?: string;
  discoveryColor?: string;
  isFeatured?: boolean;
  displayPriority?: number;
  coordinates?: { lat: number; lng: number } | null;
  operatingHours?: Record<string, unknown> | null;
  state?: { publicId?: string; name?: string; code?: string } | null;
  city?: { publicId?: string; name?: string; code?: string } | null;
  zone?: { publicId?: string; name?: string; code?: string } | null;
}

export interface PublicHomeFeed {
  featuredProducts: PublicCatalogProduct[];
  flashDeals?: PublicCatalogProduct[];
  categories: PublicCategory[];
  markets: PublicMarket[];
}

export interface PublicDiscoverFeed {
  categories: PublicCategory[];
  products: PublicCatalogProduct[];
  resultCount: number;
}

export interface HookOperatingState {
  publicId: string;
  name: string;
  capitalName?: string;
  code: string;
  deliveryEnabled?: boolean;
  deliveryPromiseHours?: number;
}

export interface PublicLocalGovernment {
  publicId: string;
  stateId: string;
  name: string;
}

export interface ProductLikesResponse {
  productIds: string[];
  items: {
    productId: string;
    createdAt: string;
    product?: PublicCatalogProduct | null;
  }[];
}

function toQueryString(params?: QueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

function post<TData, TVariables>(path: string, variables?: TVariables) {
  return apiRequest<TData>(path, {
    method: "POST",
    body: variables ? JSON.stringify(variables) : undefined,
  });
}

function patch<TData, TVariables>(path: string, variables?: TVariables) {
  return apiRequest<TData>(path, {
    method: "PATCH",
    body: variables ? JSON.stringify(variables) : undefined,
  });
}

function remove<TData>(path: string) {
  return apiRequest<TData>(path, { method: "DELETE" });
}

export const mobileQueryKeys = {
  feed: (params?: QueryParams) => ["mobile", "feed", params ?? {}] as const,
  discover: (params?: QueryParams) => ["mobile", "discover", params ?? {}] as const,
  search: (params?: QueryParams) => ["mobile", "search", params ?? {}] as const,
  searchSuggestions: (params?: QueryParams) => ["mobile", "search-suggestions", params ?? {}] as const,
  products: (params?: QueryParams) =>
    ["mobile", "products", params ?? {}] as const,
  product: (id: string) => ["mobile", "products", id] as const,
  categories: () => ["mobile", "categories"] as const,
  markets: (params?: QueryParams) =>
    ["mobile", "public", "markets", params ?? {}] as const,
  market: (id: string) => ["mobile", "public", "markets", id] as const,
  marketCategories: (id: string) =>
    ["mobile", "public", "markets", id, "categories"] as const,
  session: () => ["mobile", "auth", "session"] as const,
  likes: (userId?: string) => ["mobile", "likes", userId || "current"] as const,
  cart: () => ["mobile", "cart"] as const,
  orders: (params?: QueryParams) => ["mobile", "orders", params ?? {}] as const,
  order: (id: string) => ["mobile", "orders", id] as const,
  orderFulfilment: (id: string) =>
    ["mobile", "orders", id, "fulfilment"] as const,
  negotiations: (params?: QueryParams) =>
    ["mobile", "negotiations", params ?? {}] as const,
  negotiation: (id: string) => ["mobile", "negotiations", id] as const,
  activeNegotiation: (productId: string, variantId: string, quantity: number) =>
    ["mobile", "negotiations", "active", productId, variantId, quantity] as const,
  paymentStatus: (orderId: string) =>
    ["mobile", "payments", orderId, "status"] as const,
  addresses: () => ["mobile", "addresses"] as const,
  localGovernments: (stateId: string) => ["mobile", "local-governments", stateId] as const,
  commerceConfig: () => ["mobile", "commerce-config"] as const,
  notifications: () => ["mobile", "notifications"] as const,
  notification: (id: string) => ["mobile", "notifications", id] as const,
};

export function useHomeFeedQuery(params?: QueryParams) {
  return useQuery({
    queryKey: mobileQueryKeys.feed(params),
    queryFn: () =>
      apiRequest<PublicHomeFeed>(`/public/home${toQueryString(params)}`, {
        auth: false,
      }),
  });
}

export function useDiscoverQuery(params?: QueryParams, enabled = true) {
  return useQuery({
    enabled,
    queryKey: mobileQueryKeys.discover(params),
    queryFn: () =>
      apiRequest<PublicDiscoverFeed>(
        `/public/discover${toQueryString(params)}`,
        { auth: false },
      ),
    staleTime: 20_000,
    placeholderData: (previous) => previous,
  });
}

export function useSearchSuggestionsQuery(query?: string, params?: QueryParams) {
  const value = query?.trim() || "";
  const requestParams = { ...params, q: value };
  return useQuery({
    enabled: value.length > 0,
    queryKey: mobileQueryKeys.searchSuggestions(requestParams),
    queryFn: () =>
      apiRequest<string[]>(`/public/search/suggestions${toQueryString(requestParams)}`, {
        auth: false,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

export function useSearchQuery(params?: QueryParams) {
  return useQuery({
    enabled: Boolean(params?.q),
    queryKey: mobileQueryKeys.search(params),
    queryFn: () =>
      apiRequest<PublicProductPage>(`/public/search${toQueryString(params)}`, {
        auth: false,
      }),
    placeholderData: (previous) => previous,
  });
}

export function useProductsQuery(params?: QueryParams, enabled = true) {
  return useQuery({
    enabled,
    queryKey: mobileQueryKeys.products(params),
    queryFn: () =>
      apiRequest<PublicProductPage>(
        `/public/products${toQueryString(params)}`,
        { auth: false },
      ),
    placeholderData: (previous) => previous,
  });
}

export function useProductQuery(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: mobileQueryKeys.product(id || ""),
    queryFn: () =>
      apiRequest<PublicCatalogProduct>(`/public/products/${id}`, {
        auth: false,
      }),
  });
}

export function useOperatingStatesQuery() {
  return useQuery({
    queryKey: ["mobile", "operating-states"],
    queryFn: () => apiRequest<HookOperatingState[]>("/public/operating-states", { auth: false }),
  });
}

export function useDeliveryStatesQuery() {
  return useQuery({
    queryKey: ["mobile", "delivery-states"],
    queryFn: () => apiRequest<HookOperatingState[]>("/public/delivery-states", { auth: false }),
  });
}

export function useOperationCitiesQuery(stateId?: string) {
  return useQuery({
    enabled: Boolean(stateId),
    queryKey: ["mobile", "public", "cities", stateId],
    queryFn: () =>
      apiRequest(`/public/cities${toQueryString({ stateId })}`, {
        auth: false,
      }),
  });
}

export function useLocalGovernmentsQuery(stateId?: string) {
  return useQuery({
    enabled: Boolean(stateId),
    queryKey: mobileQueryKeys.localGovernments(stateId || ""),
    queryFn: () => apiRequest<{ state: HookOperatingState; data: PublicLocalGovernment[] }>(`/public/delivery-states/${stateId}/lgas`, { auth: false }),
    staleTime: 5 * 60_000,
  });
}

export function useServiceZonesQuery(stateId?: string, cityId?: string) {
  return useQuery({
    enabled: Boolean(stateId),
    queryKey: ["mobile", "public", "zones", stateId, cityId],
    queryFn: () =>
      apiRequest(`/public/zones${toQueryString({ stateId, cityId })}`, {
        auth: false,
      }),
  });
}

export function useMarketsQuery(params?: QueryParams) {
  return useQuery({
    queryKey: mobileQueryKeys.markets(params),
    queryFn: () =>
      apiRequest<PublicMarket[]>(`/public/markets${toQueryString(params)}`, {
        auth: false,
      }),
  });
}

export function useMarketQuery(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: mobileQueryKeys.market(id || ""),
    queryFn: () =>
      apiRequest<PublicMarket>(`/public/markets/${id}`, { auth: false }),
  });
}

export function useMarketCategoriesQuery(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: mobileQueryKeys.marketCategories(id || ""),
    queryFn: () =>
      apiRequest<PublicCategory[]>(`/public/markets/${id}/categories`, {
        auth: false,
      }),
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: mobileQueryKeys.categories(),
    queryFn: () =>
      apiRequest<PublicCategory[]>("/public/categories", { auth: false }),
  });
}

export function useCustomerSessionQuery() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const unsubscribe = onSessionChanged(() => {
      void queryClient.invalidateQueries({ queryKey: mobileQueryKeys.session() });
    });
    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: mobileQueryKeys.session(),
    queryFn: getSession,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useLikedProductsQuery() {
  const session = useCustomerSessionQuery();
  const likesKey = mobileQueryKeys.likes(session.data?.user.id || session.data?.user.publicId);
  return useQuery({
    queryKey: likesKey,
    queryFn: async () => {
      if (isCustomerSession(await getSession())) return apiRequest<ProductLikesResponse>("/likes");
      const local = await getAnonymousCommerce();
      const ids = local.likedProducts.map((item) => item.productId);
      const currentProducts = ids.length
        ? await apiRequest<PublicCatalogProduct[]>(`/public/products/status${toQueryString({ ids: ids.join(",") })}`, { auth: false }).catch(() => [])
        : [];
      const productMap = new Map(currentProducts.map((product) => [product.publicId, product]));
      return {
        productIds: local.likedProducts.map((item) => item.productId),
        items: local.likedProducts.map((item) => ({
          productId: item.productId,
          createdAt: item.updatedAt,
          product: productMap.get(item.productId) || {
            publicId: item.productId,
            title: item.title,
            slug: item.productId,
            media: item.imageUrl ? [{ type: "image" as const, url: item.imageUrl, width: 0, height: 0, alt: item.title }] : [],
            sourceState: null,
            market: null,
            category: null,
            variants: [],
            currency: item.currency,
            sellingPriceMinor: item.effectivePriceMinor,
            effectivePriceMinor: item.effectivePriceMinor,
            discountMinor: 0,
            negotiationAvailable: false,
            availabilityStatus: "local",
            isPurchasable: true,
          },
        })),
      };
    },
    retry: false,
    placeholderData: { productIds: [], items: [] },
  });
}

export function useToggleProductLikeMutation() {
  const session = useCustomerSessionQuery();
  const queryClient = useQueryClient();
  const likesKey = mobileQueryKeys.likes(session.data?.user.id || session.data?.user.publicId);
  return useMutation({
    mutationFn: ({
      productId,
      liked,
      product,
    }: {
      productId: string;
      liked: boolean;
      product?: PublicCatalogProduct;
    }) =>
      getSession().then((current) => {
        if (!isCustomerSession(current)) {
          if (!product) throw new Error("Product details are unavailable");
          return toggleAnonymousLike(product);
        }
        return liked
          ? remove(`/likes/${productId}`)
          : apiRequest(`/likes/${productId}`, { method: "PUT" });
      }),
    onMutate: async ({ productId, liked }) => {
      await queryClient.cancelQueries({ queryKey: likesKey });
      const previous = queryClient.getQueryData<ProductLikesResponse>(likesKey);
      const current = previous || { productIds: [], items: [] };
      const productIds = liked
        ? current.productIds.filter((id) => id !== productId)
        : current.productIds.includes(productId)
          ? current.productIds
          : [productId, ...current.productIds];
      queryClient.setQueryData(likesKey, {
        ...current,
        productIds,
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(likesKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: likesKey });
    },
  });
}

export function useCartQuery() {
  const queryClient = useQueryClient();
  useEffect(() => onAnonymousCommerceChanged(() => {
    void queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() });
  }), [queryClient]);
  return useQuery({
    queryKey: mobileQueryKeys.cart(),
    queryFn: async () => {
      if (isCustomerSession(await getSession())) return apiRequest("/cart");
      const local = await getAnonymousCommerce();
      const ids = [...new Set(local.cartItems.map((item) => item.productId))];
      const products = ids.length
        ? await apiRequest<PublicCatalogProduct[]>(`/public/products/status${toQueryString({ ids: ids.join(",") })}`, { auth: false }).catch(() => [])
        : [];
      return anonymousCartResponse(local, products);
    },
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function getCartItems(cart: any): any[] {
  if (Array.isArray(cart?.items)) return cart.items;
  return Array.isArray(cart?.stateGroups)
    ? cart.stateGroups.flatMap((group: any) => group.items || [])
    : [];
}

export function getCartGroupItems(cart: any, group: any): any[] {
  if (Array.isArray(group?.items)) return group.items;
  const lines = getCartItems(cart);
  const ids = new Set((group?.itemIds || []).map((id: unknown) => String(id)));
  if (ids.size) {
    return lines.filter((item) => ids.has(cartLineIdentifier(item)));
  }
  const stateId = String(group?.publicStateId || group?.stateId || group?.id || "");
  return lines.filter(
    (item) => String(item?.stateId || item?.publicStateId || "") === stateId,
  );
}

type AddCartItemInput = {
  productId: string;
  quantity: number;
  selectedVariants?: { color?: string; size?: string };
  variantId?: string;
  quoteId?: string;
  // Optional product used for instant cart feedback.
  optimisticProduct?: PublicCatalogProduct;
};

export function useAddCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddCartItemInput) => {
      const { optimisticProduct: _product, ...payload } = input;
      const current = await getSession();
      if (!isCustomerSession(current)) {
        if (!input.optimisticProduct) throw new Error("Product details are unavailable");
        const local = await addAnonymousCartItem({
          product: input.optimisticProduct,
          variantId: input.variantId,
          selectedVariants: input.selectedVariants,
          quantity: input.quantity,
        });
        return anonymousCartResponse(local);
      }
      return post("/cart/items", payload);
    },
    onMutate: async (input) => {
      const cartKey = mobileQueryKeys.cart();
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previous = queryClient.getQueryData(cartKey);

      queryClient.setQueryData(cartKey, (current: unknown) =>
        optimisticAddCartSnapshot(current, input),
      );

      return { previous };
    },
    onSuccess: (data) => {
      // Replace the optimistic snapshot when a full cart is returned.
      if (data && typeof data === "object" &&
          (Array.isArray((data as any).items) || Array.isArray((data as any).stateGroups))) {
        queryClient.setQueryData(mobileQueryKeys.cart(), data);
      } else {
        // Keep the optimistic result and reconcile it in the background.
        void queryClient.invalidateQueries({
          queryKey: mobileQueryKeys.cart(),
          refetchType: "none",
        });
      }
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(mobileQueryKeys.cart(), context.previous);
      }
      // Reconcile ambiguous network failures in the background.
      void queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() });
    },
  });
}

function cartLineIdentifier(item: any): string {
  const identifier = item?.id ?? item?.publicId ?? item?._id;
  return identifier == null ? "" : String(identifier);
}

function cartLineTotalMinor(item: any): number {
  const total = Number(item?.totalPriceMinor);
  if (Number.isFinite(total)) return total;

  const unitPrice = Number(item?.unitPriceMinor ?? item?.priceMinor ?? 0);
  return unitPrice * Number(item?.quantity ?? 0);
}

function normalizedVariantValue(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function matchesOptimisticLine(item: any, input: AddCartItemInput) {
  const productId = item?.productId || item?.product?.publicId || item?.product?.id;
  if (String(productId || "") !== String(input.productId)) return false;
  if (input.variantId && item?.variantId) {
    return String(item.variantId) === String(input.variantId);
  }

  const current = item?.selectedVariants || {};
  const selected = input.selectedVariants || {};
  return (
    normalizedVariantValue(current.color) === normalizedVariantValue(selected.color) &&
    normalizedVariantValue(current.size) === normalizedVariantValue(selected.size)
  );
}

function provisionalCartItem(input: AddCartItemInput) {
  const product = input.optimisticProduct;
  if (!product) return null;

  const selectedVariants = input.selectedVariants || {};
  const variantKey = input.variantId || [
    normalizedVariantValue(selectedVariants.color) || "-",
    normalizedVariantValue(selectedVariants.size) || "-",
  ].join("::");
  const unitPriceMinor = Number(product.effectivePriceMinor || 0);
  const optimisticId = `optimistic-${product.publicId}-${variantKey}`;
  const quantity = Math.max(Number(input.quantity) || 1, 1);
  const images = (product.media || []).map((asset) => asset.url).filter(Boolean);

  return {
    id: optimisticId,
    publicId: optimisticId,
    productId: product.publicId,
    quantity,
    unitPriceMinor,
    totalPriceMinor: unitPriceMinor * quantity,
    currency: product.currency || "NGN",
    selectedVariants,
    variantId: input.variantId,
    variantKey,
    productVersion: 1,
    stateId: product.sourceState?.publicId,
    marketId: product.market?.publicId,
    product: {
      ...product,
      id: product.publicId,
      images,
    },
    blockingReasons: [],
    checkoutEligible: true,
  };
}

function upsertOptimisticLine(items: any[], line: any, input: AddCartItemInput) {
  let matched = false;
  const next = items.map((item) => {
    if (!matchesOptimisticLine(item, input)) return item;
    matched = true;
    const quantity = Number(item.quantity || 0) + Number(line.quantity || 0);
    const unitPriceMinor = Number(item.unitPriceMinor ?? line.unitPriceMinor ?? 0);
    return {
      ...item,
      quantity,
      totalPriceMinor: unitPriceMinor * quantity,
    };
  });
  return { items: matched ? next : [...next, line], matched };
}

function optimisticAddCartSnapshot(current: any, input: AddCartItemInput) {
  const line = provisionalCartItem(input);
  if (!line) return current;

  const base = current && typeof current === "object"
    ? current
    : { items: [], stateGroups: [], currency: line.currency };
  const existingItems = getCartItems(base);
  const topLevel = upsertOptimisticLine(existingItems, line, input).items;
  const targetStateId = line.stateId || "unknown";
  let groupMatched = false;
  const groups = Array.isArray(base.stateGroups) ? base.stateGroups : [];
  const nextGroups = groups.map((group: any) => {
    if (
      String(group.publicStateId || group.stateId || group.publicId || "") !==
      String(targetStateId)
    ) {
      return group;
    }
    groupMatched = true;
    const result = upsertOptimisticLine(getCartGroupItems(base, group), line, input);
    return {
      ...group,
      items: result.items,
      subtotalMinor: result.items.reduce(
        (sum: number, item: any) => sum + cartLineTotalMinor(item),
        0,
      ),
    };
  });

  if (!groupMatched) {
    nextGroups.push({
      stateId: targetStateId,
      items: [line],
      subtotalMinor: cartLineTotalMinor(line),
      currency: line.currency,
      checkoutEligible: true,
      blockingReasons: [],
    });
  }

  const subtotalMinor = topLevel.reduce(
    (sum: number, item: any) => sum + cartLineTotalMinor(item),
    0,
  );
  return {
    ...base,
    items: topLevel,
    stateGroups: nextGroups,
    subtotalMinor,
    itemCount: topLevel.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0,
    ),
  };
}

function updateCartItems(items: unknown, itemId: string, quantity: number) {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => {
    if (cartLineIdentifier(item) !== itemId) return item;

    const currentQuantity = Math.max(Number(item.quantity) || 1, 1);
    const currentTotal = Number(item.totalPriceMinor);
    const unitPrice = Number(
      item.unitPriceMinor ??
        item.priceMinor ??
        (Number.isFinite(currentTotal) ? currentTotal / currentQuantity : 0),
    );
    const nextTotal = unitPrice * quantity;
    const nextItem = { ...item, quantity };

    if (Object.prototype.hasOwnProperty.call(item, "totalPriceMinor")) {
      nextItem.totalPriceMinor = nextTotal;
    }
    if (Object.prototype.hasOwnProperty.call(item, "lineTotalMinor")) {
      nextItem.lineTotalMinor = nextTotal;
    }

    return nextItem;
  });
}

function updateCartQuantitySnapshot(
  cart: any,
  itemId: string,
  quantity: number,
) {
  if (!cart || typeof cart !== "object") return cart;

  const hasTopLevelItems = Array.isArray(cart.items);
  const items = hasTopLevelItems
    ? updateCartItems(cart.items, itemId, quantity)
    : undefined;
  const stateGroups = Array.isArray(cart.stateGroups)
    ? cart.stateGroups.map((group: any) => {
        const groupItems = updateCartItems(
          getCartGroupItems(cart, group),
          itemId,
          quantity,
        );
        return {
          ...group,
          items: groupItems,
          ...(Object.prototype.hasOwnProperty.call(group, "subtotalMinor")
            ? {
                subtotalMinor: groupItems.reduce(
                  (sum: number, item: any) => sum + cartLineTotalMinor(item),
                  0,
                ),
              }
            : {}),
        };
      })
    : cart.stateGroups;
  const summaryItems = hasTopLevelItems
    ? items || []
    : (stateGroups || []).flatMap((group: any) => group.items || []);
  const nextCart = {
    ...cart,
    ...(hasTopLevelItems ? { items } : {}),
    ...(Array.isArray(cart.stateGroups) ? { stateGroups } : {}),
  };

  if (Object.prototype.hasOwnProperty.call(cart, "subtotalMinor")) {
    nextCart.subtotalMinor = summaryItems.reduce(
      (sum: number, item: any) => sum + cartLineTotalMinor(item),
      0,
    );
  }
  if (Object.prototype.hasOwnProperty.call(cart, "itemCount")) {
    nextCart.itemCount = summaryItems.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0,
    );
  }

  return nextCart;
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemId: string; quantity: number }) => {
      if (!isCustomerSession(await getSession())) {
        return anonymousCartResponse(await setAnonymousCartQuantity(input.itemId, input.quantity));
      }
      return patch(`/cart/items/${input.itemId}`, { quantity: input.quantity });
    },
    onMutate: async ({ itemId, quantity }) => {
      const cartKey = mobileQueryKeys.cart();
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previous = queryClient.getQueryData(cartKey);

      queryClient.setQueryData(cartKey, (current: any) =>
        updateCartQuantitySnapshot(current, itemId, quantity),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(mobileQueryKeys.cart(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.cart(),
        refetchType: "none",
      });
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => !isCustomerSession(await getSession())
      ? anonymousCartResponse(await removeAnonymousCartItem(itemId))
      : remove(`/cart/items/${itemId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() }),
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => !isCustomerSession(await getSession())
      ? anonymousCartResponse(await clearAnonymousCart())
      : remove("/cart"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() }),
  });
}

export function useClearCartStateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stateId: string) => remove(`/cart/states/${stateId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() }),
  });
}

export interface CustomerAddressInput {
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  stateId: string;
  cityId?: string;
  zoneId?: string;
  localGovernmentAreaId: string;
  postalCode?: string;
  formattedAddress?: string;
  stateCode: string;
  stateName: string;
  cityName: string;
  localGovernmentArea?: string;
  coordinates?: { latitude: number; longitude: number };
  isDefault?: boolean;
}
export function useAddressesQuery() {
  return useQuery({
    queryKey: mobileQueryKeys.addresses(),
    queryFn: () => apiRequest<any[]>("/addresses"),
  });
}
export function useCommerceConfigQuery() {
  return useQuery({
    queryKey: mobileQueryKeys.commerceConfig(),
    queryFn: () => apiRequest<any>("/commerce/config"),
  });
}
export function useCreateAddressMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerAddressInput) => post("/addresses", input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: mobileQueryKeys.addresses() }),
  });
}
export function useUpdateAddressMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<CustomerAddressInput> & { id: string }) =>
      patch(`/addresses/${id}`, input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: mobileQueryKeys.addresses() }),
  });
}
export function useDeleteAddressMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => remove(`/addresses/${id}`),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: mobileQueryKeys.addresses() }),
  });
}
export function useDefaultAddressMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post(`/addresses/${id}/default`),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: mobileQueryKeys.addresses() }),
  });
}

export function useCheckoutPreviewMutation() {
  return useMutation({
    mutationFn: (input: {
      addressId?: string;
      deliveryMethod: "HOME_DELIVERY" | "PARTNER_PICKUP";
      paymentMethod: "PREPAID" | "PAY_AT_HANDOVER";
      policyVersions: { TERMS: string; PRIVACY: string; RETURNS: string };
    }) =>
      post<any, typeof input>(
        "/checkout/preview",
        {
          addressId: input.addressId,
          deliveryMethod: input.deliveryMethod,
          paymentMethod: input.paymentMethod,
          policyVersions: input.policyVersions,
        },
      ),
  });
}

export function useCheckoutConfirmMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      previewToken: string;
      idempotencyKey: string;
    }) =>
      apiRequest<any>("/checkout/confirm", {
        method: "POST",
        headers: { "Idempotency-Key": input.idempotencyKey },
        body: JSON.stringify({ previewToken: input.previewToken }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() });
      queryClient.invalidateQueries({ queryKey: ["mobile", "orders"] });
    },
  });
}

export function useOrdersQuery(params?: QueryParams) {
  const session = useCustomerSessionQuery();
  return useQuery({
    enabled: isCustomerSession(session.data),
    queryKey: mobileQueryKeys.orders(params),
    queryFn: () => apiRequest(`/orders${toQueryString(params)}`),
  });
}

export function useOrderQuery(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: mobileQueryKeys.order(id || ""),
    queryFn: () => apiRequest(`/orders/${id}`),
  });
}

export function useOrderFulfilmentQuery(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: mobileQueryKeys.orderFulfilment(id || ""),
    queryFn: () =>
      apiRequest<{
        tasks: any[];
        packages: any[];
        shipment?: any;
        custody?: any;
        returns: any[];
        refunds: any[];
      }>(`/orders/${id}/fulfilment`),
  });
}

export function useCreateReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      orderId: string;
      orderItemIds: string[];
      reasonType: string;
      reason: string;
      evidenceAssetIds?: string[];
    }) =>
      post(`/orders/${input.orderId}/returns`, {
        orderItemIds: input.orderItemIds,
        reasonType: input.reasonType,
        reason: input.reason,
        evidenceAssetIds: input.evidenceAssetIds || [],
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.order(input.orderId),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.orderFulfilment(input.orderId),
      });
      queryClient.invalidateQueries({ queryKey: ["mobile", "orders"] });
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; reason?: string }) =>
      post(`/orders/${input.orderId}/cancel`, { reason: input.reason }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "orders"] });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.order(input.orderId),
      });
    },
  });
}

export function useNegotiationsQuery(params?: QueryParams) {
  return useQuery({
    queryKey: mobileQueryKeys.negotiations(params),
    queryFn: () => apiRequest(`/negotiations${toQueryString(params)}`),
  });
}

export function useNegotiationQuery(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: mobileQueryKeys.negotiation(id || ""),
    queryFn: () => apiRequest(`/negotiations/${id}`),
  });
}

export function useActiveNegotiationQuery(productId?: string, variantId?: string, quantity = 1) {
  return useQuery({
    enabled: Boolean(productId && variantId),
    queryKey: mobileQueryKeys.activeNegotiation(productId || "", variantId || "", quantity),
    queryFn: () => apiRequest(`/negotiations-active${toQueryString({ productId, variantId, quantity })}`),
  });
}

export function useStartNegotiationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      productId: string;
      variantId: string;
      quantity: number;
      message?: string;
    }) => post("/negotiations", input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["mobile", "negotiations"] }),
  });
}

export function useCounterNegotiationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      negotiationId: string;
      offeredPrice?: number;
      message: string;
    }) =>
      apiRequest(`/negotiations/${input.negotiationId}/offers`, {
        method: "POST",
        headers: { "Idempotency-Key": Crypto.randomUUID() },
        body: JSON.stringify({ ...(input.offeredPrice ? { offeredPriceMinor: input.offeredPrice } : {}), message: input.message }),
      }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "negotiations"] });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.negotiation(input.negotiationId),
      });
    },
  });
}

export function useAcceptNegotiationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (negotiationId: string) =>
      post(`/negotiations/${negotiationId}/accept`),
    onSuccess: (_data, negotiationId) => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "negotiations"] });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.negotiation(negotiationId),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() });
    },
  });
}

export function useCloseNegotiationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (negotiationId: string) => post(`/negotiations/${negotiationId}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mobile", "negotiations"] }),
  });
}

export function useInitializePaymentMutation() {
  return useMutation({
    mutationFn: (input: { orderId: string; fulfilmentGroupId?: string }) =>
      post<any, typeof input>("/payments/initialize", input),
  });
}

export function useCreatePaymentLinkMutation() {
  return useMutation({
    mutationFn: (input: { orderId: string; fulfilmentGroupId?: string }) =>
      post<{ id: string; url: string; token: string; expiresAt: string; status: string }, typeof input>("/payments/links", input),
  });
}

export function usePaymentStatusQuery(orderId?: string) {
  return useQuery({
    enabled: Boolean(orderId),
    queryKey: mobileQueryKeys.paymentStatus(orderId || ""),
    queryFn: () => apiRequest(`/payments/${orderId}`),
  });
}

export function useNotificationsQuery() {
  const session = useCustomerSessionQuery();
  return useQuery({
    enabled: isCustomerSession(session.data),
    queryKey: mobileQueryKeys.notifications(),
    queryFn: () => apiRequest("/notifications"),
  });
}

export function useNotificationQuery(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: mobileQueryKeys.notification(id || ""),
    queryFn: () => apiRequest(`/notifications/${id}`),
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      patch(`/notifications/${notificationId}/read`),
    onSuccess: (_data, notificationId) => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.notifications(),
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.notification(notificationId),
      });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => patch("/notifications/read-all"),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.notifications(),
      }),
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      remove(`/notifications/${notificationId}`),
    onSuccess: (_data, notificationId) => {
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.notifications(),
      });
      queryClient.removeQueries({
        queryKey: mobileQueryKeys.notification(notificationId),
      });
    },
  });
}

export function useClearNotificationsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => remove("/notifications/clear"),
    onSuccess: () => {
      queryClient.setQueryData(mobileQueryKeys.notifications(), {
        data: [],
        unread: 0,
        total: 0,
      });
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.notifications(),
      });
    },
  });
}
