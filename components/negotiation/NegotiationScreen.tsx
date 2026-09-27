import { router, useLocalSearchParams } from "expo-router";
import { SkeletonListPage } from "@/components/motion/Skeleton";
import { centeredHeaderTextStyle } from "@/constants/design-tokens";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { HookRefreshControl } from "@/components/shared/HookRefreshControl";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hookRealtime } from '@/lib/realtime';
import { saveNegotiationRetry, clearNegotiationRetry, loadNegotiationRetry } from '@/lib/negotiation-outbox';
import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookLoader } from "@/components/shared/HookLoader";
import { HookSheet } from "@/components/shared/HookSheet";
import { HookConfirmSheet } from "@/components/shared/HookConfirmSheet";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { NegotiationOptionsSheet } from "./NegotiationOptionsSheet";
import { toast } from "@/components/shared/toast";
import { apiRequest, ApiError } from "@/lib/api";
import {
  mobileQueryKeys,
  useAcceptNegotiationMutation,
  useActiveNegotiationQuery,
  useAddCartItemMutation,
  useCloseNegotiationMutation,
  useCounterNegotiationMutation,
  useNegotiationQuery,
  useProductQuery,
  useStartNegotiationMutation,
} from "@/lib/mobile-api";
import {
  negotiationMessageKey,
  type NegotiationMessage,
  type NegotiationResponse,
} from "@/lib/negotiation-types";
import {
  NegotiationCartConfirmation,
  NegotiationComposer,
  NegotiationMessageBubble,
  NegotiationProductSummary,
  negotiationMoney,
} from "./NegotiationComponents";

function SessionStatus({ data }: { data?: NegotiationResponse | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const expiry = data?.quote?.expiresAt || data?.expiresAt;
  const seconds = expiry
    ? Math.max(0, Math.floor((new Date(expiry).getTime() - now) / 1000))
    : undefined;
  return (
    <Text className="mx-4 mb-2 text-center text-[11px] text-[#666]">
      {data?.status || "Ready to negotiate"}
      {seconds !== undefined
        ? ` · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} remaining`
        : ""}
      {data?.remainingOffers !== undefined
        ? ` · ${data.remainingOffers} offers left`
        : ""}
    </Text>
  );
}

export default function NegotiationScreen() {
  const params = useLocalSearchParams<{
    productId?: string;
    variantId?: string;
    quantity?: string;
    resume?: string;
  }>();
  const [quantity, setQuantity] = useState(
    Math.min(20, Math.max(1, Number(params.quantity) || 1)),
  );
  const [contextProductId, setContextProductId] = useState(params.productId);
  const [contextVariantId, setContextVariantId] = useState(params.variantId);
  const [sessionId, setSessionId] = useState(params.resume);
  const [lastResponse, setLastResponse] = useState<NegotiationResponse>();
  const active = useActiveNegotiationQuery(
    contextProductId,
    contextVariantId,
    quantity,
  );
  const session = useNegotiationQuery(sessionId);
  const { refreshing, onRefresh } = usePullRefresh(() => session.refetch());
  const data = session.data || lastResponse || active.data;
  const productQuery = useProductQuery(data?.product?.id || contextProductId);
  const start = useStartNegotiationMutation();
  const offer = useCounterNegotiationMutation();
  const accept = useAcceptNegotiationMutation();
  const close = useCloseNegotiationMutation();
  const addCart = useAddCartItemMutation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const list = useRef<FlatList<NegotiationMessage>>(null);
  const nearLatest = useRef(true);
  const sendLock = useRef(false);
  const request = useRef<{ id: string; message: string } | undefined>(
    undefined,
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const [unavailable, setUnavailable] = useState(false);
  const [connected, setConnected] = useState(hookRealtime.connected);
  const [processing, setProcessing] = useState(false);
  const [actionId, setActionId] = useState<string>();
  const [confirmation, setConfirmation] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [closePrompt, setClosePrompt] = useState(false);
  const [nextQuantity, setNextQuantity] = useState<number>();
  const [previewId, setPreviewId] = useState<string>();
  const preview = useProductQuery(previewId);
  const product = productQuery.data;
  const variantId = data?.variantId || contextVariantId || "";
  const actualQuantity = data?.quantity || quantity;
  const optionsRequired = !sessionId && !contextVariantId;
  useEffect(() => {
    if (product && optionsRequired) setOptionsVisible(true);
  }, [product, optionsRequired]);
  const option = product?.variants.find(
    (entry) => entry.publicId === variantId,
  );
  useEffect(() => {
    let active = true;
    const subscribe = () => {
      if (sessionId) void hookRealtime.request<NegotiationResponse>('negotiation.subscribe', { negotiationId: sessionId }).then((snapshot) => {
        if (active) {
          queryClient.setQueryData<NegotiationResponse>(mobileQueryKeys.negotiation(sessionId), (old) => (old?.version || 0) > (snapshot.version || 0) ? old : snapshot);
          setProcessing(Boolean(snapshot.processing));
        }
      }).catch(() => undefined);
    };
    const stop = hookRealtime.on((event, payload) => {
      if (event === 'realtime.connected') { setConnected(true); subscribe(); }
      if (event === 'realtime.disconnected') { setConnected(false); setProcessing(false); }
      if (payload.entityId === sessionId && event === 'negotiation.processing') setProcessing(Boolean((payload.data as { processing?: boolean })?.processing));
      if (payload.entityId === sessionId && event === 'negotiation.messages') setUnavailable(false);
    });
    subscribe();
    if (sessionId) void loadNegotiationRetry(sessionId).then((command) => {
      if (active && command && !sendLock.current) { request.current = command; setFailed(command.message); }
    });
    return () => { active = false; stop(); hookRealtime.unsubscribeNegotiation(); };
  }, [sessionId, queryClient]);
  const busy =
    offer.isPending || processing ||
    start.isPending ||
    accept.isPending ||
    confirmBusy ||
    addCart.isPending;
  const agreed = data?.status === "agreed";
  const open = !data || ["active", "agreed"].includes(data.status);
  const approvedPrice =
    data?.quote?.agreedPriceMinor ||
    data?.agreedPriceMinor ||
    data?.lastCounterPriceMinor ||
    lastResponse?.counterPriceMinor ||
    0;
  useEffect(() => {
    if (!sessionId && active.data?.negotiationId)
      setSessionId(active.data.negotiationId);
  }, [active.data, sessionId]);
  const messages = useMemo(() => {
    const rows: NegotiationMessage[] = [...(data?.transcript || [])];
    if (
      lastResponse?.entry &&
      !rows.some((row) => row.id === lastResponse.entry?.id)
    )
      rows.push(lastResponse.entry);
    else if (
      lastResponse?.message &&
      !rows.some((row) => row.message === lastResponse.message)
    )
      rows.push({
        id: "latest-response",
        role: "hook",
        message: lastResponse.message,
      });
    if (pending && !rows.some((row) => row.role === 'customer' && row.requestId === request.current?.id))
      rows.push({ id: "pending", role: "customer", message: pending });
    return rows;
  }, [data, lastResponse, pending]);
  useEffect(() => {
    if (keyboardVisible && nearLatest.current)
      list.current?.scrollToEnd({ animated: true });
  }, [keyboardVisible]);

  async function ensureSession() {
    if (sessionId) return sessionId;
    if (!contextProductId || !contextVariantId)
      throw new Error("Choose product colour and size before negotiating.");
    try {
      const result = await start.mutateAsync({
        productId: contextProductId,
        variantId: contextVariantId,
        quantity,
      });
      setSessionId(result.negotiationId);
      setLastResponse(result);
      return result.negotiationId;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "ACTIVE_NEGOTIATION_EXISTS"
      ) {
        const existing = error.data as NegotiationResponse;
        setSessionId(existing.negotiationId);
        return existing.negotiationId;
      }
      throw error;
    }
  }
  async function send(
    text = message.trim(),
    retry = false,
  ): Promise<NegotiationResponse | undefined> {
    if (!text || sendLock.current) return;
    if (optionsRequired) {
      setOptionsVisible(true);
      return;
    }
    sendLock.current = true;
    if (!retry || request.current?.message !== text)
      request.current = { id: Crypto.randomUUID(), message: text };
    setPending(text);
    setFailed(undefined);
    setMessage("");
    nearLatest.current = true;
    try {
      const id = await ensureSession();
      await saveNegotiationRetry(id, request.current!);
      const result = await offer.mutateAsync({
        negotiationId: id,
        message: text,
        requestId: request.current!.id,
      });
      setLastResponse(result);
      setUnavailable(false);
      if (result.entry?.actionId) {
        setActionId(result.entry.actionId);
        setConfirmation(true);
      }
      await queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.negotiation(id),
      });
      request.current = undefined;
      await clearNegotiationRetry(id).catch(() => undefined);
      return result;
    } catch (error) {
      setFailed(text);
      if (error instanceof ApiError && error.code === 'NEGOTIATION_UNAVAILABLE') setUnavailable(true);
      toast.error(
        error instanceof Error ? error.message : "Could not send message",
      );
    } finally {
      setPending(undefined);
      sendLock.current = false;
    }
  }
  async function lockPrice() {
    if (!sessionId) return;
    try {
      const result = await accept.mutateAsync(sessionId);
      setLastResponse({ ...data, ...result });
      await session.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not lock price",
      );
    }
  }
  async function prepareCart() {
    if (!data?.shoppingEnabled) {
      setActionId(undefined);
      setConfirmation(true);
      return;
    }
    const result = await send("Add this product to my cart");
    if (result && !result.entry) {
      setActionId(undefined);
      setConfirmation(true);
    }
  }
  async function confirmCart() {
    if (confirmBusy || !product || !variantId || !sessionId) return;
    setConfirmBusy(true);
    try {
      if (actionId)
        await apiRequest(
          `/negotiations/${sessionId}/actions/${actionId}/confirm`,
          {
            method: "POST",
            headers: { "Idempotency-Key": actionId },
            body: JSON.stringify({ quantity: actualQuantity, variantId }),
          },
        );
      else {
        const quoteId = data?.quote?.id;
        if (!quoteId)
          throw new Error("Refresh the conversation to retrieve your quote.");
        await addCart.mutateAsync({
          productId: product.publicId,
          variantId,
          quantity: actualQuantity,
          quoteId,
        });
      }
      setConfirmation(false);
      setActionId(undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.cart() }),
        session.refetch(),
      ]);
      toast.success("Confirmed product added to your cart");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add item",
      );
    } finally {
      setConfirmBusy(false);
    }
  }
  if (
    (active.isPending &&
      !params.resume &&
      params.productId &&
      params.variantId) ||
    (session.isPending && Boolean(sessionId))
  )
    return (
      <View className="flex-1 bg-[#F1F1F3]" style={{ paddingTop: insets.top + 68 }}>
        <SkeletonListPage rows={2} />
      </View>
    );
  return (
    <View className="flex-1 bg-[#F1F1F3]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <HookBackButton />
        <Text style={centeredHeaderTextStyle}>Negotiate</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!sessionId || !open}
          onPress={() => setClosePrompt(true)}
          className="h-11 justify-center px-2 disabled:opacity-30"
        >
          <Text className="text-xs font-bold">Close</Text>
        </Pressable>
      </View>
      <NegotiationProductSummary
        product={product}
        imageUrl={data?.product?.imageUrl}
        quantity={actualQuantity}
        onQuantity={setNextQuantity}
        onPreview={() => setPreviewId(product?.publicId)}
        status={data?.status}
        peopleNegotiating={data?.peopleNegotiating}
      />
      <SessionStatus data={data} />
      {unavailable ? <Text accessibilityRole="alert" className="px-4 py-2 text-center text-sm text-[#66666B]">Negotiation is currently unavailable. We’re working to bring it back for you. Your offers are saved; retry when ready.</Text> : !connected ? <Text accessibilityLiveRegion="polite" className="px-4 py-2 text-center text-xs text-[#66666B]">Chat is reconnecting… Your messages and offers are saved.</Text> : processing ? <Text accessibilityLiveRegion="polite" className="px-4 py-2 text-center text-xs text-[#66666B]">Hook is replying…</Text> : null}
      <FlatList
        ref={list}
        data={messages}
        refreshControl={<HookRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyExtractor={negotiationMessageKey}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        initialNumToRender={12}
        ListEmptyComponent={<Text className="py-6 text-center text-sm text-[#66666B]">Ask about this product, make an offer, or explore alternatives near your budget.</Text>}
        windowSize={7}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement, contentSize } =
            event.nativeEvent;
          nearLatest.current =
            contentSize.height - contentOffset.y - layoutMeasurement.height <
            100;
        }}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (nearLatest.current) list.current?.scrollToEnd({ animated: true });
        }}
        renderItem={({ item }) => (
          <NegotiationMessageBubble
            entry={item}
            onAction={(id) => {
              setActionId(id);
              setConfirmation(true);
            }}
            onSelect={setPreviewId}
          />
        )}
        ListFooterComponent={
          <View className="gap-3">
            {offer.isPending ? (
              <HookLoader size="inline" label="Hook is replying" />
            ) : null}
            {failed ? (
              <Pressable
                onPress={() => void send(failed, true)}
                className="rounded-xl bg-white p-3"
              >
                <Text className="text-sm font-bold">
                  Message not sent. Tap to retry.
                </Text>
                <Text className="mt-1 text-xs text-[#666]">{failed}</Text>
              </Pressable>
            ) : null}
            {session.isError ? (
              <Pressable onPress={() => void session.refetch()}>
                <Text className="text-center text-sm">
                  Could not refresh conversation. Tap to retry.
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
      <KeyboardStickyView
        offset={{ closed: 0, opened: 0 }}
        className="gap-2 border-t border-black/5 bg-[#F1F1F3] px-4 pt-2"
        style={{ paddingBottom: keyboardVisible ? 6 : Math.max(insets.bottom, 8) }}
      >
        {approvedPrice > 0 && open ? (
          <Pressable
            disabled={busy}
            onPress={() => (agreed ? void prepareCart() : void lockPrice())}
            className="h-11 items-center justify-center rounded-full bg-hook disabled:opacity-50"
          >
            <Text className="text-sm font-bold">
              {agreed
                ? "Review and add to cart"
                : `Lock approved price ${negotiationMoney(approvedPrice)}`}
            </Text>
          </Pressable>
        ) : null}
        {optionsRequired ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setOptionsVisible(true)}
            className="h-11 items-center justify-center rounded-full bg-hook"
          >
            <Text className="text-sm font-bold">Choose colour and size</Text>
          </Pressable>
        ) : open && (!agreed || data?.shoppingEnabled) ? (
          <NegotiationComposer
            value={message}
            onChange={setMessage}
            busy={busy}
            onSend={() => void send()}
          />
        ) : (
          <Text className="py-3 text-center text-xs text-[#666]">
            {agreed
              ? "Your price is locked. Review the item before adding it to your cart."
              : "This negotiation has ended. Return to the product to start another."}
          </Text>
        )}
      </KeyboardStickyView>
      {product && optionsVisible ? (
        <NegotiationOptionsSheet
          visible
          product={product}
          quantity={actualQuantity}
          onClose={() => setOptionsVisible(false)}
          onContinue={(variant) => {
            setContextProductId(product.publicId);
            setContextVariantId(variant.publicId);
            setOptionsVisible(false);
            if (failed) setMessage(failed);
            setFailed(undefined);
          }}
        />
      ) : null}
      <NegotiationCartConfirmation
        visible={confirmation}
        onClose={() => setConfirmation(false)}
        onConfirm={() => void confirmCart()}
        busy={confirmBusy}
        product={product}
        quantity={actualQuantity}
        option={option}
        price={data?.quote?.agreedPriceMinor || data?.agreedPriceMinor || 0}
        expiresAt={data?.quote?.expiresAt}
      />
      <HookConfirmSheet
        visible={nextQuantity !== undefined}
        title="Change negotiation quantity?"
        message={`Start or resume a separate negotiation for ${nextQuantity} item(s). Your existing quote stays attached to its original quantity.`}
        confirmLabel="Change quantity"
        onClose={() => setNextQuantity(undefined)}
        onConfirm={() => {
          if (nextQuantity) {
            setContextProductId(product?.publicId || contextProductId);
            setContextVariantId(variantId);
            setQuantity(nextQuantity);
            setSessionId(undefined);
            setLastResponse(undefined);
            setActionId(undefined);
          }
          setNextQuantity(undefined);
        }}
      />
      <HookConfirmSheet
        visible={closePrompt}
        title="Close this negotiation?"
        message="Unconfirmed cart actions will not be added."
        confirmLabel="Close negotiation"
        onClose={() => setClosePrompt(false)}
        busy={close.isPending}
        onConfirm={async () => {
          if (sessionId) {
            try {
              await close.mutateAsync(sessionId);
              router.back();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not close negotiation",
              );
            }
          }
        }}
      />
      <HookSheet
        visible={Boolean(previewId)}
        onClose={() => setPreviewId(undefined)}
        title="Product preview"
        height="75%"
        maxHeight="75%"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {preview.data ? (
            <View className="gap-4">
              <View className="aspect-square overflow-hidden rounded-2xl">
                <RemoteImage uri={preview.data.media[0]?.url} />
              </View>
              <Text className="text-xl font-bold">{preview.data.title}</Text>
              <Text className="text-lg font-black">
                {negotiationMoney(preview.data.effectivePriceMinor)}
              </Text>
              <Text className="text-sm leading-6 text-[#666]">
                {preview.data.description}
              </Text>
              <Text className="text-xs leading-5 text-[#666]">
                Choose colour and size on the product page. This product uses
                its own price and negotiation.
              </Text>
              <Pressable
                onPress={() => {
                  const id = previewId;
                  setPreviewId(undefined);
                  router.push(`/products/${id}` as never);
                }}
                className="h-11 items-center justify-center rounded-full bg-hook"
              >
                <Text className="text-sm font-bold">
                  Choose options and negotiate
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text className="py-10 text-center">
              {preview.isError ? "Product unavailable" : "Loading product…"}
            </Text>
          )}
        </ScrollView>
      </HookSheet>
    </View>
  );
}
