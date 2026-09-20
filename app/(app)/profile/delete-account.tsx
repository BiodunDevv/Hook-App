import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HookBackButton } from '@/components/shared/HookBackButton';
import { HookLoader } from '@/components/shared/HookLoader';
import { toast } from '@/components/shared/toast';
import { screenPadding } from '@/constants/design-tokens';
import { ApiError } from '@/lib/api';
import { requestAccountDeletion, sendAccountDeletionCode, type DeletionView } from '@/lib/account-deletion-api';
import { logout } from '@/lib/auth-api';
import { unregisterPushToken } from '@/lib/push';
import { clearSession, getSession } from '@/lib/session';

const DAYS = 14;

/**
 * In-app account deletion (required by Google Play). Re-asks for the password,
 * or an emailed code for Google/Apple accounts, then schedules deletion with a
 * cancel-anytime window. The customer is signed out straight away.
 */
export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const [useCode, setUseCode] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<DeletionView | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const proofReady = useCode ? /^\d{6}$/.test(code) : password.length > 0;
  const canSubmit = confirmed && proofReady && !busy;

  async function sendCode() {
    try {
      await sendAccountDeletionCode();
      setCodeSent(true);
      setCooldown(60);
      toast.success('Code sent', 'Check your email for a 6-digit code.');
    } catch (error) {
      toast.error('Could not send the code', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setBlocked(null);
    try {
      const view = await requestAccountDeletion({ ...(useCode ? { code } : { password }), reason: reason.trim() || undefined });
      setScheduled(view);
      // The server has already ended every session; clear this device too.
      const session = await getSession();
      await Promise.allSettled([session ? logout(session.refreshToken) : Promise.resolve(), unregisterPushToken()]);
      await clearSession();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACCOUNT_DELETION_BLOCKED') setBlocked(error.message);
      else if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') toast.error('That did not match', useCode ? 'Check the code and try again.' : 'Check your password and try again.');
      else toast.error('Could not request deletion', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (scheduled) {
    const date = scheduled.scheduledFor ? new Date(scheduled.scheduledFor).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F5F5] px-8" style={{ paddingTop: insets.top }}>
        <View className="h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7]"><Ionicons name="checkmark" size={34} color="#15803D" /></View>
        <Text className="mt-5 text-center text-xl font-black">Deletion scheduled</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-[#555]">
          Your account will be permanently deleted on {date}. You have been signed out. Changed your mind? Sign in before then and choose “Restore my account”.
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)')} className="mt-8 h-[52px] w-full items-center justify-center rounded-full bg-hook">
          <Text className="font-black">Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F5F5F5]" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: screenPadding, paddingBottom: 48 }}>
      <View className="flex-row items-center"><HookBackButton /><Text className="ml-4 text-xl font-black">Delete account</Text></View>

      <View className="mt-6 rounded-[14px] bg-white p-4">
        <Text className="text-base font-black">What happens</Text>
        <Text className="mt-2 text-sm leading-5 text-[#555]">
          Your account is closed now and you are signed out on every device. After {DAYS} days your name, email, phone number, saved addresses and Hook credit balance are permanently deleted. You can restore your account any time before then.
        </Text>
        <Text className="mt-3 text-sm leading-5 text-[#555]">
          We keep order and payment records the law requires, with your identity removed. Orders still being delivered, or refunds still being processed, must finish first.
        </Text>
      </View>

      <View className="mt-4 rounded-[14px] bg-white p-4">
        <Text className="text-base font-black">Confirm it is you</Text>
        {useCode ? (
          <>
            <View className="mt-4 flex-row gap-2">
              <TextInput keyboardType="number-pad" maxLength={6} placeholder="6-digit code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ''))} className="h-[52px] flex-1 rounded-[12px] bg-[#F5F5F5] px-4" />
              <Pressable disabled={cooldown > 0} onPress={() => void sendCode()} className="h-[52px] items-center justify-center rounded-[12px] bg-[#EAEBE7] px-4 disabled:opacity-50">
                <Text className="font-bold">{cooldown > 0 ? `${cooldown}s` : codeSent ? 'Resend' : 'Send code'}</Text>
              </Pressable>
            </View>
            <Text className="mt-2 text-xs text-[#777]">We email a code to your Hook account address.</Text>
          </>
        ) : (
          <TextInput secureTextEntry placeholder="Your password" value={password} onChangeText={setPassword} autoCapitalize="none" className="mt-4 h-[52px] rounded-[12px] bg-[#F5F5F5] px-4" />
        )}
        <Pressable onPress={() => { setUseCode((value) => !value); setPassword(''); setCode(''); }} className="mt-3">
          <Text className="text-[13px] font-bold text-[#9A7600]">{useCode ? 'Use my password instead' : 'I signed in with Google or Apple'}</Text>
        </Pressable>
        <TextInput placeholder="Why are you leaving? (optional)" value={reason} onChangeText={setReason} maxLength={1000} multiline className="mt-4 min-h-[52px] rounded-[12px] bg-[#F5F5F5] px-4 py-3" />
      </View>

      <Pressable onPress={() => setConfirmed((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} className="mt-4 flex-row items-start rounded-[14px] bg-white p-4">
        <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={22} color={confirmed ? '#111' : '#999'} />
        <Text className="ml-3 flex-1 text-sm leading-5">I understand my account will be permanently deleted after {DAYS} days and any Hook credit balance will be lost.</Text>
      </Pressable>

      {blocked ? (
        <View className="mt-4 rounded-[14px] bg-[#FEF2F2] p-4"><Text className="text-sm leading-5 text-[#B91C1C]">{blocked}</Text></View>
      ) : null}

      <Pressable disabled={!canSubmit} onPress={() => void submit()} className="mt-5 h-[52px] items-center justify-center rounded-full bg-[#DC2626] disabled:opacity-40">
        {busy ? <HookLoader size="button" variant="dark" /> : <Text className="font-black text-white">Delete my account</Text>}
      </Pressable>
    </ScrollView>
  );
}
