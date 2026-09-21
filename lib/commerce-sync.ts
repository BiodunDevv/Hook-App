import * as Crypto from "expo-crypto";
import { useSyncExternalStore } from "react";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/shared/toast";
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

/** Call before the session is saved, so screens that appear on sign-in show "moving your cart" rather than an empty cart. */
export function beginCommerceSync() {
  setSyncing(true);
}

export function endCommerceSync() {
  setSyncing(false);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function syncAnonymousCommerce() {
  if (activeSync) return activeSync;
  setSyncing(true);
  activeSync = (async () => {
    const local = await getAnonymousCommerce();
    if (!local.cartItems.length && !local.likedProducts.length) return null;
    const body = JSON.stringify({
      schemaVersion: 1,
      cartItems: local.cartItems.map(({ clientLineId, productId, variantId, selectedVariants, quantity }) => ({ clientLineId, productId, variantId, selectedVariants, quantity })),
      likedProductIds: local.likedProducts.map((item) => item.productId),
    });
    // The same contents always get the same key, so a retry returns the earlier result instead of doubling quantities.
    const key = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, body)).slice(0, 48);
    let lastError: unknown;
    for (const wait of [0, 1200, 3000]) {
      if (wait) await sleep(wait);
      try {
        const result = await apiRequest<any>("/commerce/import", { method: "POST", headers: { "Idempotency-Key": key }, body });
        await clearImportedAnonymousCommerce(result.acceptedCartLineIds || [], result.acceptedLikedProductIds || []);
        const rejected = Array.isArray(result.rejected) ? result.rejected.length : 0;
        if (rejected) toast.info(`${rejected} item${rejected === 1 ? "" : "s"} could not be moved`, "They may have sold out or changed. The rest are in your cart.");
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    // Nothing is lost: the guest cart stays on this device and is retried at the next sign-in.
    toast.error("We couldn't move your cart yet", "It is still saved on this phone. We'll try again next time you sign in.");
    throw lastError;
  })().finally(() => { activeSync = null; setSyncing(false); });
  return activeSync;
}
