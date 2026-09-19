import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthPrimaryButton, AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { toast } from '@/components/shared/toast';
import { useResetPasswordMutation } from '@/lib/auth-api';
import { registerPushToken } from '@/lib/push';
import { saveSession } from '@/lib/session';

import { PASSWORD_MIN_LENGTH as MIN_LENGTH } from '@/lib/password-policy';

export function CreateNewPassword() {
  const { email = '', code = '' } = useLocalSearchParams<{ email?: string; code?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const resetPassword = useResetPasswordMutation();

  const hasMinLength = password.length >= MIN_LENGTH;
  const passwordsMatch = password === confirmPassword;
  const isValid = hasMinLength && passwordsMatch;
  const showLengthError = submitted && !hasMinLength;
  const showMatchError = submitted && hasMinLength && !passwordsMatch;
  const loading = resetPassword.isPending;

  async function handleContinue() {
    setSubmitted(true);
    if (!isValid) {
      toast.error('Check your password', 'Make sure both passwords match and meet the minimum length.');
      return;
    }
    try {
      const session = await resetPassword.mutateAsync({ email, code, password });
      if (session?.accessToken) {
        await saveSession(session);
        await registerPushToken({ sendWelcome: true });
      }
      toast.success('Password reset', 'Welcome back to Hook');
      router.replace('/(tabs)');
    } catch (error) {
      toast.error('Could not reset password', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <AuthScreenShell
      title="Create New Password"
      description="Your new password must be different from previously used passwords">
      <View className="gap-2.5">
        <PasswordField
          placeholder="Enter new password"
          value={password}
          visible={visible}
          onChangeText={setPassword}
          onToggleVisible={() => setVisible((value) => !value)}
        />
        <PasswordField
          placeholder="Confirm new password"
          value={confirmPassword}
          visible={confirmVisible}
          onChangeText={setConfirmPassword}
          onToggleVisible={() => setConfirmVisible((value) => !value)}
        />
        <Text
          className={`text-sm ${
            showLengthError || showMatchError
              ? 'text-[#ef4444]'
              : isValid
                ? 'text-green-600'
                : 'text-hook-text'
          }`}>
          {showLengthError
            ? `Password must contain at least ${MIN_LENGTH} characters`
            : showMatchError
              ? 'Passwords do not match'
              : isValid
                ? 'Password looks good'
                : `Must contain at least ${MIN_LENGTH} characters and match`}
        </Text>
        <View className="pt-1">
          <AuthPrimaryButton disabled={!isValid || loading} loading={loading} label="Reset Password" onPress={handleContinue} />
        </View>
      </View>
    </AuthScreenShell>
  );
}

function PasswordField({
  onChangeText,
  onToggleVisible,
  placeholder,
  value,
  visible,
}: {
  onChangeText: (value: string) => void;
  onToggleVisible: () => void;
  placeholder: string;
  value: string;
  visible: boolean;
}) {
  return (
    <View className="h-[50px] flex-row items-center rounded-full border-[1.3px] border-[#90a1b9] bg-white px-4">
      <Ionicons name="lock-closed" size={17} color="#8b8b8b" />
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        className="ml-3 flex-1 text-sm text-black"
        placeholder={placeholder}
        placeholderTextColor="rgba(0,0,0,0.35)"
        secureTextEntry={!visible}
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable accessibilityLabel={visible ? 'Hide password' : 'Show password'} hitSlop={8} onPress={onToggleVisible}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#90a1b9" />
      </Pressable>
    </View>
  );
}
