import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { toast } from '@/components/shared/toast';
import { ApiError } from '@/lib/api';
import { useGoogleLoginMutation } from '@/lib/auth-api';
import { registerPushToken } from '@/lib/push';
import { saveSession } from '@/lib/session';
import { syncAnonymousCommerce } from '@/lib/commerce-sync';

WebBrowser.maybeCompleteAuthSession();

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const iosRedirectUri = 'com.googleusercontent.apps.970939309798-beud2kvciukbrbpau74oosnmlf97de2r:/oauthredirect';
const androidRedirectUri = 'com.biodun42.hook:/oauthredirect';
const redirectUri = Platform.select({
  ios: iosRedirectUri,
  android: androidRedirectUri,
});

export function useHookGoogleAuth() {
  const googleLogin = useGoogleLoginMutation();
  const handledTokenRef = useRef<string | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const isLoading = isPrompting || googleLogin.isPending;

  useEffect(() => {
    async function completeGoogleLogin(idToken: string) {
      if (handledTokenRef.current === idToken) return;
      handledTokenRef.current = idToken;
      try {
        const session = await googleLogin.mutateAsync({ idToken });
        await saveSession(session);
        await Promise.allSettled([syncAnonymousCommerce(), registerPushToken({ sendWelcome: true })]);
        toast.success('Welcome to Hook', 'Google sign-in completed.');
      } catch (error) {
        handledTokenRef.current = null;
        if (error instanceof ApiError && error.status === 0) {
          toast.error('Server unavailable', 'Please check your connection and try again.');
          return;
        }
        toast.error(
          'Google sign-in failed',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setIsPrompting(false);
      }
    }

    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) {
        setIsPrompting(false);
        toast.error('Google sign-in could not be completed', 'Please try again.');
        return;
      }
      void completeGoogleLogin(idToken);
      return;
    }
    if (response.type === 'cancel' || response.type === 'dismiss') {
      setIsPrompting(false);
      return;
    }
    if (response.type === 'error') {
      setIsPrompting(false);
      toast.error('Google sign-in failed', response.error?.message || 'Please try again.');
    }
  }, [googleLogin, response]);

  async function signInWithGoogle() {
    if (!request || isLoading) return;
    setIsPrompting(true);
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setIsPrompting(false);
      }
    } catch (error) {
      setIsPrompting(false);
      toast.error(
        'Google sign-in failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  return {
    isGoogleReady: !!request,
    isGoogleLoading: isLoading,
    signInWithGoogle,
  };
}
