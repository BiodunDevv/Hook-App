import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileAvatar } from "@/components/profile/ProfileComponents";
import { HookLoader } from "@/components/shared/HookLoader";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { toast } from "@/components/shared/toast";
import { getProfile, updateProfile, uploadProfileImage } from "@/lib/auth-api";
import { getSession, saveSession } from "@/lib/session";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  avatarUrl: string;
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const [form, setForm] = useState<ProfileForm>({ firstName: "", lastName: "", phone: "", email: "", avatarUrl: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getProfile()
      .then((user) => {
        if (!active) return;
        setForm({ firstName: user.firstName || "", lastName: user.lastName || "", phone: user.phone || "", email: user.email, avatarUrl: user.avatarUrl || "" });
      })
      .catch((error) => toast.error("Profile unavailable", error instanceof Error ? error.message : "Please try again."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function updateField(key: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error("Photos permission needed", "Allow Hook to access your photos to update your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setPhotoBusy(true);
    try {
      const avatarUrl = await uploadProfileImage(asset);
      if (!avatarUrl) throw new Error("The upload completed without an image URL.");
      const user = await updateProfile({ firstName: form.firstName, lastName: form.lastName, phone: form.phone, avatarUrl });
      const session = await getSession();
      if (session) await saveSession({ ...session, user: { ...session.user, ...user } });
      setForm((current) => ({ ...current, avatarUrl }));
      toast.success("Profile photo updated", "Your new photo is now visible across Hook.");
    } catch (error) {
      toast.error("Could not update photo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Name required", "Enter your first and last name.");
      return;
    }
    setBusy(true);
    try {
      const user = await updateProfile({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim() || undefined, avatarUrl: form.avatarUrl || undefined });
      const session = await getSession();
      if (session) await saveSession({ ...session, user: { ...session.user, ...user } });
      toast.success("Profile updated", "Your account details are up to date.");
      router.back();
    } catch (error) {
      toast.error("Could not update profile", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <HookPageLoading title="Edit profile" label="Loading profile" />;

  const name = `${form.firstName} ${form.lastName}`.trim();
  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <View
        className="z-20 border-b border-black/5 bg-white px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="h-11 flex-row items-center justify-between">
          <HookBackButton className="h-10 w-10" />
          <Text className="text-[17px] font-black text-black">Edit profile</Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 40 }}
        >
        <View className="items-center rounded-[20px] bg-[#FFF4C7] px-5 py-6">
          <View className="relative rounded-full bg-hook p-[3px]">
            <ProfileAvatar name={name} uri={form.avatarUrl} size={88} />
            <Pressable accessibilityLabel="Choose profile photo" accessibilityRole="button" disabled={photoBusy} onPress={() => void choosePhoto()} className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#FFF4C7] bg-black">
              {photoBusy ? <ActivityIndicator size="small" color="#FFC809" /> : <Ionicons name="camera" size={16} color="#FFC809" />}
            </Pressable>
          </View>
          <Text className="mt-4 text-[17px] font-black text-black">Your profile photo</Text>
          <Text className="mt-1 text-center text-[12px] leading-4 text-[#716A4E]">Choose a clear photo so your Hook account feels personal.</Text>
          <Pressable disabled={photoBusy} onPress={() => void choosePhoto()} className="mt-4 min-h-10 flex-row items-center rounded-full bg-black px-5">
            <Ionicons name="image-outline" size={15} color="#FFC809" />
            <Text className="ml-2 text-xs font-black text-hook">{photoBusy ? "Updating photo" : "Change photo"}</Text>
          </Pressable>
        </View>

        <View className="mt-4 rounded-[20px] bg-white p-4">
          <Text className="text-[17px] font-black text-black">Personal details</Text>
          <Text className="mb-5 mt-1 text-[12px] leading-4 text-[#7B7B80]">Keep your name and phone number accurate for orders and delivery.</Text>
          <Field
            label="First name"
            value={form.firstName}
            onChangeText={(value) => updateField("firstName", value)}
            onFocus={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            onSubmitEditing={() => lastNameRef.current?.focus()}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="next"
          />
          <Field
            ref={lastNameRef}
            label="Last name"
            value={form.lastName}
            onChangeText={(value) => updateField("lastName", value)}
            onFocus={() => scrollRef.current?.scrollTo({ y: 42, animated: true })}
            onSubmitEditing={() => phoneRef.current?.focus()}
            autoCapitalize="words"
            autoComplete="family-name"
            textContentType="familyName"
            returnKeyType="next"
          />
          <Field
            ref={phoneRef}
            label="Phone number"
            value={form.phone}
            keyboardType="phone-pad"
            onChangeText={(value) => updateField("phone", value)}
            onFocus={() => scrollRef.current?.scrollTo({ y: 112, animated: true })}
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="done"
          />
          <Field label="Email address" value={form.email} editable={false} helper="Your verified email cannot be changed here." />
        </View>

        <Pressable disabled={busy || photoBusy} onPress={() => void save()} className="mt-5 h-[54px] flex-row items-center justify-center rounded-full bg-hook" style={{ opacity: busy || photoBusy ? 0.65 : 1 }}>
          {busy ? <HookLoader size="button" variant="dark" /> : <><Ionicons name="checkmark" size={19} color="#111" /><Text className="ml-2 font-black text-black">Save changes</Text></>}
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const Field = forwardRef<TextInput, React.ComponentProps<typeof TextInput> & { label: string; helper?: string }>(
  function Field({ label, helper, ...input }, ref) {
    return (
      <View className="mb-4">
        <Text className="mb-2 text-[12px] font-bold text-[#5F5F64]">{label}</Text>
        <View className={`min-h-[54px] justify-center rounded-[14px] border px-4 ${input.editable === false ? "border-[#ECECEC] bg-[#F7F7F7]" : "border-[#DEDEDE] bg-white"}`}>
          <TextInput
            ref={ref}
            {...input}
            className={`py-3 text-[15px] font-semibold text-black ${input.editable === false ? "text-[#8A8A8E]" : ""}`}
            placeholderTextColor="#A0A0A4"
            selectionColor="#FFC809"
          />
        </View>
        {helper ? <Text className="mt-2 text-[11px] leading-4 text-[#929296]">{helper}</Text> : null}
      </View>
    );
  },
);
