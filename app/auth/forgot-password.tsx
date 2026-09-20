import { useGuestOnly } from "@/hooks/use-guest-only";
import { ForgotPassword } from '@/components/auth/forgot-password';

export default function ForgotPasswordScreen() {
  useGuestOnly();
  return (
    <>
      <ForgotPassword />
    </>
  );
}
