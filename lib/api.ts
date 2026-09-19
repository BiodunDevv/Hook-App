import { clearSession, getSession, saveSession, type AuthSession } from '@/lib/session';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: unknown,
    public readonly code?: string,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

const errorFieldLabels: Record<string, string> = {
  line1: "Address",
  recipientName: "Recipient name",
  phone: "Phone number",
  stateId: "State",
  localGovernmentAreaId: "Local Government Area",
  cityName: "City",
  formattedAddress: "Address",
};

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message.trim()
      ? error.message
      : fallback;
  }

  const details = error.data as
    | { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
    | undefined;
  const firstFieldError = Object.entries(details?.fieldErrors || {})
    .find(([, messages]) => Array.isArray(messages) && messages.length > 0);
  if (firstFieldError) {
    const [field, messages] = firstFieldError;
    const message = messages[0];
    return `${errorFieldLabels[field] || field}: ${message}`;
  }

  const formError = details?.formErrors?.find(Boolean);
  return formError || error.message || fallback;
}

type ApiOptions = RequestInit & {
  auth?: boolean;
  /** Sent as the Idempotency-Key header. Reuse the same key when retrying the same action. */
  idempotencyKey?: string;
  /** Abort after this long. Defaults to 30s (mutations) / 20s (reads). */
  timeoutMs?: number;
};

const DEFAULT_MUTATION_TIMEOUT_MS = 30_000;
const DEFAULT_READ_TIMEOUT_MS = 20_000;

const SENSITIVE_KEYS = /^(accessToken|refreshToken|authorization|password|token|idToken|otp|code|signupSessionToken)$/i;

function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForLog);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redactForLog(entry),
    ]),
  );
}

function requestBodyForLog(body: BodyInit | null | undefined): unknown {
  if (!body) return undefined;
  if (typeof body !== 'string') return `[${body.constructor?.name ?? 'Request body'}]`;

  try {
    return redactForLog(JSON.parse(body));
  } catch {
    return body.length > 500 ? `${body.slice(0, 500)}...` : body;
  }
}

function logRequest(method: string, path: string, body: BodyInit | null | undefined) {
  if (!__DEV__) return;
  console.log(`\n[API REQUEST] ${method} ${path}`);
  const payload = requestBodyForLog(body);
  if (payload !== undefined) console.log('[PAYLOAD]', JSON.stringify(payload, null, 2));
}

function logResponse(method: string, path: string, status: number, payload: unknown) {
  if (!__DEV__) return;
  const requestId = (payload as any)?.meta?.requestId;
  console.log(`[API RESPONSE] ${method} ${path} | ${status}${requestId ? ` | ${requestId}` : ''}`);
}

function logNetworkError(method: string, path: string, error: unknown) {
  if (!__DEV__) return;
  console.log(`\n[API ERROR] ${method} ${path} | Server unreachable`);
  console.log('[ERROR]', error instanceof Error ? error.message : 'Unknown network error');
}

/**
 * True when a failed mutation may still have succeeded on the server
 * (timeout, dropped connection, 5xx, or a duplicate still being processed).
 * The right response is to check the resulting state or retry with the same
 * idempotency key, never to submit it again as a new action.
 */
export function isAmbiguousFailure(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  return error.status === 0 || (error.status ?? 0) >= 500 || error.code === 'OPERATION_IN_PROGRESS';
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const canReplayBody = options.body == null || typeof options.body === 'string';
  let refreshAttempted = false;

  while (true) {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);

    let session: AuthSession | null = null;
    if (options.auth !== false) {
      session = await getSession();
      if (!refreshAttempted && session?.accessExpiresAt && Date.parse(session.accessExpiresAt) <= Date.now()) {
        refreshAttempted = true;
        const outcome = await refreshSessionOnce(session);
        if (outcome.session) session = outcome.session;
        else if (outcome.authRejected) {
          await clearSession();
          throw new ApiError('Your session expired. Please sign in again.', 401);
        } else {
          throw new ApiError('Unable to renew your session. Please try again when connected.', 0);
        }
      }
      if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);
    }
    let response: Response;
    logRequest(method, path, options.body);
    // Without a timeout a hung connection left the UI spinning forever. A
    // timeout is AMBIGUOUS for a mutation: the server may have completed it,
    // so callers must check status or retry with the SAME idempotency key.
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? (method === 'GET' ? DEFAULT_READ_TIMEOUT_MS : DEFAULT_MUTATION_TIMEOUT_MS);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const callerSignal = options.signal;
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      logNetworkError(method, path, error);
      if (controller.signal.aborted && !callerSignal?.aborted) {
        throw new ApiError(
          method === 'GET'
            ? 'The request took too long. Please try again.'
            : 'This is taking longer than expected. We are checking whether it went through.',
          0,
          error,
          'REQUEST_TIMEOUT',
        );
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unable to reach Hook server',
        0,
        error,
      );
    } finally {
      clearTimeout(timer);
    }
    const payload = await response.json().catch(() => null);
    logResponse(method, path, response.status, payload);
    if (!response.ok || payload?.success === false) {
      const requestError = new ApiError(
        payload?.error?.message || 'Request failed',
        response.status,
        payload?.error?.details,
        payload?.error?.code,
        payload?.meta?.requestId,
      );

      // Refresh an expired access token once before failing the request.
      if (
        response.status === 401 &&
        options.auth !== false &&
        path !== '/auth/refresh' &&
        !refreshAttempted &&
        canReplayBody &&
        session?.refreshToken
      ) {
        refreshAttempted = true;
        const outcome = await refreshSessionOnce(session);
        if (outcome.session) continue;
        if (outcome.authRejected) await clearSession();
      }

      if (
        response.status === 403
        && options.auth !== false
        && payload?.error?.message === 'Customer account required'
      ) {
        await clearSession();
      }
      throw requestError;
    }
    return payload?.data as T;
  }
}

type RefreshOutcome = { session: AuthSession } | { session: null; authRejected: boolean };

/**
 * Only a genuine auth rejection (the refresh token itself was invalid,
 * expired, or revoked) should ever lead to logging the user out — a network
 * blip or a down server during this specific call must not clear a session
 * that is otherwise still good, or the user gets signed out just because a
 * request timed out. `authRejected` lets callers make that distinction.
 */
async function refreshSessionWithOutcome(session: AuthSession): Promise<RefreshOutcome> {
  if (!session.refreshToken) return { session: null, authRejected: true };
  try {
    const data = await apiRequest<AuthSession>('/auth/refresh', {
      auth: false,
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    await saveSession(data);
    return { session: data };
  } catch (error) {
    const authRejected = error instanceof ApiError && (error.status === 401 || error.status === 403);
    return { session: null, authRejected };
  }
}

export async function refreshSession(session: AuthSession) {
  const outcome = await refreshSessionOnce(session);
  if (!outcome.session && outcome.authRejected) await clearSession();
  return outcome.session;
}

/** Startup does not rotate a still-valid weekly token on every app launch. */
export async function resumeSession(session: AuthSession) {
  if (session.accessExpiresAt && Date.parse(session.accessExpiresAt) > Date.now()) return session;
  return refreshSession(session);
}

/**
 * Refresh tokens rotate on every use — the backend invalidates the old one
 * and revokes the whole session family if a stale refresh token is replayed.
 * When several requests 401 around the same moment (e.g. a screen's parallel
 * queries), each captures its own `session` before the 401 — if request A's
 * refresh has already completed and rotated the token by the time request
 * B's 401 handler runs, B's closure-captured session still holds the old,
 * now-consumed refresh token. Re-reading the session fresh right before
 * issuing a *new* refresh (as opposed to joining an in-flight one) ensures
 * every refresh call uses the current token instead of a stale one that
 * would trigger replay detection and force-logout the whole session.
 */
let refreshOutcomeInFlight: Promise<RefreshOutcome> | null = null;

function refreshSessionOnce(session: AuthSession) {
  if (!refreshOutcomeInFlight) {
    refreshOutcomeInFlight = (async () => {
      const current = (await getSession()) || session;
      if (current.refreshToken !== session.refreshToken) return { session: current };
      return refreshSessionWithOutcome(current);
    })().finally(() => {
      refreshOutcomeInFlight = null;
    });
  }
  return refreshOutcomeInFlight;
}

export { API_BASE_URL };
