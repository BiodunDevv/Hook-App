import { useGuestOnly } from "@/hooks/use-guest-only";
import { ResetCode } from '@/components/auth/reset-code';

export default function ResetCodeScreen() {
  useGuestOnly();
  return (
    <>
      <ResetCode />
    </>
  );
}
