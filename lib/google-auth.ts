import { useEffect, useState } from 'react';

import { toast } from '@/components/shared/toast';
import { ApiError } from '@/lib/api';
import { promptScheduledDeletion, scheduledDeletionDate } from '@/lib/account-deletion-api';
import { useGoogleLoginMutation } from '@/lib/auth-api';
import { registerPushToken } from '@/lib/push';
import { saveSession } from '@/lib/session';
import { syncAnonymousCommerce } from '@/lib/commerce-sync';

/**
 * The native SDK issues ID tokens whose audience is the Web client ID, so it is
 * required even though sign-in happens on iOS/Android. iosClientId lets the
 * native iOS flow pick the right client without reading GoogleService-Info.
 */
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Requiring the native module throws if it isn't compiled into the running
// binary (Expo Go, or a dev-client build made before this package was added).
// Load it lazily so importing this file never crashes the app — only an
// actual sign-in attempt on an unsupported build does.
type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
let googleSigninModule: GoogleSigninModule | null = null;
try {
  googleSigninModule = require('@react-native-google-signin/google-signin');
} catch {
  // Expo Go and older development builds do not contain this native module.
  // Keep Google sign-in unavailable without raising a LogBox warning.
}

const isNativeModuleAvailable = Boolean(googleSigninModule);
const isConfigured = Boolean(webClientId) && isNativeModuleAvailable;

if (isConfigured && googleSigninModule) {
  googleSigninModule.GoogleSignin.configure({
    webClientId,
    iosClientId,
    scopes: ['openid', 'profile', 'email'],
    offlineAccess: false,
  });
}

export function useHookGoogleAuth() {
  const googleLogin = useGoogleLoginMutation();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Only a genuinely missing client id is worth reporting here; a missing
    // native module is already reported once at module load.
    if (isNativeModuleAvailable && !webClientId) {
      console.warn(
        '[google-auth] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set — Google sign-in is disabled.',
      );
    }
  }, []);

  const isLoading = isSigningIn || googleLogin.isPending;

  async function signInWithGoogle() {
    if (!isConfigured || !googleSigninModule || isLoading) return;
    const { GoogleSignin, isErrorWithCode, statusCodes } = googleSigninModule;
    setIsSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => undefined);
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return;

      const idToken = response.data.idToken;
      if (!idToken) {
        toast.error('Google sign-in could not be completed', 'Please try again.');
        return;
      }

      const session = await googleLogin.mutateAsync({ idToken });
      await saveSession(session);
      await Promise.allSettled([syncAnonymousCommerce(), registerPushToken({ sendWelcome: true })]);
      toast.success('Welcome to Hook', 'Google sign-in completed.');
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return;
      const deletionDate = scheduledDeletionDate(error);
      if (deletionDate) {
        promptScheduledDeletion(deletionDate, {});
        return;
      }
      if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        toast.error('Google Play Services unavailable', 'Update Google Play Services and try again.');
        return;
      }
      if (error instanceof ApiError && error.status === 0) {
        toast.error('Server unavailable', 'Please check your connection and try again.');
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        toast.error(
          'Google sign-in could not be verified',
          'Hook could not verify this Google account. Please try again or use email sign-in.',
        );
        return;
      }
      toast.error(
        'Google sign-in failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  return {
    isGoogleReady: isConfigured,
    isGoogleLoading: isLoading,
    signInWithGoogle,
  };
}
