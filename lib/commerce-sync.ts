import * as Crypto from "expo-crypto";

import { apiRequest } from "@/lib/api";
import { clearImportedAnonymousCommerce, getAnonymousCommerce } from "@/lib/anonymous-commerce";

let activeSync: Promise<unknown> | null = null;

export function syncAnonymousCommerce() {
  if (activeSync) return activeSync;
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
  })().finally(() => { activeSync = null; });
  return activeSync;
}
