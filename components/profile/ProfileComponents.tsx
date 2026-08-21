import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function ProfileAvatar({ name, uri, size = 78 }: { name: string; uri?: string; size?: number }) {
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <View className="items-center justify-center overflow-hidden rounded-full bg-[#FFF2B8]" style={{ width: size, height: size }}>
    {uri ? <Image source={{ uri }} className="h-full w-full" /> : <Text className="text-xl font-black text-black">{initials || 'H'}</Text>}
  </View>;
}

export function ProfileSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View className="mb-7"><Text className="mb-3 text-[15px] font-semibold text-black">{title}</Text><View className="overflow-hidden rounded-[10px] bg-white px-2.5">{children}</View></View>;
}

export function ProfileRow({ icon, label, value, onPress, danger, neutral, trailing }: { icon: IconName; label: string; value?: string; onPress?: () => void; danger?: boolean; neutral?: boolean; trailing?: ReactNode }) {
  return <Pressable disabled={!onPress} onPress={onPress} className="min-h-[70px] flex-row items-center border-b border-[#D9D9D9] last:border-b-0">
    <View className={`h-[30px] w-[30px] items-center justify-center rounded-[5px] ${danger ? 'bg-red-50' : neutral ? 'bg-[#EAEBE7]' : 'bg-hook'}`}><Ionicons name={icon} size={18} color={danger ? '#DC2626' : '#111'} /></View>
    <Text className={`ml-2.5 flex-1 text-[15px] font-semibold ${danger ? 'text-red-600' : 'text-black'}`}>{label}</Text>
    {value ? <Text className="mr-2 text-sm text-[#858589]">{value}</Text> : null}
    {trailing || (onPress ? <Ionicons name="chevron-forward" size={18} color="#A3A3A6" /> : null)}
  </Pressable>;
}
