import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { PublicCatalogProduct } from "@/lib/mobile-api";

const KEY = "hook.recently-viewed.v1";
const MAX = 12;
const listeners = new Set<(items: PublicCatalogProduct[]) => void>();
let cache: PublicCatalogProduct[] | null = null;

async function load(): Promise<PublicCatalogProduct[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as PublicCatalogProduct[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

/** Remember a product the customer opened, most recent first. */
export async function rememberViewedProduct(product: PublicCatalogProduct) {
  const current = await load();
  cache = [product, ...current.filter((item) => item.publicId !== product.publicId)].slice(0, MAX);
  for (const listener of listeners) listener(cache);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Recently viewed is a convenience; failing to save it must never surface.
  }
}

/** Recently viewed products, optionally leaving one out (the product being viewed). */
export function useRecentlyViewed(excludeId?: string) {
  const [items, setItems] = useState<PublicCatalogProduct[]>([]);
  useEffect(() => {
    let alive = true;
    void load().then((value) => alive && setItems(value));
    const listener = (value: PublicCatalogProduct[]) => alive && setItems(value);
    listeners.add(listener);
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);
  const clear = useCallback(async () => {
    cache = [];
    setItems([]);
    await AsyncStorage.removeItem(KEY).catch(() => undefined);
  }, []);
  return { items: excludeId ? items.filter((item) => item.publicId !== excludeId) : items, clear };
}
