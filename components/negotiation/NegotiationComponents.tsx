import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";
import { CatalogProductCard } from "@/components/marketplace/CatalogProductCard";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { HookSheet } from "@/components/shared/HookSheet";
import { useProductQuery, type PublicCatalogProduct } from "@/lib/mobile-api";
import type { NegotiationMessage } from "@/lib/negotiation-types";

export const negotiationMoney = (minor = 0) =>
  `₦${(minor / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export function NegotiationProductSummary({
  product,
  quantity,
  onQuantity,
  onPreview,
  status,
  peopleNegotiating,
  imageUrl,
}: {
  product?: PublicCatalogProduct;
  quantity: number;
  onQuantity: (value: number) => void;
  onPreview: () => void;
  status?: string;
  peopleNegotiating?: number;
  imageUrl?: string;
}) {
  return (
    <View className="mx-4 mb-3 rounded-[20px] bg-white p-2.5">
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-1">
          <Ionicons name="location" size={14} color="#111" />
          <Text
            numberOfLines={1}
            className="text-[11px] font-bold uppercase text-black"
          >
            {product?.market?.name || "Hook Market"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/checkout")}
          className="h-9 justify-center rounded-full bg-hook px-3"
        >
          <Text className="text-[11px] font-bold">Proceed to checkout</Text>
        </Pressable>
      </View>
      <View className="flex-row items-center gap-3 rounded-2xl bg-[#F1F1F3] p-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Preview product"
          onPress={onPreview}
          className="overflow-hidden rounded-xl bg-white"
          style={{ width: 64, height: 64, flexShrink: 0 }}
        >
          <RemoteImage uri={product?.media.find((item) => item.type === 'image' && item.url)?.url || imageUrl} contentFit="cover" />
        </Pressable>
        <View className="min-w-0 flex-1 gap-2">
          <Text numberOfLines={2} className="text-sm font-bold">
            {product?.title || "Loading product"}
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Decrease quantity"
              disabled={quantity <= 1}
              onPress={() => onQuantity(quantity - 1)}
              className="size-7 items-center justify-center rounded-full bg-black disabled:opacity-40"
            >
              <Ionicons name="remove" size={16} color="white" />
            </Pressable>
            <Text className="text-sm">{quantity}</Text>
            <Pressable
              accessibilityLabel="Increase quantity"
              disabled={quantity >= 20}
              onPress={() => onQuantity(quantity + 1)}
              className="size-7 items-center justify-center rounded-full bg-black disabled:opacity-40"
            >
              <Ionicons name="add" size={16} color="white" />
            </Pressable>
          </View>
        </View>
        <View className="items-end gap-1">
          <Text className="text-[10px] text-[#666]">{status || "Ready"}</Text>
          {peopleNegotiating ? (
            <Text className="text-[10px] text-[#287B35]">
              {peopleNegotiating} negotiating
            </Text>
          ) : null}
          <Text className="text-sm font-black">
            {negotiationMoney((product?.effectivePriceMinor || 0) * quantity)}
          </Text>
          <Text className="text-[10px] text-[#666]">
            {negotiationMoney(product?.effectivePriceMinor)} each
          </Text>
        </View>
      </View>
    </View>
  );
}

function SuggestedProduct({
  id,
  selected,
  onSelect,
}: {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const query = useProductQuery(id);
  if (!query.data)
    return (
      <View className="h-48 flex-1 items-center justify-center rounded-xl bg-white">
        <Text className="text-xs text-[#666]">
          {query.isError ? "Product unavailable" : "Loading product…"}
        </Text>
      </View>
    );
  return (
    <View className="w-[48%] gap-2">
      <View
        className={
          selected
            ? "rounded-xl border-2 border-hook p-1"
            : "rounded-xl border-2 border-transparent p-1"
        }
      >
        <CatalogProductCard product={query.data} compact variant="figma" />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect(id)}
        className="h-9 items-center justify-center rounded-full bg-white"
      >
        <Text className="text-xs font-bold">Review this product</Text>
      </Pressable>
    </View>
  );
}

export function NegotiationMessageBubble({
  entry,
  onAction,
  onSelect,
}: {
  entry: NegotiationMessage;
  onAction: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState<string>();
  return (
    <Animated.View
      entering={FadeInDown.duration(160).reduceMotion(ReduceMotion.System)}
      className="mb-2 gap-3"
    >
      <View
        className={
          entry.role === "customer"
            ? "max-w-[85%] self-end rounded-[20px] bg-hook px-4 py-3"
            : "max-w-[85%] self-start rounded-[20px] bg-white px-4 py-3"
        }
      >
        <Text className="text-[14px] leading-6 text-black">
          {entry.message}
        </Text>
        {entry.createdAt ? (
          <Text className="mt-1 text-right text-[9px] text-black/45">
            {new Date(entry.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        ) : null}
        {entry.actionId && entry.kind === "action" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onAction(entry.actionId!)}
            className="mt-2 h-9 items-center justify-center rounded-full bg-hook px-3"
          >
            <Text className="text-xs font-bold">Review cart addition</Text>
          </Pressable>
        ) : null}
      </View>
      {entry.productIds?.length ? (
        <Animated.View
          layout={LinearTransition.duration(220).reduceMotion(
            ReduceMotion.System,
          )}
          className="gap-3"
        >
          {expanded ? (
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {entry.productIds.map((id) => (
                <SuggestedProduct
                  key={id}
                  id={id}
                  selected={selected === id}
                  onSelect={(value) => {
                    setSelected(value);
                    onSelect(value);
                  }}
                />
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            className="h-11 items-center justify-center rounded-full bg-hook"
          >
            <Text className="text-sm font-bold">
              {expanded ? "Collapse" : "Show products"}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export function NegotiationComposer({
  value,
  onChange,
  busy,
  onSend,
}: {
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
  onSend: () => void;
}) {
  return (
    <View className="flex-row items-end rounded-[25px] bg-[#F1F1F3] p-1.5 pl-4">
      <TextInput
        accessibilityLabel="Message Hook or make an offer"
        value={value}
        onChangeText={onChange}
        placeholder="Message or offer, e.g. ₦25,000"
        multiline
        maxLength={500}
        className="max-h-24 min-h-11 flex-1 py-3 text-sm"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        disabled={busy || !value.trim()}
        onPress={onSend}
        className="size-11 items-center justify-center rounded-full bg-hook disabled:opacity-40"
      >
        {busy ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Ionicons name="arrow-up" size={20} color="#111" />
        )}
      </Pressable>
    </View>
  );
}

export function NegotiationCartConfirmation({
  visible,
  onClose,
  onConfirm,
  busy,
  product,
  quantity,
  option,
  price,
  expiresAt,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  product?: PublicCatalogProduct;
  quantity: number;
  option?: { colour?: string; size?: string };
  price: number;
  expiresAt?: string;
}) {
  return (
    <HookSheet
      visible={visible}
      onClose={onClose}
      busy={busy}
      title="Confirm cart addition"
      maxHeight="70%"
    >
      <View className="gap-4">
        <Text className="text-base font-bold">{product?.title}</Text>
        <Text className="text-sm text-[#666]">
          {[option?.colour, option?.size].filter(Boolean).join(" · ")} ·
          Quantity {quantity}
        </Text>
        <Text className="text-sm">{negotiationMoney(price)} each</Text>
        <Text className="text-xl font-black">
          Total {negotiationMoney(price * quantity)}
        </Text>
        {expiresAt ? (
          <Text className="text-xs text-[#666]">
            Quote expires {new Date(expiresAt).toLocaleString()}
          </Text>
        ) : null}
        <Text className="text-xs leading-5 text-[#666]">
          Your cart changes only after confirmation. Hook rechecks the price and
          availability.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onConfirm}
          className="h-11 items-center justify-center rounded-full bg-hook disabled:opacity-50"
        >
          <Text className="text-sm font-bold">
            {busy ? "Adding…" : "Confirm and add to cart"}
          </Text>
        </Pressable>
      </View>
    </HookSheet>
  );
}
