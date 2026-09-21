import { Ionicons } from "@expo/vector-icons";
import { haptics } from "@/lib/haptics";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { RemoteImage } from "@/components/shared/RemoteImage";
import type { PublicCategory } from "@/lib/mobile-api";

const DEFAULT_CATEGORY_IMAGE = require("../../assets/images/figma/category-market-art.png");
const ALL_CATEGORIES_IMAGE = require("../../assets/images/all-categories.png");

export function CategoryCircle({
  category,
  selected,
  compact,
  index = 0,
  onPress,
}: {
  category: PublicCategory;
  selected?: boolean;
  compact?: boolean;
  /** Position in the strip; staggers the entrance. */
  index?: number;
  onPress: () => void;
}) {
  const size = compact ? 54 : 72;
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInRight.delay(Math.min(index, 10) * 45).duration(320)}>
    {/* The press scale lives on its own wrapper: a layout animation would overwrite a transform on the same view. */}
    <Animated.View style={pressStyle}>
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.92, { damping: 14, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 260 }); }}
      onPress={() => { haptics.select(); onPress(); }}
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
            uri={category.publicId === "all" ? undefined : category.iconUrl}
            fallbackSource={category.publicId === "all" ? ALL_CATEGORIES_IMAGE : DEFAULT_CATEGORY_IMAGE}
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
    </Animated.View>
    </Animated.View>
  );
}
