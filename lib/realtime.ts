import { AppState, AppStateStatus } from "react-native";
import { router } from "expo-router";
import { io, Socket } from "socket.io-client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL, refreshSession, ApiError } from "@/lib/api";
import {
  getSession,
  clearSession,
  onSessionChanged,
  type AuthSession,
} from "@/lib/session";

type RealtimePayload = {
  data?: unknown;
  type?: string;
  entityType?: string;
  entityId?: string;
  version?: number;
};

function socketBaseUrl() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
}

export class HookRealtimeClient {
  private socket?: Socket;
  private refreshAttempted = false;
  private authSignature = "";
  private listeners = new Set<(event: string, payload: RealtimePayload) => void>();

  async connect() {
    const session = await getSession();
    const auth = this.authFor(session);
    const nextSignature = JSON.stringify(auth);
    if (!this.socket) {
      this.socket = io(socketBaseUrl(), {
        autoConnect: false,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 10_000,
      });
      this.socket.onAny((event, payload) => {
        this.listeners.forEach((listener) => listener(event, payload || {}));
      });
      this.socket.on("connect_error", async (error) => {
        const revoked = /session is no longer active|account is not active/i.test(error?.message || "");
        if (revoked) {
          await clearSession();
          this.listeners.forEach((listener) => listener("session.revoked", { type: "session.revoked" }));
          this.socket?.disconnect();
          return;
        }
        if (this.refreshAttempted) return;
        this.refreshAttempted = true;
        const current = await getSession();
        if (current?.accessToken && current.refreshToken) {
          const refreshed = await refreshSession(current);
          if (refreshed) {
            this.socket!.auth = this.authFor(refreshed);
            this.socket!.connect();
          }
        }
      });
      this.socket.on("connect", () => {
        this.refreshAttempted = false;
        this.listeners.forEach((listener) => listener("realtime.connected", {}));
      });
      this.socket.on('disconnect', () => this.listeners.forEach((listener) => listener('realtime.disconnected', {})));
    }
    const credentialsChanged = this.authSignature !== nextSignature;
    this.authSignature = nextSignature;
    this.socket.auth = auth;
    // Socket.IO authenticates during the handshake. Updating `auth` alone
    // does not replace the identity of an already connected socket after a
    // refresh or logout, so force one clean handshake when credentials change.
    if (credentialsChanged && this.socket.connected) this.socket.disconnect();
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    this.socket?.disconnect();
  }
  get connected() { return Boolean(this.socket?.connected); }
  async request<T>(event: 'negotiation.subscribe' | 'negotiation.send', payload: unknown): Promise<T> {
    await this.connect();
    if (!this.socket?.connected) throw new ApiError('Chat is reconnecting. Please retry when connected.', 503, undefined, 'CHAT_DISCONNECTED');
    let result: { ok: boolean; data?: T; error?: { code?: string; message?: string } };
    try { result = await this.socket.timeout(50_000).emitWithAck(event, payload); }
    catch { throw new ApiError('Message confirmation was interrupted. Retry safely to check its result.', 503, undefined, 'CHAT_ACK_TIMEOUT'); }
    if (!result.ok) throw new ApiError(result.error?.message || 'Could not send message', 503, undefined, result.error?.code);
    return result.data as T;
  }
  unsubscribeNegotiation() { this.socket?.emit('negotiation.unsubscribe'); }

  on(listener: (event: string, payload: RealtimePayload) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private authFor(session: AuthSession | null) {
    return {
      ...(session?.accessToken ? { accessToken: session.accessToken } : {}),
    };
  }
}
export const hookRealtime = new HookRealtimeClient();

function invalidateForEvent(queryClient: ReturnType<typeof useQueryClient>, event: string) {
  if (event === "realtime.connected") {
    queryClient.invalidateQueries({ queryKey: ["mobile", "feed"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "discover"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "products"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "search"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "categories"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "public"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "notifications"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "orders"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "cart"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "likes"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "negotiations"] });
    return;
  }
  if (event === "home.updated" || event === "catalog.updated") {
    queryClient.invalidateQueries({ queryKey: ["mobile", "feed"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "discover"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "products"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "search"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "categories"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "public"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "likes"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "cart"] });
  }
  if (event === "cart.updated") queryClient.invalidateQueries({ queryKey: ["mobile", "cart"] });
  if (event === "negotiation.updated") queryClient.invalidateQueries({ queryKey: ["mobile", "negotiations"] });
  if (event === "notification.created" || event === "notification.updated") {
    queryClient.invalidateQueries({ queryKey: ["mobile", "notifications"] });
  }
  if (event === "order.updated") {
    queryClient.invalidateQueries({ queryKey: ["mobile", "orders"] });
    queryClient.invalidateQueries({ queryKey: ["mobile", "payments"] });
  }
}

export function MobileRealtimeBridge() {
  const queryClient = useQueryClient();
  const clientRef = useRef<HookRealtimeClient | null>(null);

  useEffect(() => {
    const client = clientRef.current || hookRealtime;
    clientRef.current = client;
    const stopEvents = client.on((event, payload) => {
      if (event === 'negotiation.messages' && payload.entityId && payload.data) {
        const next = payload.data as { version?: number };
        queryClient.setQueryData<{ version?: number }>(['mobile', 'negotiations', payload.entityId], (old) => (old?.version || 0) > (next.version || 0) ? old : next);
        queryClient.invalidateQueries({ queryKey: ['mobile', 'negotiations'] });
      }
      if (event === "session.revoked") {
        void (async () => {
          await clearSession();
          client.disconnect();
          queryClient.clear();
          router.replace("/(tabs)");
        })();
        return;
      }
      invalidateForEvent(queryClient, event);
    });
    const stopSession = onSessionChanged(() => void client.connect());
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") void client.connect();
      else client.disconnect();
    };
    const subscription = AppState.addEventListener("change", handleAppState);
    void client.connect();
    return () => {
      stopEvents();
      stopSession();
      subscription.remove();
      client.disconnect();
    };
  }, [queryClient]);

  return null;
}
