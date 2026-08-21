import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HookLoader } from "./HookLoader";
import { HookBackButton } from "./HookBackButton";

type HookPageLoadingProps = {
  title?: string;
  label?: string;
  showBack?: boolean;
  onBack?: () => void;
};

export function HookPageLoading({
  label = "Loading",
  showBack = true,
  onBack,
}: HookPageLoadingProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#F1F1F3]">
      {showBack ? (
        <HookBackButton
          onPress={onBack}
          className="absolute left-4 z-10"
          style={{ top: insets.top + 10 }}
        />
      ) : null}
      <View className="flex-1 items-center justify-center px-6 pb-16">
        <HookLoader label={label} />
      </View>
    </View>
  );
}
