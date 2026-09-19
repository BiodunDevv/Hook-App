import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { HookSheet } from "@/components/shared/HookSheet";
import { RemoteImage } from "@/components/shared/RemoteImage";
import { resolveColor } from "@/components/marketplace/product-colors";
import type { PublicCatalogProduct } from "@/lib/mobile-api";

type Variant = PublicCatalogProduct["variants"][number];
const colourOf = (variant: Variant) =>
  variant.colour ||
  variant.attributes?.color ||
  variant.attributes?.colour ||
  "";

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
  const initial = product.variants.find(
    (variant) => variant.publicId === initialVariantId,
  );
  const [colour, setColour] = useState(initial ? colourOf(initial) : "");
  const [size, setSize] = useState(initial?.size || "");
  const variants = product.variants;
  const colours = [...new Set(variants.map(colourOf).filter(Boolean))];
  const sizes = [
    ...new Set(
      variants
        .map((variant) => variant.size)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const selected = variants.find(
    (variant) =>
      (!colours.length || colourOf(variant) === colour) &&
      (!sizes.length || variant.size === size),
  );
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
        {colours.length ? (
          <View className="mb-5">
            <Text className="mb-3 text-sm font-semibold">Colour</Text>
            <View className="flex-row flex-wrap gap-2">
              {colours.map((value) => {
                const display = resolveColor(value);
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === colour }}
                    onPress={() => {
                      setColour(value);
                      if (
                        !variants.some(
                          (variant) =>
                            colourOf(variant) === value &&
                            variant.size === size,
                        )
                      )
                        setSize("");
                    }}
                    className={`min-h-11 flex-row items-center gap-2 rounded-full border px-3 ${value === colour ? "border-black bg-hook/20" : "border-black/20 bg-white"}`}
                  >
                    <View
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: display.hex }}
                    />
                    <Text className="text-sm">{display.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {sizes.length ? (
          <View className="mb-5">
            <Text className="mb-3 text-sm font-semibold">Size</Text>
            <View className="flex-row flex-wrap gap-2">
              {sizes.map((value) => {
                const enabled =
                  !colours.length ||
                  Boolean(
                    colour &&
                    variants.some(
                      (variant) =>
                        colourOf(variant) === colour && variant.size === value,
                    ),
                  );
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: value === size,
                      disabled: !enabled,
                    }}
                    disabled={!enabled}
                    onPress={() => setSize(value)}
                    className={`min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 ${value === size ? "border-black bg-black" : "border-black/20 bg-white"} ${enabled ? "" : "opacity-30"}`}
                  >
                    <Text
                      className={`text-sm font-semibold ${value === size ? "text-white" : "text-black"}`}
                    >
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {colours.length && !colour ? (
              <Text className="mt-2 text-xs text-black/60">
                Choose a colour to see its available sizes.
              </Text>
            ) : null}
          </View>
        ) : null}
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
