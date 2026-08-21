import { useLocalSearchParams } from 'expo-router';

import { EnterName } from '@/components/auth/enter-name';

export default function EnterNameScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  return (
    <>
      <EnterName email={email ?? ''} />
    </>
  );
}
