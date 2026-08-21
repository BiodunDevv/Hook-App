import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthPrimaryButton, AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { useAuthSheet } from '@/components/auth/AuthSheetProvider';
import { toast } from '@/components/shared/toast';
import { useLoginMutation } from '@/lib/auth-api';
import { registerPushToken } from '@/lib/push';
import { saveSession } from '@/lib/session';

const MIN_LENGTH = 9;

export function PasswordLogin() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const login = useLoginMutation();
  const { hasPendingIntent } = useAuthSheet();
  const inputRef = useRef<TextInput>(null);

  const isValid = password.length >= MIN_LENGTH;
  const hasError = touched && !isValid;
  const loading = login.isPending;

  async function handleContinue() {
    setTouched(true);
    if (!isValid) return;
    try {
      const shouldResume = hasPendingIntent();
      const session = await login.mutateAsync({ email, password });
      await saveSession(session);
      await registerPushToken({ sendWelcome: true });
      toast.success('Welcome back', 'You are signed in');
      if (!shouldResume) router.replace('/(tabs)');
    } catch (error) {
      toast.error('Could not sign in', error instanceof Error ? error.message : 'Please check your password.');
    }
  }

  return (
    <AuthScreenShell
      title="Password"
      description="Login your password">
      <View className="gap-2.5">
        <View
          className={`h-[50px] flex-row items-center rounded-full border-[1.3px] bg-white px-4 ${
            hasError ? 'border-[#ef4444]' : 'border-[#90a1b9]'
          }`}>
          <TextInput
            ref={inputRef}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-sm text-black"
            placeholder="Password"
            placeholderTextColor="rgba(0,0,0,0.35)"
            returnKeyType="done"
            secureTextEntry={!visible}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (touched && value.length >= MIN_LENGTH) setTouched(false);
            }}
            onSubmitEditing={handleContinue}
          />
          <Pressable
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            hitSlop={8}
            onPress={() => setVisible((value) => !value)}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#90a1b9" />
          </Pressable>
        </View>

        <Text className={`text-sm ${hasError ? 'text-[#ef4444]' : 'text-hook-text'}`}>
          Must contain at least {MIN_LENGTH} characters
        </Text>

        <Pressable
          accessibilityRole="button"
          className="self-center py-3"
          onPress={() => router.push({ pathname: '/auth/forgot-password', params: { email } })}>
          <Text className="text-sm font-medium text-black">Forgot password?</Text>
        </Pressable>

        <View className="pt-1">
          <AuthPrimaryButton disabled={!isValid || loading} loading={loading} label="continue" onPress={handleContinue} />
        </View>
      </View>
    </AuthScreenShell>
  );
}
