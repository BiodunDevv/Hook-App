import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthBackButton } from "@/components/auth/auth-screen-shell";

import chatIcon from "@/assets/images/auth/chat-icon.png";
import { AuthGlowBackground } from "@/components/shared/glow-background";
import { HookLoader } from "@/components/shared/HookLoader";
import { toast } from "@/components/shared/toast";
import {
  useForgotPasswordMutation,
  useVerifyPasswordResetMutation,
} from "@/lib/auth-api";

const RESEND_SECONDS = 28;

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}**@${domain}`;
}

export function ResetCode() {
  const insets = useSafeAreaInsets();
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const verifyPasswordReset = useVerifyPasswordResetMutation();
  const forgotPassword = useForgotPasswordMutation();
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function verify(nextDigits: string[]) {
    const code = nextDigits.join("");
    if (code.length < 4) return;
    if (verifyPasswordReset.isPending) return;
    try {
      await verifyPasswordReset.mutateAsync({ email, code });
      router.push({
        pathname: "/auth/create-new-password",
        params: { email, code },
      });
    } catch (error) {
      setError(true);
      toast.error(
        "Invalid code",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  function handleDigit(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "");
    if (clean.length > 1) {
      const next =
        clean.length >= 4 ? clean.slice(0, 4).split("") : [...digits];
      if (clean.length < 4) {
        clean
          .slice(0, 4 - index)
          .split("")
          .forEach((char, offset) => {
            next[index + offset] = char;
          });
      }
      setDigits(next);
      setError(false);
      const nextEmptyIndex = next.findIndex((digit) => !digit);
      if (nextEmptyIndex >= 0) {
        refs[nextEmptyIndex].current?.focus();
      } else {
        refs[3].current?.blur();
        setTimeout(() => verify(next), 0);
      }
      return;
    }

    const char = clean.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(false);
    if (char && index < 3) refs[index + 1].current?.focus();
    verify(next);
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  async function handleResend() {
    if (seconds > 0 || forgotPassword.isPending) return;
    try {
      await forgotPassword.mutateAsync(email);
      setDigits(["", "", "", ""]);
      setError(false);
      setSeconds(RESEND_SECONDS);
      refs[0].current?.focus();
      toast.success("Code resent", "Check your email for the new reset code.");
    } catch (error) {
      toast.error(
        "Could not resend code",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return (
    <View className="flex-1 bg-white">
      <AuthGlowBackground />

      <View className="px-4" style={{ paddingTop: insets.top + 8 }}>
        <AuthBackButton />
      </View>

      <View className="px-4 pt-[45px]">
        <Image
          source={chatIcon}
          resizeMode="contain"
          style={{ height: 49, width: 49 }}
        />

        <View className="mt-[34px] gap-1.5">
          <Text className="text-[28px] font-bold leading-8 text-black">
            Enter Verification{"\n"}Code
          </Text>
          <Text className="text-base leading-[22px] text-hook-text">
            We&apos;ve sent 4-digit code to {maskEmail(email)}
          </Text>
        </View>

        <View className="mt-[24px] flex-row gap-[9px]">
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={refs[index]}
              autoComplete="sms-otp"
              className="h-[50px] w-[50px] rounded-[6.6px] text-center text-base font-medium text-black"
              keyboardType="number-pad"
              maxLength={4}
              selectTextOnFocus
              style={{
                borderColor: error ? "#ef4444" : digit ? "#FFC809" : "#373737",
                borderWidth: 1.3,
              }}
              textContentType="oneTimeCode"
              value={digit}
              onChangeText={(value) => handleDigit(index, value)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(index, nativeEvent.key)
              }
            />
          ))}
        </View>

        <View className="mt-2 flex-row items-center gap-1">
          <Text className="text-sm text-hook-text">
            Didn&apos;t receive a code?
          </Text>
          <Pressable
            disabled={seconds > 0 || forgotPassword.isPending}
            onPress={handleResend}
          >
            {forgotPassword.isPending ? (
              <HookLoader size="button" variant="yellow" />
            ) : (
              <Text
                className={`text-sm font-medium ${seconds > 0 ? "text-hook-text" : "text-hook"}`}
              >
                {seconds > 0
                  ? `Resend in 00:${String(seconds).padStart(2, "0")}`
                  : "Resend"}
              </Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <Text className="mt-2 text-sm text-[#ef4444]">
            Invalid or expired code. Please try again.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
