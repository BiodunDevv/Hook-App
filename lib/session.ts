import * as SecureStore from "expo-secure-store";

export type HookUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string;
  role?: string;
  isEmailVerified?: boolean;
  publicId?: string;
  accountType?: "customer" | "staff" | "runner" | "partner";
  accountStatus?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: HookUser;
};

const NON_CUSTOMER_ROLES = new Set([
  "admin",
  "support",
  "super_admin",
  "operations_lead",
  "state_operations_manager",
  "commercial_manager",
  "commercial_officer",
  "catalog_reviewer",
  "dispatch_hub_manager",
  "dispatch_hub_officer",
  "logistics_officer",
  "customer_support_officer",
  "finance_officer",
  "management_viewer",
  "runner",
  "partner",
  "field_agent",
  "vendor",
  "ev_driver",
]);

/** Handles sessions created by older app builds that did not persist accountType. */
export function isCustomerSession(session: AuthSession | null | undefined) {
  if (!session?.accessToken) return false;
  if (session.user.accountType === "customer") return true;
  if (session.user.accountType === "staff" || session.user.accountType === "runner" || session.user.accountType === "partner") return false;
  const role = String(session.user.role || "").trim().toLowerCase();
  return !NON_CUSTOMER_ROLES.has(role);
}

export type PendingSignup = {
  email: string;
  signupSessionToken: string;
  step: "verify_email" | "complete_profile";
};

const KEYS = {
  session: "hook.auth.session",
  onboarding: "hook.onboarding.v1.complete",
  pendingSignup: "hook.signup.pending",
  deviceId: "hook.device.id",
  biometric: "hook.security.biometric",
};

type SessionListener = () => void;
const sessionListeners = new Set<SessionListener>();

function notifySessionChanged() {
  sessionListeners.forEach((listener) => listener());
}

export function onSessionChanged(listener: SessionListener) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

async function getJson<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson(key: string, value: unknown) {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export function getSession() {
  return getJson<AuthSession>(KEYS.session);
}

export async function saveSession(session: AuthSession) {
  await setJson(KEYS.session, session);
  notifySessionChanged();
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEYS.session);
  notifySessionChanged();
}

export async function getPendingSignup() {
  return getJson<PendingSignup>(KEYS.pendingSignup);
}

export async function savePendingSignup(pending: PendingSignup) {
  await setJson(KEYS.pendingSignup, pending);
}

export async function clearPendingSignup() {
  await SecureStore.deleteItemAsync(KEYS.pendingSignup);
}

export async function getOnboardingComplete() {
  return (await SecureStore.getItemAsync(KEYS.onboarding)) === "true";
}

export async function setOnboardingComplete(value = true) {
  await SecureStore.setItemAsync(KEYS.onboarding, value ? "true" : "false");
}

export async function getDeviceId() {
  const existing = await SecureStore.getItemAsync(KEYS.deviceId);
  if (existing) return existing;
  const value = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(KEYS.deviceId, value);
  return value;
}

export async function getBiometricEnabled() {
  return (await SecureStore.getItemAsync(KEYS.biometric)) === "true";
}

export async function setBiometricEnabled(value: boolean) {
  await SecureStore.setItemAsync(KEYS.biometric, String(value));
}
