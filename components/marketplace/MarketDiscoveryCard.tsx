import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { RemoteImage } from "@/components/shared/RemoteImage";
import type { PublicMarket } from "@/lib/mobile-api";

import {
  marketCardBackgroundXml,
  marketCardFrameXml,
  popularBadgeTopXml,
  replaceSvgColor,
} from "./figmaShapes";
import { marketFallbackColors } from "./tokens";

function getTextColor(color: string) {
  const normalized = color.toLowerCase();
  return ["#fe9263", "#48c7e8", "#f3a7d9", "#ffb46e"].includes(normalized)
    ? "#2184C7"
    : "#FFFFFF";
}

function getFrameColor(color: string) {
  const value = color.trim().replace("#", "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return color;

  const hex =
    value.length === 3
      ? value
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : value;
  const blend = 0.36;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * blend)
      .toString(16)
      .padStart(2, "0");
  });

  return `#${channels.join("")}`;
}

export function MarketDiscoveryCard({
  market,
  index,
}: {
  market: PublicMarket;
  index: number;
}) {
  const color =
    market.discoveryColor ||
    marketFallbackColors[index % marketFallbackColors.length];
  const frameColor = getFrameColor(color);
  const textColor = getTextColor(color);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${market.name}`}
      onPress={() =>
        router.push({
          pathname: "/markets/[id]",
          params: { id: market.publicId },
        } as never)
      }
      className="relative h-[140px]"
    >
      <SvgXml
        xml={replaceSvgColor(marketCardBackgroundXml, color)}
        width="100%"
        height={104}
        style={{ position: "absolute", left: 0, top: 5 }}
      />

      <View className="absolute left-0 top-0 z-10 h-[116px] w-[58%] justify-center pl-5 pt-1">
        {market.isFeatured ? (
          <View className="absolute left-5 top-0 h-[42px] w-[93px] items-center">
            <SvgXml xml={popularBadgeTopXml} width={75} height={25} />
            <View className="-mt-[15px] h-[31px] w-[93px] items-center justify-center rounded-full bg-[#FFC809]">
              <Text className="text-[15px] font-black text-white">Popular</Text>
            </View>
          </View>
        ) : null}
        <Text
          numberOfLines={2}
          className="max-w-[175px] text-[22px] font-black leading-[23px]"
          style={{ color: textColor }}
        >
          {market.shortDisplayName || market.name}
        </Text>
      </View>

      <View className="absolute -right-1 -top-[15px] z-20 h-[138px] w-[138px] items-center justify-center">
        <SvgXml
          xml={replaceSvgColor(marketCardFrameXml, frameColor)}
          width={138}
          height={138}
          style={{ position: "absolute" }}
        />
        <View className="h-[104px] w-[104px] overflow-hidden rounded-full bg-white">
          <RemoteImage uri={market.imageUrl} />
        </View>
      </View>
    </Pressable>
  );
}
