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

/** Explains, in development only, why push did not register: the causes are otherwise invisible. */
function devNote(message: string) {
  if (__DEV__) console.warn(`[push] ${message}`);
}
let notificationsModule: NotificationsModule | null | undefined;

export function getNotifications(): NotificationsModule | null {
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
    devNote('expo-notifications is not available here. Push needs a development or production build, not Expo Go.');
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
  // One channel per group, so each can be muted or changed in the phone's settings.
  const groups: Array<[string, string, string, 'MAX' | 'DEFAULT' | 'LOW']> = [
    ['orders', 'Orders and delivery', 'Updates about your orders, payments and deliveries', 'MAX'],
    ['account', 'Account and security', 'Sign-ins and changes to your account', 'MAX'],
    ['credit', 'Hook credit and referrals', 'Credit earned, spent and referral rewards', 'DEFAULT'],
    ['reminders', 'Reminders', 'Your cart, negotiations and saved items', 'DEFAULT'],
    ['discovery', 'New on Hook', 'New arrivals, markets and offers', 'LOW'],
  ];
  await Promise.all(groups.map(([id, name, description, level]) =>
    Notifications.setNotificationChannelAsync(id, {
      name,
      description,
      importance: Notifications.AndroidImportance[level],
      lightColor: '#FFC809',
    }),
  ));
}

/** The EAS project the token belongs to. Explicit, so it never depends on config being inlined. */
function easProjectId() {
  return (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
    ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

export async function registerPushToken(options: { sendWelcome?: boolean } = {}) {
  try {
    if (!Device.isDevice) { devNote('Push tokens are only issued to a physical device, not a simulator or emulator.'); return null; }
    const Notifications = getNotifications();
    if (!Notifications) return null;
    await ensureAndroidChannel(Notifications);
    const permission = await Notifications.getPermissionsAsync();
    let status = permission.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') { devNote('Notification permission was not granted. Enable it in the phone settings.'); return null; }

    const projectId = easProjectId();
    if (!projectId) devNote('No EAS projectId found in app.json (extra.eas.projectId); the push token may fail.');
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const session = await getSession();
    if (!session?.accessToken) { devNote('Not signed in yet, so the push token was not registered.'); return null; }

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
    if (__DEV__) console.info(`[push] Registered ${token.data}`);
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
