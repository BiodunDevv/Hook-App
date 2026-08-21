import { Pressable, Text, View } from "react-native";

type NegotiationPromptProps = {
  onPress: () => void;
};

export function NegotiationPrompt({ onPress }: NegotiationPromptProps) {
  return (
    <View className="relative overflow-visible pt-5">
      <View
        pointerEvents="none"
        className="absolute left-[14px] top-0 z-10 h-[22px] w-[22px] rounded-full bg-black"
      />
      <View
        pointerEvents="none"
        className="absolute left-[35px] top-[-4px] z-10 h-[25px] w-[25px] rounded-full bg-black"
      />
      <View
        pointerEvents="none"
        className="absolute left-[59px] top-0 z-10 h-[22px] w-[22px] rounded-full bg-black"
      />
      <View
        pointerEvents="none"
        className="absolute left-0 top-2 z-20 h-[35px] min-w-[124px] items-center justify-center rounded-full bg-black px-2.5"
        style={{ transform: [{ rotate: "-8deg" }] }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          className="text-[10px] font-light text-white"
        >
          Not Satisfied with price?
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Negotiate product price"
        onPress={onPress}
        className="h-[53px] w-full items-center justify-center rounded-full bg-[#FFC809] active:opacity-80"
      >
        <Text className="text-[16px] font-semibold text-black">Negotiate</Text>
      </Pressable>
    </View>
  );
}
