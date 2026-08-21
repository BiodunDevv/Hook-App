import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import bellIcon from '@/assets/images/notification/bell.png';
import { toast } from '@/components/shared/toast';
import { HookLoader } from '@/components/shared/HookLoader';
import { HookBackButton } from '@/components/shared/HookBackButton';
import {
  useClearNotificationsMutation,
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
} from '@/lib/mobile-api';

type HookNotification = {
  id: string;
  title: string;
  body: string;
  isRead?: boolean;
  createdAt?: string;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const notifications = useNotificationsQuery();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const clearAll = useClearNotificationsMutation();
  const deleteNotification = useDeleteNotificationMutation();
  const rows = ((notifications.data as any)?.data || []) as HookNotification[];
  const unread = Number((notifications.data as any)?.unread || 0);
  const busy = markAllRead.isPending || clearAll.isPending;

  function handleNotificationPress(item: HookNotification) {
    // The detail screen marks the notification as read on open — navigate instantly
    router.push({ pathname: '/notifications/[id]', params: { id: item.id } });
  }

  async function handleReadAll() {
    if (!rows.length || unread === 0 || busy) return;
    try {
      await markAllRead.mutateAsync();
      toast.success('Notifications updated', 'Everything is marked as read.');
    } catch (error) {
      toast.error('Could not mark all as read', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  function handleClearAll() {
    if (!rows.length || busy) return;
    Alert.alert(
      'Clear notifications?',
      'This will remove all notifications from this device view.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAll.mutateAsync();
              toast.success('Notifications cleared', 'Your notification list is now empty.');
            } catch (error) {
              toast.error('Could not clear notifications', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ],
    );
  }

  async function handleDelete(item: HookNotification) {
    try {
      await deleteNotification.mutateAsync(item.id);
      toast.success('Notification removed');
    } catch (error) {
      toast.error('Could not remove notification', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f1f3', paddingTop: insets.top + 14 }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          paddingHorizontal: 18,
          position: 'relative',
        }}>
        <HookBackButton
          style={{
            left: 18,
            position: 'absolute',
          }}
        />
        <Text style={{ color: '#000', fontSize: 18, fontWeight: '700' }}>Notifications</Text>
      </View>

      {notifications.isLoading ? (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <HookLoader size="page" label="Loading notifications..." />
        </View>
      ) : rows.length === 0 ? (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 40 }}>
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
          <Text
            style={{
              color: '#696969',
              fontSize: 14,
              lineHeight: 18,
              marginTop: 18,
              maxWidth: 220,
              textAlign: 'center',
            }}>
            All your notification will show on this page
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 18, paddingTop: 28 }}
          showsVerticalScrollIndicator={false}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
            <View>
              <Text style={{ color: '#000', fontSize: 20, fontWeight: '800' }}>{rows.length} total</Text>
              <Text style={{ color: '#696969', fontSize: 13, marginTop: 2 }}>{unread} unread notification{unread === 1 ? '' : 's'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                disabled={!unread || busy}
                onPress={handleReadAll}
                style={{
                  backgroundColor: unread && !busy ? '#111' : '#d9d9d9',
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Read all</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!rows.length || busy}
                onPress={handleClearAll}
                style={{
                  backgroundColor: rows.length && !busy ? '#FFC809' : '#e6e6e6',
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                }}>
                <Text style={{ color: '#111', fontSize: 12, fontWeight: '700' }}>Clear all</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {rows.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => handleNotificationPress(item)}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 18,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      backgroundColor: item.isRead ? '#f1f1f3' : '#FFF4C7',
                      borderRadius: 18,
                      height: 36,
                      width: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Image source={bellIcon} resizeMode="contain" style={{ height: 24, width: 24 }} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: '#000', fontSize: 15, fontWeight: '700' }}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={2} style={{ color: '#414040', fontSize: 13, lineHeight: 18, marginTop: 3 }}>
                      {item.body}
                    </Text>
                  </View>
                  {!item.isRead ? <View style={{ backgroundColor: '#FFC809', borderRadius: 5, height: 10, width: 10 }} /> : null}
                  <Pressable
                    accessibilityLabel="Delete notification"
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleDelete(item);
                    }}>
                    <Ionicons name="trash-outline" size={18} color="#8a8a8a" />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
