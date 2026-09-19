import { ApiError, apiRequest } from '@/lib/api';

export type PaymentWaitResult = 'confirmed' | 'failed' | 'pending';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Waits for a payment to settle after the customer returns from the provider.
 *
 * One poller for every screen (checkout and order detail each had their own
 * fixed-interval loop, and a single dropped request aborted the checkout one
 * even though the order and payment already existed). It backs off, survives
 * transient network/5xx errors, and ends in a definite state or an honest
 * "still pending": never a claim of success it has not seen.
 */
export async function waitForPaymentConfirmation(
  orderId: string,
  options: { maxWaitMs?: number; firstDelayMs?: number } = {},
): Promise<PaymentWaitResult> {
  const deadline = Date.now() + (options.maxWaitMs ?? 45_000);
  let delay = options.firstDelayMs ?? 1_500;
  while (Date.now() < deadline) {
    try {
      const status = await apiRequest<any>(`/payments/${orderId}`);
      const state = String(status?.payment?.status || '').toUpperCase();
      if (state === 'CONFIRMED') return 'confirmed';
      if (state === 'FAILED' || state === 'REFUNDED') return 'failed';
    } catch (error) {
      // 4xx other than throttling means the request itself is wrong; keep going only for transient failures.
      const status = error instanceof ApiError ? error.status ?? 0 : 0;
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw error;
    }
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.5), 6_000);
  }
  return 'pending';
}
