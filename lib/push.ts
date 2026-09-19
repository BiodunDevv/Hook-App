import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api';
import { getDeviceId, getSession } from '@/lib/session';

/**
 * Expo Go dropped remote notifications in SDK 53, and expo-notifications
 * throws the moment it is imported there. This module sits in the import
 * chain of the tab layout, so a top-level import would take the whole app
 * down rather than just disabling push. Loading it lazily keeps Expo Go
 * usable; a real build resolves the module and push works as normal.
 */
type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = require('expo-notifications') as NotificationsModule;
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

/**
 * Android 8+ shows notifications only through a channel, and Android 13+ will
 * not even ask for permission until one exists. The backend sends to the
 * channel named 'default'. Safe to call repeatedly.
 */
async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Hook',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FFC809',
  });
}

/** The EAS project the token belongs to. Explicit, so it never depends on config being inlined. */
function easProjectId() {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
    ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

export async function registerPushToken(options: { sendWelcome?: boolean } = {}) {
  try {
    if (!Device.isDevice) return null;
    const Notifications = getNotifications();
    if (!Notifications) return null;
    await ensureAndroidChannel(Notifications);
    const permission = await Notifications.getPermissionsAsync();
    let status = permission.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId = easProjectId();
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const session = await getSession();
    if (!session?.accessToken) return null;

    await apiRequest('/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        expoPushToken: token.data,
        platform: Platform.OS,
        deviceName: Device.deviceName || Device.modelName || 'Hook device',
        deviceId: await getDeviceId(),
        sendWelcome: options.sendWelcome,
      }),
    });
    return token.data;
  } catch (error) {
    // Silent for users, but the usual cause on Android (a build without
    // google-services.json) is impossible to find without this line.
    if (__DEV__) console.warn('[push] Could not register for push notifications:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function unregisterPushToken(expoPushToken?: string) {
  try {
    let token = expoPushToken;
    const Notifications = getNotifications();
    if (!token && Device.isDevice && Notifications) {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status === 'granted') token = (await Notifications.getExpoPushTokenAsync()).data;
    }
    if (!token) return;
    await apiRequest('/devices/unregister', {
      method: 'POST',
      body: JSON.stringify({ expoPushToken: token }),
    });
  } catch {
    // best effort
  }
}
