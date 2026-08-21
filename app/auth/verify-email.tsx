import { useLocalSearchParams } from 'expo-router';

import { VerifyEmail } from '@/components/auth/verify-email';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  return (
    <>
      <VerifyEmail email={email ?? ''} />
    </>
  );
}
