import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import type { PublicCatalogProduct } from "@/lib/mobile-api";

const KEY = "hook.anonymous-commerce.v1";

export type AnonymousCartItem = {
  clientLineId: string;
  productId: string;
  variantId?: string;
  selectedVariants?: { color?: string; size?: string };
  quantity: number;
  productSnapshot: {
    title: string;
    imageUrl?: string;
    effectivePriceMinor: number;
    currency: string;
    sourceStateId?: string;
    marketId?: string;
  };
  updatedAt: string;
};

export type AnonymousCommerce = {
  schemaVersion: 1;
  revision: number;
  cartItems: AnonymousCartItem[];
  likedProducts: Array<{
    productId: string;
    title: string;
    imageUrl?: string;
    effectivePriceMinor: number;
    currency: string;
    updatedAt: string;
  }>;
};

const empty = (): AnonymousCommerce => ({ schemaVersion: 1, revision: 0, cartItems: [], likedProducts: [] });
const listeners = new Set<() => void>();

export async function getAnonymousCommerce() {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (!value) return empty();
    const parsed = JSON.parse(value) as AnonymousCommerce;
    return parsed.schemaVersion === 1 ? parsed : empty();
  } catch {
    return empty();
  }
}

async function update(mutator: (current: AnonymousCommerce) => AnonymousCommerce) {
  const next = mutator(await getAnonymousCommerce());
  next.revision += 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
  return next;
}

export function onAnonymousCommerceChanged(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function variantKey(item: { variantId?: string; selectedVariants?: { color?: string; size?: string } }) {
  return item.variantId || `${item.selectedVariants?.color || "-"}::${item.selectedVariants?.size || "-"}`.toLowerCase();
}

export function addAnonymousCartItem(input: {
  product: PublicCatalogProduct;
  variantId?: string;
  selectedVariants?: { color?: string; size?: string };
  quantity: number;
}) {
  return update((current) => {
    const key = variantKey(input);
    const existing = current.cartItems.find((item) => item.productId === input.product.publicId && variantKey(item) === key);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + input.quantity);
      existing.updatedAt = new Date().toISOString();
      return { ...current, cartItems: [...current.cartItems] };
    }
    return {
      ...current,
      cartItems: [...current.cartItems, {
        clientLineId: Crypto.randomUUID(),
        productId: input.product.publicId,
        variantId: input.variantId,
        selectedVariants: input.selectedVariants,
        quantity: Math.min(99, Math.max(1, input.quantity)),
        productSnapshot: {
          title: input.product.title,
          imageUrl: input.product.media?.[0]?.url,
          effectivePriceMinor: input.product.effectivePriceMinor,
          currency: input.product.currency,
          sourceStateId: input.product.sourceState?.publicId,
          marketId: input.product.market?.publicId,
        },
        updatedAt: new Date().toISOString(),
      }],
    };
  });
}

export function setAnonymousCartQuantity(clientLineId: string, quantity: number) {
  return update((current) => ({
    ...current,
    cartItems: current.cartItems.map((item) => item.clientLineId === clientLineId
      ? { ...item, quantity: Math.min(99, Math.max(1, quantity)), updatedAt: new Date().toISOString() }
      : item),
  }));
}

export function removeAnonymousCartItem(clientLineId: string) {
  return update((current) => ({ ...current, cartItems: current.cartItems.filter((item) => item.clientLineId !== clientLineId) }));
}

export function clearAnonymousCart() {
  return update((current) => ({ ...current, cartItems: [] }));
}

export function toggleAnonymousLike(product: PublicCatalogProduct) {
  return update((current) => {
    const liked = current.likedProducts.some((item) => item.productId === product.publicId);
    return {
      ...current,
      likedProducts: liked
        ? current.likedProducts.filter((item) => item.productId !== product.publicId)
        : [{
            productId: product.publicId,
            title: product.title,
            imageUrl: product.media?.[0]?.url,
            effectivePriceMinor: product.effectivePriceMinor,
            currency: product.currency,
            updatedAt: new Date().toISOString(),
          }, ...current.likedProducts],
    };
  });
}

export async function clearImportedAnonymousCommerce(cartLineIds: string[], likedProductIds: string[]) {
  const cartSet = new Set(cartLineIds);
  const likeSet = new Set(likedProductIds);
  return update((current) => ({
    ...current,
    cartItems: current.cartItems.filter((item) => !cartSet.has(item.clientLineId)),
    likedProducts: current.likedProducts.filter((item) => !likeSet.has(item.productId)),
  }));
}

export function anonymousCartResponse(value: AnonymousCommerce, products: PublicCatalogProduct[] = []) {
  const productMap = new Map(products.map((product) => [product.publicId, product]));
  const items = value.cartItems.map((item) => ({
    ...(() => {
      const product = productMap.get(item.productId);
      const checkoutEligible = product ? product.isPurchasable : false;
      return {
        checkoutEligible,
        blockingReasons: checkoutEligible ? [] : ["RUNNER_CONFIRMATION_REQUIRED"],
        product: product
          ? { ...product, id: product.publicId, imageUrl: product.media?.[0]?.url }
          : { id: item.productId, title: item.productSnapshot.title, imageUrl: item.productSnapshot.imageUrl },
      };
    })(),
    id: item.clientLineId,
    publicId: item.clientLineId,
    productId: item.productId,
    variantId: item.variantId,
    selectedVariants: item.selectedVariants || {},
    quantity: item.quantity,
    unitPriceMinor: item.productSnapshot.effectivePriceMinor,
    totalPriceMinor: item.productSnapshot.effectivePriceMinor * item.quantity,
    currency: item.productSnapshot.currency,
    stateId: item.productSnapshot.sourceStateId,
    marketId: item.productSnapshot.marketId,
  }));
  return {
    id: "local-cart",
    version: value.revision,
    items,
    subtotalMinor: items.reduce((sum, item) => sum + item.totalPriceMinor, 0),
    currency: "NGN",
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    sourceStateCount: new Set(items.map((item) => item.stateId).filter(Boolean)).size,
    local: true,
  };
}
