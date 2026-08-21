import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { RemoteImage } from "@/components/shared/RemoteImage";
import type { PublicCategory } from "@/lib/mobile-api";

const DEFAULT_CATEGORY_IMAGE = require("../../assets/images/figma/category-market-art.png");

export function CategoryCircle({
  category,
  selected,
  compact,
  onPress,
}: {
  category: PublicCategory;
  selected?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  const size = compact ? 54 : 72;
  return (
    <Pressable
      onPress={onPress}
      disabled={category.isComingSoon}
      className="items-center"
      style={{ width: compact ? 68 : 78 }}
    >
      <View
        className={`items-center justify-center overflow-hidden rounded-full ${selected ? "bg-black" : category.isComingSoon ? "bg-[#FFF1B8]" : "bg-white"}`}
        style={{
          width: size,
          height: size,
          borderWidth: 6.771,
          borderColor: category.isComingSoon ? "#E1B300" : "#FFC809",
        }}
      >
        {category.isComingSoon ? (
          <Ionicons name="sparkles-outline" size={24} color="#806D25" />
        ) : (
          <RemoteImage
            uri={category.iconUrl}
            fallbackSource={DEFAULT_CATEGORY_IMAGE}
            contentFit="cover"
          />
        )}
      </View>
      <Text
        className={`mt-1.5 text-center ${compact ? "text-[10px]" : "text-[11px]"} ${category.isComingSoon ? "font-bold" : "font-medium"} text-black`}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}
