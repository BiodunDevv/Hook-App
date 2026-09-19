import { AntDesign, Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { router, type Href, usePathname } from "expo-router";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/shared/toast";
import { lookupEmail } from "@/lib/auth-api";
import { useHookGoogleAuth } from "@/lib/google-auth";
import { useHookAppleAuth } from "@/lib/apple-auth";
import authStartGif from "@/assets/images/onboarding/auth-start.gif";
import { getSession, isCustomerSession, onSessionChanged } from "@/lib/session";

type ContextValue = {
  openAuth: (intent?: Href) => void;
  closeAuth: () => void;
  hasPendingIntent: () => boolean;
};
const Context = createContext<ContextValue | null>(null);

export function useAuthSheet() {
  const value = useContext(Context);
  if (!value) throw new Error("useAuthSheet must be used inside AuthSheetProvider");
  return value;
}

export function AuthSheetProvider({ children }: PropsWithChildren) {
  const sheet = useRef<BottomSheet>(null);
  const authOpen = useRef(false);
  const authRouteTransition = useRef(false);
  const intent = useRef<Href | undefined>(undefined);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const google = useHookGoogleAuth();
  const apple = useHookAppleAuth();
  const hasSocialAuth = google.isGoogleReady || (Platform.OS === "ios" && apple.isAppleReady);
  const snapPoints = useMemo(() => ["100%"], []);

  useEffect(() => onSessionChanged(() => {
    void getSession().then((session) => {
      if (isCustomerSession(session)) {
        sheet.current?.close();
        const destination = intent.current;
        intent.current = undefined;
        if (destination) router.replace(destination);
      }
    });
  }), []);

  const reset = useCallback(() => {
    Keyboard.dismiss();
  }, []);
  const closeAuth = useCallback(() => { authOpen.current = false; sheet.current?.close(); reset(); }, [reset]);
  const hasPendingIntent = useCallback(() => Boolean(intent.current), []);
  const openAuth = useCallback((next?: Href) => {
    authOpen.current = true;
    intent.current = next || (pathname as Href);
    sheet.current?.expand();
  }, [pathname]);

  function openLegal(type: "terms" | "privacy") {
    authRouteTransition.current = true;
    authOpen.current = false;
    sheet.current?.close();
    setTimeout(() => router.push({ pathname: "/legal/[type]", params: { type, from: "auth" } }), 180);
  }

  async function submit() {
    if (!acceptedPolicies) {
      toast.error("Almost there", "Please accept the Terms and Privacy Policy to continue.");
      return;
    }
    setBusy(true);
    try {
      const normalized = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error("Enter a valid email address");
      const result = await lookupEmail(normalized);
      setEmail(normalized);
      authRouteTransition.current = true;
      authOpen.current = false;
      sheet.current?.close();
      setTimeout(() => {
        router.push({
          pathname: result.nextStep === "password" ? "/auth/password" : "/auth/create-password",
          params: { email: normalized },
        });
      }, 180);
    } catch (error) {
      toast.error("Could not continue", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Context.Provider value={{ openAuth, closeAuth, hasPendingIntent }}>
      {children}
      <BottomSheet
        ref={sheet}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        topInset={0}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleComponent={null}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.32} pressBehavior="close" />}
        backgroundStyle={{ backgroundColor: "#F7F7F8", borderRadius: 0 }}
        onClose={() => {
          authOpen.current = false;
          reset();
          if (authRouteTransition.current) {
            authRouteTransition.current = false;
            return;
          }
        }}
      >
        <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}>
          <>
          <View className="h-[264px] w-full overflow-hidden bg-hook">
            <Image source={authStartGif} contentFit="cover" style={{ width: '100%', height: 264 }} />
            <View className="absolute left-4 rounded-full border border-white/50 bg-white/80 px-3 py-1.5" style={{ top: insets.top + 10 }}>
              <Text className="text-xs font-black text-black">HOOK</Text>
            </View>
            <Pressable accessibilityLabel="Close sign in" onPress={closeAuth} className="absolute right-4 h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/85" style={{ top: insets.top + 8 }}>
              <Ionicons name="close" size={20} color="#111" />
            </Pressable>
          </View>
          <View className="-mt-6 rounded-t-[28px] bg-[#F7F7F8] px-5 pt-7">
          <View className="flex-row items-start justify-between pt-2">
            <View className="min-w-0 flex-1 pr-4">
              <Text className="text-[30px] font-black leading-9 text-black">Welcome to Hook</Text>
              <Text className="mt-1.5 text-[15px] leading-5 text-[#68686C]">Sign in or create your account to continue.</Text>
            </View>
          </View>

          <View className="mt-5">
            <Text className="mb-2 ml-1 text-[13px] font-bold text-[#46464A]">Email address</Text>
            <SheetInput value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" onFocus={() => sheet.current?.expand()} onSubmitEditing={submit} />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedPolicies }}
              onPress={() => setAcceptedPolicies((value) => !value)}
              className="mt-3 flex-row items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-3.5 py-3"
            >
              <View className={`h-6 w-6 items-center justify-center rounded-lg border ${acceptedPolicies ? "border-black bg-black" : "border-[#C7C7CC] bg-[#F7F7F8]"}`}>
                {acceptedPolicies ? <Ionicons name="checkmark" size={15} color="#FFC809" /> : null}
              </View>
              <Text className="flex-1 text-[12px] leading-4 text-[#68686C]">
                I agree to Hook&apos;s{" "}
                <Text className="font-bold text-black" onPress={() => openLegal("terms")}>Terms</Text>
                {" "}and{" "}
                <Text className="font-bold text-black" onPress={() => openLegal("privacy")}>Privacy Policy</Text>.
              </Text>
            </Pressable>
            <Button title="Continue" disabled={!acceptedPolicies} loading={busy} onPress={submit} className="mt-4" />
          </View>

            {hasSocialAuth ? (
              <>
                <View className="mt-6 flex-row items-center gap-4"><View className="h-px flex-1 bg-black/10" /><Text className="text-xs font-semibold text-[#858589]">OR CONTINUE WITH</Text><View className="h-px flex-1 bg-black/10" /></View>
                <View className="mt-5 flex-row justify-center gap-3">
                  {google.isGoogleReady ? <Pressable accessibilityLabel="Continue with Google" accessibilityState={{ disabled: google.isGoogleLoading, busy: google.isGoogleLoading }} disabled={google.isGoogleLoading} onPress={() => void google.signInWithGoogle()} className="h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm disabled:opacity-50"><AntDesign name="google" size={22} color="#4285F4" /></Pressable> : null}
                  {Platform.OS === 'ios' && apple.isAppleReady ? <Pressable accessibilityLabel="Continue with Apple" accessibilityState={{ disabled: apple.isAppleLoading, busy: apple.isAppleLoading }} disabled={apple.isAppleLoading} onPress={() => void apple.signInWithApple()} className="h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm disabled:opacity-50"><Ionicons name="logo-apple" size={24} color="#111" /></Pressable> : null}
                </View>
              </>
            ) : null}
          </View>
          </>
        </BottomSheetScrollView>
      </BottomSheet>
    </Context.Provider>
  );
}

function SheetInput(props: React.ComponentProps<typeof BottomSheetTextInput>) {
  return <BottomSheetTextInput {...props} autoCapitalize="none" autoCorrect={false} className="h-[52px] rounded-full bg-[#F1F1F3] px-5 text-sm text-black" returnKeyType="done" />;
}
