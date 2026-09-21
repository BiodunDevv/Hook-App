import { PressScale } from "@/components/motion/PressScale";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { RemoteImage } from "@/components/shared/RemoteImage";
import type { PublicMarket } from "@/lib/mobile-api";

import {
  marketCardBackgroundXml,
  marketCardFrameXml,
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
  // City, then State, without repeating the same name ("Lagos, Lagos"); falls back to the street address.
  const place = [market.city?.name, market.state?.name].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
  const location = place.length ? place.join(", ") : market.address?.split(",").slice(-2).join(",").trim() || "";

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`Open ${market.name}`}
      scale={0.98}
      innerClassName="relative h-[140px]"
      onPress={() =>
        router.push({
          pathname: "/markets/[id]",
          params: { id: market.publicId },
        } as never)
      }
    >
      <SvgXml
        xml={replaceSvgColor(marketCardBackgroundXml, color)}
        width="100%"
        height={104}
        style={{ position: "absolute", left: 0, top: 5 }}
      />

      {market.isFeatured ? (
        <View
          className="absolute z-30 flex-row items-center rounded-full px-2.5 py-1"
          style={{ right: 138, bottom: 50, backgroundColor: "rgba(255,255,255,0.24)" }}
        >
          <Ionicons name="star" size={11} color={textColor} />
          <Text className="ml-1 text-[10px] font-black uppercase tracking-wider" style={{ color: textColor }}>
            Popular
          </Text>
        </View>
      ) : null}
      <View className="absolute left-0 top-0 z-10 h-[116px] w-[60%] justify-center pl-5" style={{ paddingTop: 4 }}>
        <Text
          numberOfLines={2}
          className="max-w-[190px] font-black"
          style={{ color: textColor, fontSize: 20, lineHeight: 23 }}
        >
          {market.shortDisplayName || market.name}
        </Text>
        {location ? (
          <View className="mt-1.5 flex-row items-center" style={{ opacity: 0.9 }}>
            <Ionicons name="location-sharp" size={12} color={textColor} />
            <Text numberOfLines={1} className="ml-0.5 max-w-[160px] text-[11px] font-semibold" style={{ color: textColor }}>
              {location}
            </Text>
          </View>
        ) : null}
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
    </PressScale>
  );
}
