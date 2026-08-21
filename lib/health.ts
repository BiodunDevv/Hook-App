import { API_BASE_URL } from '@/lib/api';

const HEALTH_URL = `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`;

export async function checkHookHealth(timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(HEALTH_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null);
    return payload?.success === true && payload?.data?.status === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
