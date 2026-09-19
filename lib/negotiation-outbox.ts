import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSession } from './session';
export interface RetryCommand { id: string; message: string }
async function key(id: string) {
  const session = await getSession();
  return session ? `hook.negotiation.retry.${session.user.id}.${id}` : undefined;
}
export async function saveNegotiationRetry(id: string, command: RetryCommand) {
  const storageKey = await key(id);
  if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify(command));
}
export async function clearNegotiationRetry(id: string) {
  const storageKey = await key(id);
  if (storageKey) await AsyncStorage.removeItem(storageKey);
}
export async function loadNegotiationRetry(id: string): Promise<RetryCommand | undefined> {
  const storageKey = await key(id);
  if (!storageKey) return;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    const value: unknown = raw ? JSON.parse(raw) : undefined;
    if (value && typeof value === 'object' && 'id' in value && 'message' in value && typeof value.id === 'string' && typeof value.message === 'string') return { id: value.id, message: value.message };
  } catch { /* Invalid local draft does not affect the authoritative transcript. */ }
}
