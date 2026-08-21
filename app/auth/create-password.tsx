import { useLocalSearchParams } from 'expo-router';

import { CreatePassword } from '@/components/auth/create-password';

export default function CreatePasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  return (
    <>
      <CreatePassword email={email ?? ''} />
    </>
  );
}
