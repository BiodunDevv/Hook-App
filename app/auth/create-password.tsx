import { useGuestOnly } from "@/hooks/use-guest-only";
import { useLocalSearchParams } from 'expo-router';

import { CreatePassword } from '@/components/auth/create-password';

export default function CreatePasswordScreen() {
  useGuestOnly();
  const { email } = useLocalSearchParams<{ email: string }>();
  return (
    <>
      <CreatePassword email={email ?? ''} />
    </>
  );
}
