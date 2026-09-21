import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KEY = "hook.recent-searches.v1";
const MAX = 8;
let cache: string[] | null = null;
const listeners = new Set<(items: string[]) => void>();

async function load() {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function commit(next: string[]) {
  cache = next;
  listeners.forEach((listener) => listener(next));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // History is a convenience; never surface a storage failure.
  }
}

/** Remember a search the customer actually ran (submitted or opened a result from). */
export async function rememberSearch(term: string) {
  const value = term.trim();
  if (value.length < 2) return;
  const current = await load();
  await commit([value, ...current.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, MAX));
}

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void load().then((value) => alive && setItems(value));
    const listener = (value: string[]) => alive && setItems(value);
    listeners.add(listener);
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);
  const remove = useCallback(async (term: string) => commit((await load()).filter((item) => item !== term)), []);
  const clear = useCallback(() => commit([]), []);
  return { items, remove, clear };
}
