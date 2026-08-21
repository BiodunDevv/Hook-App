import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HookLoader } from '@/components/shared/HookLoader';

export function BackendUnavailableScreen({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-hook px-6" style={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }}>
      <Text className="text-[32px] font-black text-black">hook<Text className="text-white">.</Text></Text>
      <View className="flex-1 justify-center">
        <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-black">
          <Ionicons name="construct-outline" size={29} color="#FFC809" />
        </View>
        <Text className="mt-7 text-[30px] font-black leading-[36px] text-black">Hook is taking a short break</Text>
        <Text className="mt-4 max-w-[330px] text-[15px] leading-6 text-black/60">
          We cannot reach Hook right now. Our team is working to bring everything back to life.
        </Text>
        <Pressable disabled={retrying} onPress={onRetry} className="mt-8 h-14 flex-row items-center justify-center rounded-full bg-black px-6">
          {retrying ? <HookLoader size="button" variant="yellow" /> : <><Ionicons name="refresh" size={19} color="#FFC809" /><Text className="ml-2 font-black text-hook">Try again</Text></>}
        </Pressable>
      </View>
      <Text className="text-center text-xs font-semibold text-black/45">Your account and cart are safe.</Text>
    </View>
  );
}
