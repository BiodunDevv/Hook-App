import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HookConfirmSheet } from '@/components/shared/HookConfirmSheet';
import { HookLoader } from '@/components/shared/HookLoader';
import { HookBackButton } from '@/components/shared/HookBackButton';
import { toast } from '@/components/shared/toast';
import { type AccountDevice, listDevices, revokeDevice, revokeOtherDevices } from '@/lib/auth-api';

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<AccountDevice | null>(null);
  const [allOthersOpen, setAllOthersOpen] = useState(false);
  const query = useQuery({ queryKey: ['account', 'devices'], queryFn: listDevices });
  const revoke = useMutation({
    mutationFn: revokeDevice,
    onSuccess: async () => {
      setSelectedDevice(null);
      await client.invalidateQueries({ queryKey: ['account', 'devices'] });
      toast.success('Device signed out', 'That device was disconnected immediately.');
    },
    onError: (error) => toast.error('Could not sign out device', error instanceof Error ? error.message : 'Please try again.'),
  });
  const revokeOthers = useMutation({
    mutationFn: revokeOtherDevices,
    onSuccess: async () => {
      setAllOthersOpen(false);
      await client.invalidateQueries({ queryKey: ['account', 'devices'] });
      toast.success('Other devices signed out', 'Only this device remains connected.');
    },
    onError: (error) => toast.error('Could not sign out devices', error instanceof Error ? error.message : 'Please try again.'),
  });
  const otherDevices = query.data?.filter((item) => !item.current) || [];

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center">
          <HookBackButton />
          <View className="ml-4 flex-1"><Text className="text-xl font-black">Your devices</Text><Text className="mt-0.5 text-xs text-[#777]">Manage where your Hook account is signed in.</Text></View>
        </View>
        <View className="mt-6 rounded-[18px] bg-hook p-5">
          <Ionicons name="shield-checkmark" size={25} color="#111" />
          <Text className="mt-4 text-lg font-black text-black">You stay in control</Text>
          <Text className="mt-1 text-sm leading-5 text-black/55">Signing out a device revokes its session, notifications, and live connection immediately.</Text>
        </View>
        {query.isLoading ? <View className="py-24"><HookLoader /></View> : (
          <View className="mt-5 overflow-hidden rounded-[14px] bg-white">
            {query.data?.map((device, index) => {
              const deviceId = device.id || device.deviceId;
              return (
                <View key={deviceId || `device-${index}`} className="flex-row items-center border-b border-black/5 p-4 last:border-b-0">
                  <View className="h-11 w-11 items-center justify-center rounded-[11px] bg-[#FFF4C7]"><Ionicons name={device.platform === 'ios' ? 'logo-apple' : device.platform === 'android' ? 'logo-android' : 'phone-portrait-outline'} size={21} /></View>
                  <View className="ml-3 flex-1"><View className="flex-row items-center"><Text className="font-bold">{device.deviceName}</Text>{device.current ? <View className="ml-2 rounded-full bg-[#FFF4C7] px-2 py-0.5"><Text className="text-[10px] font-bold">This device</Text></View> : null}</View><Text className="mt-1 text-xs text-[#777]">Last active {new Date(device.lastActiveAt).toLocaleDateString()}</Text></View>
                  {!device.current && deviceId ? <Pressable disabled={revoke.isPending} onPress={() => setSelectedDevice(device)} className="h-9 items-center justify-center rounded-full bg-red-50 px-3"><Text className="text-xs font-bold text-red-600">Sign out</Text></Pressable> : null}
                </View>
              );
            })}
          </View>
        )}
        {otherDevices.length ? <Pressable disabled={revokeOthers.isPending} onPress={() => setAllOthersOpen(true)} className="mt-5 h-[52px] items-center justify-center rounded-full bg-black"><Text className="font-bold text-white">Sign out all other devices</Text></Pressable> : null}
      </ScrollView>
      <HookConfirmSheet visible={Boolean(selectedDevice)} title="Sign out this device?" message={`${selectedDevice?.deviceName || 'This device'} will lose access to your Hook account immediately.`} confirmLabel="Sign out" destructive busy={revoke.isPending} onClose={() => setSelectedDevice(null)} onConfirm={() => { if (selectedDevice?.id) revoke.mutate(selectedDevice.id); }} />
      <HookConfirmSheet visible={allOthersOpen} title="Sign out other devices?" message="Every other active device will be disconnected. This device will remain signed in." confirmLabel="Sign out all" destructive busy={revokeOthers.isPending} onClose={() => setAllOthersOpen(false)} onConfirm={() => revokeOthers.mutate()} />
    </View>
  );
}
