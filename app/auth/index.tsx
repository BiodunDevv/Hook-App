import { useGuestOnly } from "@/hooks/use-guest-only";
import { Redirect } from "expo-router";

export default function AuthScreen() {
  useGuestOnly();
  return <Redirect href="/(tabs)" />;
}
