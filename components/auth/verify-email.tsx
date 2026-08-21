import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import chatIcon from "@/assets/images/auth/chat-icon.png";
import { AuthBackButton } from "@/components/auth/auth-screen-shell";
import { AuthGlowBackground } from "@/components/shared/glow-background";
import { HookLoader } from "@/components/shared/HookLoader";
import { toast } from "@/components/shared/toast";
import { ApiError } from "@/lib/api";
import {
  useResendSignupCodeMutation,
  useVerifySignupMutation,
} from "@/lib/auth-api";
import {
  clearPendingSignup,
  getPendingSignup,
  savePendingSignup,
} from "@/lib/session";

const RESEND_SECONDS = 28;

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}**@${domain}`;
}

export function VerifyEmail({ email }: { email: string }) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const verifySignup = useVerifySignupMutation();
  const resendSignupCode = useResendSignupCodeMutation();
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Countdown timer
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

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
      setStatus("idle");
      const nextEmptyIndex = next.findIndex((digit) => !digit);
      if (nextEmptyIndex >= 0) {
        refs[nextEmptyIndex].current?.focus();
      } else {
        refs[3].current?.blur();
        setTimeout(() => verify(next.join(""), next), 0);
      }
      return;
    }

    const char = clean.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setStatus("idle");

    if (char && index < 3) {
      refs[index + 1].current?.focus();
    }

    // Auto-verify when all 4 filled
    if (char && index === 3) {
      const code = [...next.slice(0, 3), char].join("");
      verify(code, next);
    } else if (char) {
      const code = next.join("");
      if (code.length === 4) verify(code, next);
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  function resetCodeInputs() {
    setDigits(["", "", "", ""]);
    requestAnimationFrame(() => refs[0].current?.focus());
  }

  async function recoverToAuthStart(title: string, message: string) {
    await clearPendingSignup();
    toast.error(title, message);
    router.replace("/auth");
  }

  async function verify(code: string, currentDigits: string[]) {
    const normalizedCode = code.replace(/[^0-9]/g, "").slice(0, 4);
    if (normalizedCode.length !== 4) return;
    if (verifySignup.isPending) return;
    const pending = await getPendingSignup();
    if (!pending?.signupSessionToken) {
      await recoverToAuthStart("Signup session expired", "Please start again.");
      return;
    }
    try {
      await verifySignup.mutateAsync({
        signupSessionToken: pending.signupSessionToken,
        code: normalizedCode,
      });
      setStatus("success");
      await savePendingSignup({ ...pending, step: "complete_profile" });
      router.push({ pathname: "/auth/enter-name", params: { email } });
    } catch (error) {
      setStatus("error");
      resetCodeInputs();
      if (error instanceof ApiError && error.status === 0) {
        await recoverToAuthStart(
          "Server unavailable",
          "Please check your connection and start again.",
        );
        return;
      }
      const message =
        error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("signup session expired")) {
        await recoverToAuthStart(
          "Signup session expired",
          "Please start again.",
        );
        return;
      }
      if (currentDigits.every((d) => d !== "")) {
        toast.error("Invalid code", message);
      }
    }
  }

  async function handleResend() {
    if (seconds > 0 || resendSignupCode.isPending) return;
    const pending = await getPendingSignup();
    if (!pending?.signupSessionToken) {
      await recoverToAuthStart("Signup session expired", "Please start again.");
      return;
    }
    try {
      await resendSignupCode.mutateAsync(pending.signupSessionToken);
      setDigits(["", "", "", ""]);
      setStatus("idle");
      setSeconds(RESEND_SECONDS);
      refs[0].current?.focus();
      toast.success("Code resent", "Check your email for the new code.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        await recoverToAuthStart(
          "Server unavailable",
          "Please check your connection and start again.",
        );
        return;
      }
      const message =
        error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("signup session expired")) {
        await recoverToAuthStart(
          "Signup session expired",
          "Please start again.",
        );
        return;
      }
      toast.error(
        "Could not resend code",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  const dotColor =
    status === "error"
      ? "rgba(255,89,0,0.33)"
      : status === "success"
        ? "rgba(0,255,77,0.42)"
        : "rgba(255,200,9,0.2)";

  const borderColor = status === "error" ? "#ef4444" : "#373737";

  return (
    <View className="flex-1 bg-white">
      <AuthGlowBackground />
      {/* Back button */}
      <View className="px-4" style={{ paddingTop: insets.top + 8 }}>
        <AuthBackButton />
      </View>

      <View className="px-4 pt-[45px]">
        {/* Icon + progress dots */}
        <Image
          source={chatIcon}
          resizeMode="contain"
          style={{ width: 49, height: 48 }}
        />
        <View className="mt-[19px] flex-row gap-[9px]">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                backgroundColor: dotColor,
                borderRadius: 10,
                height: 8,
                width: 25,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 2,
              }}
            />
          ))}
        </View>

        {/* Heading */}
        <View className="mt-[34px] gap-1.5">
          <Text className="text-[28px] font-bold text-black">
            Verify E-mail
          </Text>
          <Text className="text-base text-hook-text">
            Insert the 4-digit code that we sent to {maskEmail(email)}
          </Text>
        </View>

        {/* OTP boxes */}
        <View className="mt-[34px] gap-3">
          <View className="flex-row gap-[9px]">
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                autoComplete="sms-otp"
                className="h-[50px] w-[50px] rounded-[6.6px] text-center text-base font-medium text-black"
                style={{ borderWidth: 1.3, borderColor }}
                keyboardType="number-pad"
                maxLength={4}
                textContentType="oneTimeCode"
                value={digit}
                onChangeText={(v) => handleDigit(i, v)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(i, nativeEvent.key)
                }
                selectTextOnFocus
              />
            ))}
          </View>

          {status === "error" && (
            <Text className="text-sm text-[#ef4444]">
              Invalid code. Please try again.
            </Text>
          )}

          <Pressable
            onPress={handleResend}
            disabled={seconds > 0 || resendSignupCode.isPending}
          >
            {resendSignupCode.isPending ? (
              <HookLoader size="button" variant="yellow" />
            ) : (
              <Text
                className={`text-sm ${seconds > 0 ? "text-hook-text" : "text-black font-medium"}`}
              >
                {seconds > 0
                  ? `Resend code in 00:${String(seconds).padStart(2, "0")}`
                  : "Resend code"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
