import { Alert, Linking } from 'react-native';
import { ApiError, apiRequest } from '@/lib/api';

export type DeletionView = {
  state: 'none' | 'scheduled' | 'erasing';
  scheduledFor?: string;
  canCancel: boolean;
  alreadyRequested?: boolean;
};

/** The public page where deletion can be requested or cancelled without the app. */
export const DELETE_ACCOUNT_PAGE_URL = process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL || 'https://hook-africa.vercel.app/delete-account';

/** Deleting an account happens on the web page, not inside the app. */
export function openDeleteAccountPage() {
  return Linking.openURL(DELETE_ACCOUNT_PAGE_URL);
}

/** Cancels a scheduled deletion. Works while signed out, since the account cannot sign in until restored. */
export function restoreDeletedAccount(input: { email: string; password: string }) {
  return apiRequest<DeletionView>('/public/account-deletion/cancel', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** The formatted deletion date when sign-in was refused because deletion is scheduled, otherwise undefined. */
export function scheduledDeletionDate(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.code !== 'ACCOUNT_DELETION_SCHEDULED') return undefined;
  const iso = (error.data as { scheduledFor?: string } | undefined)?.scheduledFor;
  return iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : 'the scheduled date';
}

/**
 * Explains a scheduled deletion to someone who just tried to sign in and offers
 * the way back: restoring directly (password accounts) or the web page
 * (Google/Apple accounts, which need an emailed code).
 */
export function promptScheduledDeletion(date: string, options: { onRestore?: () => Promise<void> }) {
  const buttons: Parameters<typeof Alert.alert>[2] = [{ text: 'Not now', style: 'cancel' }];
  if (options.onRestore) {
    buttons.push({ text: 'Restore my account', onPress: () => void options.onRestore?.() });
  } else if (DELETE_ACCOUNT_PAGE_URL) {
    buttons.push({ text: 'Open restore page', onPress: () => void Linking.openURL(DELETE_ACCOUNT_PAGE_URL) });
  }
  Alert.alert(
    'Account scheduled for deletion',
    `Your account will be permanently deleted on ${date}. You can still change your mind${options.onRestore ? '' : ' from the account deletion page'}.`,
    buttons,
  );
}
