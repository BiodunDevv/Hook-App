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
import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { AuthGlowBackground } from "@/components/shared/glow-background";
import { HookLoader } from "@/components/shared/HookLoader";
import { toast } from "@/components/shared/toast";
import { useCompleteSignupMutation } from "@/lib/auth-api";
import { registerPushToken } from "@/lib/push";
import {
  clearPendingSignup,
  getPendingSignup,
  saveSession,
} from "@/lib/session";

export function EnterName({ email }: { email: string }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const completeSignup = useCompleteSignupMutation();
  const { hasPendingIntent } = useAuthSheet();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const isValid = name.trim().length >= 2;
  const loading = completeSignup.isPending;

  function handleFocus() {
    setTimeout(
      () => scrollRef.current?.scrollTo({ y: 200, animated: true }),
      100,
    );
  }

  async function handleContinue() {
    if (!isValid) return;
    const pending = await getPendingSignup();
    if (!pending?.signupSessionToken) {
      toast.error("Signup session expired", "Please start again.");
      router.replace("/auth");
      return;
    }
    try {
      const shouldResume = hasPendingIntent();
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const session = await completeSignup.mutateAsync({
        signupSessionToken: pending.signupSessionToken,
        firstName,
        lastName: rest.join(" ") || firstName,
      });
      await saveSession(session);
      await clearPendingSignup();
      await registerPushToken({ sendWelcome: true });
      if (!shouldResume) router.replace("/auth/congratulations");
    } catch (error) {
      toast.error(
        "Could not create account",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AuthGlowBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Back button */}
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
            <AuthBackButton />
          </View>

          {/* Content */}
          <View
            style={{
              flex: 1,
              paddingHorizontal: 16,
              paddingTop: 45,
              paddingBottom: 16,
            }}
          >
            <Image
              source={chatIcon}
              resizeMode="contain"
              style={{ width: 49, height: 48 }}
            />

            <View style={{ marginTop: 34, gap: 6 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: "#000",
                  lineHeight: 36,
                }}
              >
                Enter Name
              </Text>
              <Text style={{ fontSize: 16, color: "#414040", lineHeight: 22 }}>
                Add a way to protect your account{" "}
                <Text style={{ color: "#121212", fontWeight: "500" }}>
                  {email}
                </Text>
              </Text>
            </View>

            <View style={{ marginTop: 34 }}>
              <TextInput
                ref={inputRef}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder="Your full name"
                placeholderTextColor="rgba(0,0,0,0.35)"
                style={{
                  backgroundColor: "#fff",
                  borderColor: "#90a1b9",
                  borderRadius: 6.6,
                  borderWidth: 1.3,
                  color: "#000",
                  fontSize: 14,
                  height: 50,
                  paddingHorizontal: 16,
                }}
                value={name}
                onChangeText={setName}
                onFocus={handleFocus}
                onSubmitEditing={handleContinue}
                returnKeyType="done"
              />
            </View>

            <View style={{ marginTop: 18 }}>
              <Pressable
                accessibilityRole="button"
                disabled={!isValid || loading}
                style={{
                  alignItems: "center",
                  backgroundColor:
                    isValid || loading ? "#FFC809" : "rgba(20,19,15,0.5)",
                  borderRadius: 50,
                  height: 52,
                  justifyContent: "center",
                }}
                onPress={handleContinue}
              >
                {loading ? (
                  <HookLoader size="button" variant="dark" />
                ) : (
                  <Text
                    style={{
                      color: isValid ? "#000" : "#fff",
                      fontSize: 14,
                      fontWeight: "500",
                    }}
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
