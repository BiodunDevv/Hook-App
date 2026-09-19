import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";

export function BackendUnavailableScreen({
  retrying,
  onRetry,
}: {
  retrying: boolean;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 items-center justify-between bg-hook px-6"
      style={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }}
    >
      <View className="w-full max-w-sm flex-1 items-center justify-center">
        <Text className="text-[32px] font-black text-black">
          hook<Text className="text-white">.</Text>
        </Text>
        <View className="mt-10 h-16 w-16 items-center justify-center rounded-[22px] bg-black">
          <Ionicons name="construct-outline" size={29} color="#FFC809" />
        </View>
        <Text className="mt-7 text-center text-[25px] font-black leading-[36px] text-black">
          Hook is under maintenance
        </Text>
        <Text className="mt-4 max-w-[330px] text-center text-[14px] leading-6 text-black/60">
          We cannot reach Hook right now. Our team is working to bring
          everything back online.
        </Text>
        <Button title="Try again" variant="dark" loading={retrying} onPress={onRetry} className="mt-8 w-full" />
      </View>
      <Text className="text-center text-xs font-semibold text-black/45">
        Your account and cart are safe.
      </Text>
    </View>
  );
}
