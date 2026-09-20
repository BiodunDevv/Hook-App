import { useGuestOnly } from "@/hooks/use-guest-only";
import { PasswordLogin } from '@/components/auth/password-login';

export default function PasswordScreen() {
  useGuestOnly();
  return (
    <>
      <PasswordLogin />
    </>
  );
}
