import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import chatIcon from "@/assets/images/auth/chat-icon.png";
import { AuthBackButton } from "@/components/auth/auth-screen-shell";
import { AuthGlowBackground } from "@/components/shared/glow-background";
import { HookLoader } from "@/components/shared/HookLoader";
import { toast } from "@/components/shared/toast";
import { useStartSignupMutation } from "@/lib/auth-api";
import { savePendingSignup } from "@/lib/session";

import { PASSWORD_MIN_LENGTH as MIN_LENGTH } from '@/lib/password-policy';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreatePassword({ email }: { email: string }) {
  const insets = useSafeAreaInsets();
  const normalizedEmail = email.trim().toLowerCase();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const startSignup = useStartSignupMutation();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const hasError = touched && password.length < MIN_LENGTH;
  const isValid = password.length >= MIN_LENGTH;
  const loading = startSignup.isPending;

  async function handleContinue() {
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error(
        "Email required",
        "Start with your email before creating a password.",
      );
      router.replace("/auth");
      return;
    }
    setTouched(true);
    if (!isValid) return;
    try {
      const result = await startSignup.mutateAsync({
        email: normalizedEmail,
        password,
      });
      await savePendingSignup({
        email: normalizedEmail,
        signupSessionToken: result.signupSessionToken,
        step: "verify_email",
      });
      toast.success("Code sent", "Check your email for the verification code.");
      router.push({
        pathname: "/auth/verify-email",
        params: { email: normalizedEmail },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("already exists")) {
        toast.info("Account found", "Sign in with your password to continue.");
        router.replace({
          pathname: "/auth/password",
          params: { email: normalizedEmail },
        });
        return;
      }
      toast.error(
        "Could not start signup",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  function handleFocus() {
    setTimeout(
      () => scrollRef.current?.scrollTo({ y: 200, animated: true }),
      100,
    );
  }

  return (
    <View className="flex-1 bg-white">
      <AuthGlowBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Back button */}
          <View className="px-4" style={{ paddingTop: insets.top + 8 }}>
            <AuthBackButton />
          </View>

          {/* Content */}
          <View className="flex-1 px-4 pb-4 pt-[34px]">
            <Image source={chatIcon} resizeMode="contain" />

            {/* Heading */}
            <View className="mt-[34px] gap-1.5">
              <Text className="text-[28px] font-bold leading-9 text-black">
                Create a password
              </Text>
              <Text className="text-base leading-[22px] text-hook-text">
                Add a way to protect your account{" "}
                <Text className="font-medium text-[#121212]">
                  {normalizedEmail}
                </Text>
              </Text>
            </View>

            {/* Input group */}
            <View className="mt-[34px] gap-2.5">
              {/* Password field */}
              <View
                className={`h-[50px] flex-row items-center rounded-[6.6px] border-[1.3px] bg-white px-4 ${
                  hasError ? "border-[#ef4444]" : "border-[#90a1b9]"
                }`}
              >
                <TextInput
                  ref={inputRef}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-sm text-black"
                  placeholder="Password"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  secureTextEntry={!visible}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (touched && v.length >= MIN_LENGTH) setTouched(false);
                  }}
                  onFocus={handleFocus}
                  onSubmitEditing={handleContinue}
                  returnKeyType="done"
                />
                <Pressable
                  accessibilityLabel={
                    visible ? "Hide password" : "Show password"
                  }
                  hitSlop={8}
                  onPress={() => setVisible((v) => !v)}
                >
                  <Ionicons
                    name={visible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#90a1b9"
                  />
                </Pressable>
              </View>

              <Text
                className={`text-sm ${
                  hasError
                    ? "text-[#ef4444]"
                    : isValid
                      ? "text-green-500"
                      : "text-hook-text"
                }`}
              >
                {hasError
                  ? `Must be at least ${MIN_LENGTH} characters`
                  : isValid
                    ? "✓ Password looks good"
                    : `Must contain at least ${MIN_LENGTH} characters`}
              </Text>
            </View>

            <View className="mt-5">
              <Pressable
                accessibilityRole="button"
                className={`h-[52px] items-center justify-center rounded-full ${
                  isValid || loading ? "bg-hook" : "bg-[rgba(20,19,15,0.5)]"
                }`}
                disabled={!isValid || loading}
                onPress={handleContinue}
              >
                {loading ? (
                  <HookLoader size="button" variant="dark" />
                ) : (
                  <Text
                    className={`text-sm font-medium ${isValid ? "text-black" : "text-white"}`}
                  >
                    continue
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
