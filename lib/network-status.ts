import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/**
 * Connection health as the app actually experiences it. Every API call
 * reports its outcome here, and while offline a light probe checks the server
 * until it answers again, so the banner clears as soon as the network is back.
 * Two failed calls in a row mean offline; two very slow ones mean a weak signal.
 */
export type NetworkState = "online" | "slow" | "offline" | "restored";

const SLOW_MS = 6000;
const PROBE_MS = 4000;
const RESTORED_MS = 2600;

let state: NetworkState = "online";
let failures = 0;
let slowRuns = 0;
let probe: ReturnType<typeof setInterval> | null = null;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;
let healthUrl = "";
const listeners = new Set<() => void>();

function set(next: NetworkState) {
  if (next === state) return;
  state = next;
  onlineManager.setOnline(next !== "offline");
  listeners.forEach((listener) => listener());
}

async function ping() {
  if (!healthUrl) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(healthUrl, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (response.status < 500) recovered();
  } catch {
    // Still offline; the next probe tries again.
  } finally {
    clearTimeout(timer);
  }
}

function startProbe() {
  if (probe) return;
  probe = setInterval(() => void ping(), PROBE_MS);
}

function stopProbe() {
  if (probe) clearInterval(probe);
  probe = null;
}

function recovered() {
  const wasOffline = state === "offline";
  failures = 0;
  slowRuns = 0;
  stopProbe();
  if (wasOffline) {
    set("restored");
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => set("online"), RESTORED_MS);
  } else if (state === "slow") {
    set("online");
  }
}

/** Tell the monitor where the server's /health lives (the API origin). */
export function configureNetworkProbe(apiBaseUrl: string) {
  healthUrl = `${apiBaseUrl.replace(/\/api\/v\d+\/?$/, "")}/health`;
}

/** Called by the API layer after every request. */
export function reportRequest(outcome: "ok" | "failed", durationMs: number) {
  if (outcome === "failed") {
    failures += 1;
    if (failures >= 2 && state !== "offline") {
      if (restoreTimer) clearTimeout(restoreTimer);
      set("offline");
      startProbe();
    }
    return;
  }
  failures = 0;
  if (state === "offline") {
    recovered();
    return;
  }
  if (durationMs > SLOW_MS) {
    slowRuns += 1;
    if (slowRuns >= 2) set("slow");
  } else {
    slowRuns = 0;
    if (state === "slow") set("online");
  }
}

export function useNetworkState(): NetworkState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => "online" as NetworkState,
  );
}

/** Lets a "Retry" button check right now instead of waiting for the next probe. */
export function checkNetworkNow() {
  void ping();
}
