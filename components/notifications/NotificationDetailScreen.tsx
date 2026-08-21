import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import bellIcon from '@/assets/images/notification/bell.png';
import { toast } from '@/components/shared/toast';
import { HookLoader } from '@/components/shared/HookLoader';
import {
  useDeleteNotificationMutation,
  useMarkNotificationReadMutation,
  useNotificationQuery,
} from '@/lib/mobile-api';

type HookNotification = {
  id: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
  isRead?: boolean;
  readAt?: string;
  createdAt?: string;
};

function labelFromType(type?: string) {
  if (!type) return 'General';
  return type.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function relativeWhen(iso?: string) {
  if (!iso) return '';
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function prettyKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

export default function NotificationDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const notification = useNotificationQuery(id);
  const markRead = useMarkNotificationReadMutation();
  const remove = useDeleteNotificationMutation();
  const item = notification.data as HookNotification | undefined;
  const itemId = item?.id;
  const itemIsRead = item?.isRead;
  const markReadMutation = markRead.mutate;
  const autoReadIdRef = useRef<string | null>(null);

  // Opening the notification marks it as read immediately — no manual action needed
  useEffect(() => {
    if (!id || !itemId || itemIsRead || autoReadIdRef.current === id) return;
    autoReadIdRef.current = id;
    markReadMutation(id);
  }, [id, itemId, itemIsRead, markReadMutation]);

  async function handleDelete() {
    if (!id || remove.isPending) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Notification removed');
      router.back();
    } catch (error) {
      toast.error('Could not remove notification', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  // Extra payload entries worth showing (order codes, refs — primitives only)
  const dataEntries = Object.entries(item?.data ?? {}).filter(
    ([, value]) => ['string', 'number', 'boolean'].includes(typeof value),
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f1f3' }}>
      {/* Native modal header (same pattern as modal.tsx) — iOS sheets get an explicit close button */}
      <Stack.Screen
        options={{
          headerRight:
            Platform.OS === 'ios'
              ? () => (
                  <Pressable
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => router.back()}
                    style={{
                      alignItems: 'center',
                      backgroundColor: '#fff',
                      borderRadius: 15,
                      height: 30,
                      justifyContent: 'center',
                      width: 30,
                    }}>
                    <Ionicons name="close" size={17} color="#111" />
                  </Pressable>
                )
              : undefined,
        }}
      />

      {notification.isLoading ? (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', gap: 12 }}>
          <HookLoader size="page" label="Loading notification..." />
        </View>
      ) : !item ? (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 36 }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#F8E9A7',
              borderRadius: 44,
              height: 88,
              justifyContent: 'center',
              width: 88,
            }}>
            <Image source={bellIcon} resizeMode="contain" style={{ height: 62, width: 62 }} />
          </View>
          <Text style={{ color: '#000', fontSize: 18, fontWeight: '800', marginTop: 18 }}>Notification not found</Text>
          <Text style={{ color: '#696969', fontSize: 14, lineHeight: 19, marginTop: 8, textAlign: 'center' }}>
            This notification may have been cleared or is no longer available.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={{
              backgroundColor: '#111',
              borderRadius: 999,
              marginTop: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 28, paddingHorizontal: 18, paddingTop: 18 }}
          showsVerticalScrollIndicator={false}>
          {/* Main card */}
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.06,
              shadowRadius: 18,
            }}>
            {/* Type row */}
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#FFF4C7',
                  borderRadius: 24,
                  height: 48,
                  justifyContent: 'center',
                  width: 48,
                }}>
                <Image source={bellIcon} resizeMode="contain" style={{ height: 32, width: 32 }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: '#f1f1f3',
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}>
                  <Text style={{ color: '#414040', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    {labelFromType(item.type)}
                  </Text>
                </View>
                <Text style={{ color: '#8a8a8a', fontSize: 12, marginTop: 5 }}>{relativeWhen(item.createdAt)}</Text>
              </View>
            </View>

            {/* Title + body */}
            <Text style={{ color: '#000', fontSize: 22, fontWeight: '900', lineHeight: 28, marginTop: 20 }}>
              {item.title}
            </Text>
            <Text style={{ color: '#414040', fontSize: 15, lineHeight: 24, marginTop: 10 }}>
              {item.body}
            </Text>

            {/* Timestamp */}
            <View
              style={{
                alignItems: 'center',
                borderTopColor: '#f1f1f3',
                borderTopWidth: 1,
                flexDirection: 'row',
                gap: 8,
                marginTop: 20,
                paddingTop: 14,
              }}>
              <Ionicons name="time-outline" size={15} color="#8a8a8a" />
              <Text style={{ color: '#8a8a8a', fontSize: 13 }}>Received {formatWhen(item.createdAt)}</Text>
            </View>
          </View>

          {/* Extra details from the payload, when present */}
          {dataEntries.length > 0 ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                marginTop: 14,
                padding: 18,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
              }}>
              <Text style={{ color: '#000', fontSize: 14, fontWeight: '800', marginBottom: 10 }}>Details</Text>
              <View style={{ gap: 10 }}>
                {dataEntries.map(([key, value]) => (
                  <View key={key} style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={{ color: '#8a8a8a', fontSize: 13 }}>{prettyKey(key)}</Text>
                    <Text numberOfLines={1} style={{ color: '#111', flexShrink: 1, fontSize: 13, fontWeight: '700' }}>
                      {String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Remove action — reading happens automatically on open */}
          <Pressable
            accessibilityRole="button"
            disabled={remove.isPending}
            onPress={handleDelete}
            style={{
              alignItems: 'center',
              backgroundColor: '#fff',
              borderColor: '#f3d6d6',
              borderRadius: 999,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 8,
              height: 50,
              justifyContent: 'center',
              marginTop: 18,
              opacity: remove.isPending ? 0.6 : 1,
            }}>
            {remove.isPending ? (
              <HookLoader size="button" variant="yellow" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={17} color="#c0392b" />
                <Text style={{ color: '#c0392b', fontSize: 14, fontWeight: '800' }}>
                  Remove notification
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
