import * as Crypto from "expo-crypto";
import { useSyncExternalStore } from "react";

import { apiRequest } from "@/lib/api";
import { clearImportedAnonymousCommerce, getAnonymousCommerce } from "@/lib/anonymous-commerce";

let activeSync: Promise<unknown> | null = null;
const listeners = new Set<() => void>();

let syncingFlag = false;

function setSyncing(active: boolean) {
  if (syncingFlag === active) return;
  syncingFlag = active;
  listeners.forEach((listener) => listener());
}

/**
 * True while a guest cart and favourites are being merged into the account.
 * Screens that read the cart show their loading state instead of "empty" for
 * that moment, so a signed-in customer never sees a cart that is about to fill.
 */
export function useCommerceSyncing() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => syncingFlag,
    () => false,
  );
}

export function syncAnonymousCommerce() {
  if (activeSync) return activeSync;
  setSyncing(true);
  activeSync = (async () => {
    const local = await getAnonymousCommerce();
    if (!local.cartItems.length && !local.likedProducts.length) return null;
    const result = await apiRequest<any>("/commerce/import", {
      method: "POST",
      headers: { "Idempotency-Key": Crypto.randomUUID() },
      body: JSON.stringify({
        schemaVersion: 1,
        cartItems: local.cartItems.map(({ clientLineId, productId, variantId, selectedVariants, quantity }) => ({ clientLineId, productId, variantId, selectedVariants, quantity })),
        likedProductIds: local.likedProducts.map((item) => item.productId),
      }),
    });
    await clearImportedAnonymousCommerce(result.acceptedCartLineIds || [], result.acceptedLikedProductIds || []);
    return result;
  })().finally(() => { activeSync = null; setSyncing(false); });
  return activeSync;
}
