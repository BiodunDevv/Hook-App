import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardStickyView, useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookConfirmSheet } from "@/components/shared/HookConfirmSheet";
import { HookSheet } from "@/components/shared/HookSheet";
import { HookLoader } from "@/components/shared/HookLoader";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { toast } from "@/components/shared/toast";
import { ApiError } from "@/lib/api";
import {
  useAcceptNegotiationMutation,
  useActiveNegotiationQuery,
  useAddCartItemMutation,
  useCloseNegotiationMutation,
  useCounterNegotiationMutation,
  useNegotiationQuery,
  useProductQuery,
  useStartNegotiationMutation,
} from "@/lib/mobile-api";

function money(value?: number) {
  return `₦${Math.round(Number(value || 0) / 100).toLocaleString("en-NG")}`;
}

function messageTime(value?: string) {
  if (!value) return "Now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Countdown({ expiresAt, unlimited }: { expiresAt?: string; unlimited?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (unlimited || !expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, unlimited]);
  if (unlimited || !expiresAt) return <Text className="text-xs font-black text-[#755900]">Unlimited session</Text>;
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  return <Text className="text-xs font-black text-[#755900]">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")} remaining</Text>;
}

export default function NegotiationChatScreen() {
  const params = useLocalSearchParams<{ productId: string; variantId: string; quantity: string; resume?: string }>();
  const quantity = Math.max(1, Number(params.quantity || 1));
  const insets = useSafeAreaInsets();
  const active = useActiveNegotiationQuery(params.productId, params.variantId, quantity);
  const productQuery = useProductQuery(params.productId);
  const chatRef = useRef<ScrollView>(null);
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const [sessionId, setSessionId] = useState<string>();
  const session = useNegotiationQuery(sessionId);
  const start = useStartNegotiationMutation();
  const offer = useCounterNegotiationMutation();
  const accept = useAcceptNegotiationMutation();
  const close = useCloseNegotiationMutation();
  const addCart = useAddCartItemMutation();
  const [message, setMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string>();
  const [lastResponse, setLastResponse] = useState<any>();
  const [replacePrompt, setReplacePrompt] = useState(false);
  const [closePrompt, setClosePrompt] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (params.resume) setSessionId(params.resume);
  }, [params.resume]);

  useEffect(() => {
    const existing = active.data as any;
    if (existing?.negotiationId && !sessionId) {
      setSessionId(existing.negotiationId);
      setReplacePrompt(true);
    }
  }, [active.data, sessionId]);

  const data = (session.data as any) || (active.data as any) || lastResponse;
  const transcript = useMemo(() => data?.transcript || [], [data?.transcript]);
  const busy = start.isPending || offer.isPending || accept.isPending || addCart.isPending;

  useEffect(() => {
    if (!keyboardVisible) return;
    const timer = setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [keyboardVisible]);

  useEffect(() => {
    const timer = setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [transcript.length, lastResponse?.message, offer.isPending]);

  async function ensureSession() {
    if (sessionId) return sessionId;
    try {
      const created = await start.mutateAsync({ productId: params.productId, variantId: params.variantId, quantity }) as any;
      setSessionId(created.negotiationId);
      return created.negotiationId as string;
    } catch (error) {
      if (error instanceof ApiError && error.code === "ACTIVE_NEGOTIATION_EXISTS") {
        const existing = error.data as any;
        setSessionId(existing?.negotiationId);
        setReplacePrompt(true);
        return;
      }
      throw error;
    }
  }

  async function submitOffer() {
    const customerMessage = message.trim();
    if (!customerMessage) return toast.error("Type a message or Naira offer");
    setMessage("");
    setPendingMessage(customerMessage);
    try {
      const id = await ensureSession();
      if (!id) return;
      const response = await offer.mutateAsync({ negotiationId: id, message: customerMessage }) as any;
      setLastResponse({ ...response, negotiationId: id });
      await session.refetch();
    } catch (error) {
      setMessage((current) => current || customerMessage);
      toast.error(error instanceof Error ? error.message : "Hook could not process that offer");
    } finally {
      setPendingMessage(undefined);
    }
  }

  async function acceptCounter() {
    if (!sessionId) return;
    try {
      const response = await accept.mutateAsync(sessionId) as any;
      setLastResponse({ ...data, ...response });
      await session.refetch();
      toast.success("Your Hook price is ready");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not accept this price"); }
  }

  async function applyNegotiatedPrice() {
    const current = (session.data as any) || lastResponse || data;
    const quoteId = current?.quote?.id || current?.quoteId;
    if (!quoteId) return toast.error("The negotiated price is not ready yet");
    try {
      await addCart.mutateAsync({ productId: params.productId, variantId: params.variantId, quantity, quoteId });
      toast.success("Negotiated price added to cart");
      router.replace("/cart" as never);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not use this price"); }
  }

  async function replaceSession() {
    if (sessionId) await close.mutateAsync(sessionId);
    setSessionId(undefined);
    setLastResponse(undefined);
    setReplacePrompt(false);
    toast.info("Start a fresh negotiation", "Your previous session has been closed.");
  }

  async function closeSession() {
    if (!sessionId) return;
    try {
      await close.mutateAsync(sessionId);
      setClosePrompt(false);
      toast.success("Negotiation closed");
      router.back();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not close negotiation");
    }
  }

  if (active.isLoading) return <View className="flex-1 bg-[#F4F4F5]" style={{ paddingTop: insets.top }}><View className="px-4 py-3"><HookBackButton /></View><View className="flex-1 items-center justify-center"><HookLoader label="Preparing negotiation" /></View></View>;

  const catalogProduct = productQuery.data as any;
  const product = data?.product || (catalogProduct ? {
    id: catalogProduct.id || catalogProduct.publicId,
    title: catalogProduct.title,
    imageUrl: catalogProduct.media?.[0]?.url || catalogProduct.images?.[0],
    effectivePriceMinor: catalogProduct.effectivePriceMinor,
    currency: catalogProduct.currency,
    description: catalogProduct.description,
    market: catalogProduct.market,
  } : undefined);
  const agreed = data?.status === "agreed" || lastResponse?.status === "agreed";
  const activeStatus = !data?.status || data.status === "active";
  const counterPrice = lastResponse?.counterPriceMinor || data?.lastCounterPriceMinor;
  const standingPrice = Number(lastResponse?.agreedPriceMinor || data?.agreedPriceMinor || 0);
  const remainingOffers = Math.max(
    0,
    Number(data?.remainingOffers ?? Math.max(0, Number(data?.maximumOffers || 0) - Number(data?.offerCount || 0))),
  );

  return (
    <View className="flex-1 bg-[#F4F4F5]">
      <View className="border-b border-black/5 bg-white px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between">
          <HookBackButton />
          <Text className="text-lg font-black">Make an offer</Text>
          {activeStatus && sessionId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close negotiation"
              onPress={() => setClosePrompt(true)}
              className="h-11 items-center justify-center rounded-full px-3"
            >
              <Text className="text-sm font-black text-[#8A6500]">Close</Text>
            </Pressable>
          ) : <View className="size-11" />}
        </View>
        <Pressable
          accessibilityHint="Opens a preview of this product"
          accessibilityLabel={`Preview ${product?.title || "product"}`}
          accessibilityRole="button"
          className="mt-3 flex-row items-center rounded-2xl bg-[#F5F5F6] p-3 active:opacity-80"
          onPress={() => setPreviewOpen(true)}
        >
          <View className="size-14 overflow-hidden rounded-xl bg-white"><RemoteImage uri={product?.imageUrl} /></View>
          <View className="ml-3 min-w-0 flex-1"><Text className="font-black" numberOfLines={1}>{product?.title || "Negotiable product"}</Text><Text className="mt-1 text-sm text-[#666]">Hook price {money(product?.effectivePriceMinor)}</Text></View>
          <View className="items-end gap-2">
            {sessionId ? <View className="rounded-full bg-[#FFF3BF] px-3 py-2"><Countdown expiresAt={data?.expiresAt} unlimited={data?.sessionMode === "unlimited"} /></View> : null}
            <View className="flex-row items-center"><Text className="mr-1 text-[11px] font-bold text-[#777]">Preview</Text><Ionicons name="chevron-forward" size={15} color="#777" /></View>
          </View>
        </Pressable>
      </View>

      <View className="flex-1">
      <ScrollView
        ref={chatRef}
        className="flex-1"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        onLayout={() => chatRef.current?.scrollToEnd({ animated: false })}
        onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 8, paddingBottom: 24 }}
      >
        <View className="mb-2 self-center rounded-full bg-black/5 px-3 py-1.5"><Text className="text-[10px] font-bold text-[#777]">Messages about this negotiation</Text></View>
        <View className="self-start rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm"><Text className="max-w-[280px] text-sm leading-5 text-black">Ask me about this product or Hook, or tell me the price you have in mind.</Text><Text className="mt-1 text-right text-[9px] text-[#999]">Now</Text></View>
        {transcript.map((entry: any, index: number) => (
          <View key={`${entry.createdAt || index}-${entry.role}-${index}`} className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${entry.role === "customer" ? "self-end rounded-tr-sm bg-[#FFF0AE]" : "self-start rounded-tl-sm bg-white shadow-sm"}`}>
            <Text className="text-sm leading-5 text-black">{entry.message}</Text>
            {entry.offeredPriceMinor ? <Text className="mt-2 font-black">Offer: {money(entry.offeredPriceMinor)}</Text> : null}
            <Text className="mt-1 text-right text-[9px] text-[#888]">{messageTime(entry.createdAt)}</Text>
          </View>
        ))}
        {pendingMessage && !transcript.some((entry: any) => entry.role === "customer" && entry.message === pendingMessage) ? (
          <View className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-[#FFF0AE] px-4 py-2.5 opacity-80">
            <Text className="text-sm leading-5 text-black">{pendingMessage}</Text>
            <View className="mt-1 flex-row items-center justify-end gap-1">
              <Text className="text-[9px] text-[#888]">Sending</Text>
              <Ionicons name="checkmark" size={11} color="#888" />
            </View>
          </View>
        ) : null}
        {lastResponse?.message && !transcript.some((entry: any) => entry.message === lastResponse.message) ? <View className="self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm"><Text className="text-sm leading-5">{lastResponse.message}</Text>{counterPrice ? <Text className="mt-2 text-lg font-black">{money(counterPrice)}</Text> : null}<Text className="mt-1 text-right text-[9px] text-[#888]">Now</Text></View> : null}
        {(offer.isPending || start.isPending) ? <View className="self-start flex-row items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm"><ActivityIndicator size="small" color="#B38400" /><Text className="text-xs font-bold text-[#777]">Hook is replying</Text></View> : null}
        {standingPrice > 0 && activeStatus ? (
          <View className="self-center rounded-2xl border border-[#F0D56B] bg-[#FFF7D6] px-4 py-3">
            <Text className="text-center text-xs font-bold text-[#755900]">Best agreed price</Text>
            <Text className="mt-1 text-center text-xl font-black text-black">{money(standingPrice)}</Text>
            <Text className="mt-1 text-center text-[11px] text-[#755900]">Keep negotiating or use this price now.</Text>
          </View>
        ) : null}
        {data ? <Text className="text-center text-xs font-bold text-[#777]">{remainingOffers} price offer{remainingOffers === 1 ? "" : "s"} remaining</Text> : null}
      </ScrollView>

      <KeyboardStickyView
        offset={{ closed: 0, opened: 0 }}
        className="border-t border-black/5 bg-white px-4 pt-3"
        style={{ paddingBottom: keyboardVisible ? 6 : Math.max(insets.bottom, 10) }}
      >
        {agreed ? <Pressable onPress={() => void applyNegotiatedPrice()} disabled={busy} className="h-14 flex-row items-center justify-center rounded-2xl bg-hook"><Ionicons name="cart-outline" size={20} /><Text className="ml-2 font-black">Use this price {money(data?.quote?.agreedPriceMinor || data?.agreedPriceMinor || lastResponse?.agreedPriceMinor)}</Text></Pressable> : counterPrice && activeStatus && (!standingPrice || Number(counterPrice) < standingPrice) ? <Pressable onPress={() => void acceptCounter()} disabled={busy} className="mb-3 h-12 items-center justify-center rounded-2xl bg-black"><Text className="font-black text-white">Accept {money(counterPrice)}</Text></Pressable> : standingPrice && activeStatus ? <Pressable onPress={() => void acceptCounter()} disabled={busy} className="mb-3 h-12 items-center justify-center rounded-2xl bg-black"><Text className="font-black text-white">Use best price {money(standingPrice)}</Text></Pressable> : null}
        {activeStatus && !agreed ? (
          <View className="min-h-14 flex-row items-end rounded-[24px] bg-[#F3F3F4] p-1.5 pl-4">
            <TextInput
              value={message}
              onChangeText={setMessage}
              onFocus={() => setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 220)}
              placeholder="Message or offer, e.g. ₦25,000"
              multiline
              maxLength={500}
              returnKeyType="default"
              className="max-h-24 min-h-11 flex-1 py-3 text-sm text-black"
            />
            <Pressable
              accessibilityLabel="Send message"
              onPress={() => void submitOffer()}
              disabled={busy || !message.trim()}
              className="size-11 items-center justify-center rounded-full bg-hook disabled:opacity-40"
            >
              {busy ? <ActivityIndicator size="small" color="#111" /> : <Ionicons name="arrow-up" size={21} color="#111" />}
            </Pressable>
          </View>
        ) : null}
      </KeyboardStickyView>
      </View>

      <HookConfirmSheet visible={replacePrompt} title="Continue this negotiation?" message="You already have an active negotiation for this product option. Continue it, or close it and start fresh." confirmLabel="Start new" cancelLabel="Continue" busy={close.isPending} onClose={() => setReplacePrompt(false)} onConfirm={replaceSession} />
      <HookConfirmSheet visible={closePrompt} title="Close this negotiation?" message={standingPrice ? `Your standing price of ${money(standingPrice)} will not be saved if you close this negotiation.` : "This conversation will end and you can start a new negotiation later."} confirmLabel="Close negotiation" cancelLabel="Keep negotiating" busy={close.isPending} onClose={() => setClosePrompt(false)} onConfirm={closeSession} />
      <HookSheet
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Product preview"
        height="72%"
        maxHeight="72%"
        contentClassName="mt-2 flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
          <View className="aspect-square w-full overflow-hidden rounded-[24px] bg-[#F1F1F3]">
            <RemoteImage uri={product?.imageUrl} />
          </View>
          <View className="pt-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="min-w-0 flex-1">
                <Text className="text-[22px] font-black leading-7 text-black">{product?.title || "Hook product"}</Text>
                <Text className="mt-2 text-[20px] font-black text-[#B38400]">{money(product?.effectivePriceMinor)}</Text>
              </View>
              <View className="rounded-full bg-[#FFF3BF] px-3 py-2">
                <Text className="text-xs font-black">Qty {quantity}</Text>
              </View>
            </View>
            {product?.market?.name ? <Text className="mt-3 text-sm font-bold text-[#666]">From {product.market.name}</Text> : null}
            {product?.description ? <Text className="mt-4 text-sm leading-6 text-[#555]">{product.description}</Text> : null}
            <Pressable
              accessibilityRole="button"
              className="mt-6 h-14 flex-row items-center justify-center rounded-2xl bg-hook"
              onPress={() => {
                setPreviewOpen(false);
                router.push(`/products/${product?.id || params.productId}` as never);
              }}
            >
              <Text className="font-black text-black">View full product</Text>
              <Ionicons name="arrow-forward" size={18} color="#111" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </ScrollView>
      </HookSheet>
    </View>
  );
}
