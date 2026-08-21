import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { toast } from '@/components/shared/toast';
import { appleLogin } from '@/lib/auth-api';
import { syncAnonymousCommerce } from '@/lib/commerce-sync';
import { registerPushToken } from '@/lib/push';
import { saveSession } from '@/lib/session';

export function useHookAppleAuth() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  async function signInWithApple() {
    if (!available || loading) return false;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token');
      const session = await appleLogin({
        identityToken: credential.identityToken,
        firstName: credential.fullName?.givenName || undefined,
        lastName: credential.fullName?.familyName || undefined,
      });
      await saveSession(session);
      await Promise.allSettled([syncAnonymousCommerce(), registerPushToken({ sendWelcome: true })]);
      toast.success('Welcome to Hook', 'Apple sign-in completed.');
      return true;
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        toast.error('Apple sign-in failed', error instanceof Error ? error.message : 'Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { isAppleReady: available, isAppleLoading: loading, signInWithApple };
}
