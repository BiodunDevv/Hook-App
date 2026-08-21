import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { PublicMarket } from "@/lib/mobile-api";

import { HookSheet } from "../shared/HookSheet";
import { MarketplaceSearch } from "./MarketplaceSearch";

type MarketSelectionSheetProps = {
  visible: boolean;
  markets: PublicMarket[];
  selectedMarketId: string;
  onSelect: (marketId: string) => void;
  onClose: () => void;
};

export function MarketSelectionSheet({
  visible,
  markets,
  selectedMarketId,
  onSelect,
  onClose,
}: MarketSelectionSheetProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!visible) {
      setSearch("");
    }
  }, [visible]);

  const filteredMarkets = markets.filter((market) => {
    const value = search.trim().toLowerCase();
    return (
      !value ||
      `${market.name} ${market.address || ""}`.toLowerCase().includes(value)
    );
  });

  function select(marketId: string) {
    onSelect(marketId);
    onClose();
  }

  return (
    <HookSheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Choose a market"
      title="Choose a market"
      minHeight="54%"
      maxHeight="80%"
      contentClassName="mt-4 flex-1"
    >
      <MarketplaceSearch
        value={search}
        onChangeText={setSearch}
        placeholder="Search for market"
        returnKeyType="search"
      />

      <ScrollView
        className="mt-4 flex-1"
        contentContainerStyle={{ paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MarketOption
          label="All markets"
          selected={selectedMarketId === "all"}
          onPress={() => select("all")}
        />
        {filteredMarkets.map((market) => (
          <MarketOption
            key={market.publicId}
            label={market.name || market.shortDisplayName || "Market"}
            selected={selectedMarketId === market.publicId}
            onPress={() => select(market.publicId)}
          />
        ))}
        {!filteredMarkets.length ? (
          <View className="items-center px-6 py-12">
            <Text className="font-bold text-[#111]">No markets found</Text>
            <Text className="mt-1 text-center text-sm text-[#777]">
              Try a different market name.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </HookSheet>
  );
}

function MarketOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`mb-1.5 min-h-11 justify-center rounded-full px-4 ${selected ? "bg-[#DDE5F0]" : "bg-transparent"}`}
    >
      <Text numberOfLines={1} className="text-[17px] text-[#111]">
        {label}
      </Text>
    </Pressable>
  );
}
