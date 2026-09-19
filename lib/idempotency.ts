import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { isAmbiguousFailure } from '@/lib/api';
import { getSession } from '@/lib/session';

/**
 * Idempotency keys that survive a retry, a remount and an app restart.
 *
 * A key minted at tap time (`randomUUID()` inline) defeats the purpose: after
 * a timeout the user taps again, the app mints a NEW key, and the server sees
 * a second order. Here the key is minted once per logical action, stored, and
 * reused for as long as the action's inputs are unchanged. It is released only
 * when the action reaches a definitive outcome. This generalises the pattern
 * in negotiation-outbox.ts.
 */
const PREFIX = 'hook.idempotency.';
const MAX_AGE_MS = 20 * 60 * 60 * 1000; // server records live for 24h

type Stored = { fingerprint: string; key: string; createdAt: number };

async function storageKey(scope: string) {
  const session = await getSession();
  return session ? `${PREFIX}${session.user.id}.${scope}` : undefined;
}

/** Same scope + same fingerprint => same key. A changed fingerprint means a different action. */
export async function stableIdempotencyKey(scope: string, fingerprint: string): Promise<string> {
  const storage = await storageKey(scope);
  if (storage) {
    try {
      const raw = await AsyncStorage.getItem(storage);
      const saved = raw ? (JSON.parse(raw) as Stored) : undefined;
      if (saved && saved.fingerprint === fingerprint && Date.now() - saved.createdAt < MAX_AGE_MS) return saved.key;
    } catch { /* an unreadable entry just means we mint a new key */ }
  }
  const key = Crypto.randomUUID();
  if (storage) {
    await AsyncStorage.setItem(storage, JSON.stringify({ fingerprint, key, createdAt: Date.now() } satisfies Stored)).catch(() => undefined);
  }
  return key;
}

/** Call once the action has a definitive result (success, or a rejection the user must fix). */
export async function releaseIdempotencyKey(scope: string) {
  const storage = await storageKey(scope);
  if (storage) await AsyncStorage.removeItem(storage).catch(() => undefined);
}

/**
 * Runs a mutation under a stable key. The key is kept across an ambiguous
 * failure (timeout, dropped connection, 5xx) so the user's retry is recognised
 * as the same action; it is released on success or a definite rejection so the
 * next, genuinely new action gets a fresh key.
 */
export async function withStableIdempotency<T>(
  scope: string,
  fingerprint: string,
  run: (idempotencyKey: string) => Promise<T>,
): Promise<T> {
  const key = await stableIdempotencyKey(scope, fingerprint);
  try {
    const result = await run(key);
    await releaseIdempotencyKey(scope);
    return result;
  } catch (error) {
    if (!isAmbiguousFailure(error)) await releaseIdempotencyKey(scope);
    throw error;
  }
}
