import { useGuestOnly } from "@/hooks/use-guest-only";
import { useLocalSearchParams } from 'expo-router';

import { VerifyEmail } from '@/components/auth/verify-email';

export default function VerifyEmailScreen() {
  useGuestOnly();
  const { email } = useLocalSearchParams<{ email: string }>();
  return (
    <>
      <VerifyEmail email={email ?? ''} />
    </>
  );
}
