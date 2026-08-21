import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { getCartItems, useCartQuery } from '@/lib/mobile-api';

export function CartButton({ tone = 'yellow' }: { tone?: 'yellow' | 'white' }) {
  const cart = useCartQuery();
  const count = getCartItems(cart.data).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  return <Pressable accessibilityLabel={`Open cart${count ? `, ${count} items` : ''}`} accessibilityRole="button" onPress={() => router.push('/cart' as never)} className={`h-11 w-11 items-center justify-center rounded-full ${tone === 'yellow' ? 'bg-hook' : 'bg-white'}`}><Ionicons name="bag-handle-outline" size={20} color="#111" />{count > 0 ? <View className="absolute -right-1 -top-1 min-w-5 items-center justify-center rounded-full border-2 border-white bg-black px-1"><Text className="text-[10px] font-black text-white">{count > 99 ? '99+' : count}</Text></View> : null}</Pressable>;
}
