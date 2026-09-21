import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { HookSheet } from "@/components/shared/HookSheet";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { resolveColor } from "@/components/marketplace/product-colors";
import type { PublicCatalogProduct } from "@/lib/mobile-api";
import { autoSelection, availableValues, buildAxes, choose, findVariant, nextMissingAxis, valueOf, type Selection } from "@/lib/variant-axes";

type Variant = PublicCatalogProduct["variants"][number];

export function NegotiationOptionsSheet({
  visible,
  product,
  initialVariantId,
  quantity,
  onClose,
  onContinue,
}: {
  visible: boolean;
  product: PublicCatalogProduct;
  initialVariantId?: string;
  quantity: number;
  onClose: () => void;
  onContinue: (variant: Variant) => void;
}) {
  const variants = product.variants;
  // The same choices the product page shows, taken from the category.
  const axes = buildAxes(variants, product.category?.attributes);
  const initial = variants.find((variant) => variant.publicId === initialVariantId);
  const [selection, setSelection] = useState<Selection>(
    initial ? (Object.fromEntries(axes.map((axis) => [axis.key, valueOf(initial, axis.key)]).filter(([, value]) => value)) as Selection) : {},
  );
  const active = autoSelection(axes, selection);
  const missing = nextMissingAxis(axes, active);
  const selected = axes.length ? (missing ? undefined : findVariant(variants, active)) : variants.length === 1 ? variants[0] : undefined;
  return (
    <HookSheet
      visible={visible}
      onClose={onClose}
      title="Choose your options"
      message="Your negotiated price will apply to these options and quantity."
      maxHeight="85%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 }}
      >
        <View className="mb-5 flex-row items-center gap-3">
          <View className="h-16 w-16 overflow-hidden rounded-xl">
            <RemoteImage uri={product.media[0]?.url} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold">{product.title}</Text>
            <Text className="mt-1 text-xs text-black/60">
              Quantity: {quantity}
            </Text>
          </View>
        </View>
        {axes.map((axis) => {
          const chosen = active[axis.key] || "";
          const available = availableValues(variants, active, axis.key);
          return (
            <View key={axis.key} className="mb-5">
              <Text className="mb-3 text-sm font-semibold">{axis.label}</Text>
              <View className="flex-row flex-wrap gap-2">
                {axis.values.map((value) => {
                  const isSelected = chosen.toLowerCase() === value.toLowerCase();
                  const enabled = available.has(value.toLowerCase());
                  const onPick = () => setSelection((current) => choose(variants, axes, current, axis.key, value));
                  if (axis.type === "colour") {
                    const display = resolveColor(value);
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected, disabled: !enabled }}
                        disabled={!enabled}
                        onPress={onPick}
                        className={`min-h-11 flex-row items-center gap-2 rounded-full border px-3 ${isSelected ? "border-black bg-hook/20" : "border-black/20 bg-white"} ${enabled ? "" : "opacity-30"}`}
                      >
                        <View className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: display.hex }} />
                        <Text className="text-sm">{display.name}</Text>
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected, disabled: !enabled }}
                      disabled={!enabled}
                      onPress={onPick}
                      className={`min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 ${isSelected ? "border-black bg-black" : "border-black/20 bg-white"} ${enabled ? "" : "opacity-30"}`}
                    >
                      <Text className={`text-sm font-semibold ${isSelected ? "text-white" : "text-black"}`}>{value}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        {!variants.length ? (
          <Text className="mb-4 text-sm leading-5 text-black/60">
            Negotiation options are currently unavailable for this product.
            Please refresh the product and try again.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected?.publicId }}
          disabled={!selected?.publicId}
          onPress={() => {
            if (selected) onContinue(selected);
          }}
          className="h-11 items-center justify-center rounded-full bg-hook disabled:opacity-40"
        >
          <Text className="text-sm font-bold">Continue to negotiate</Text>
        </Pressable>
      </ScrollView>
    </HookSheet>
  );
}
