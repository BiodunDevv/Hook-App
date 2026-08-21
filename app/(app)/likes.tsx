import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CatalogProductCard } from "@/components/marketplace/CatalogProductCard";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { HookBackButton } from "@/components/shared/HookBackButton";
import {
  useCustomerSessionQuery,
  useLikedProductsQuery,
} from "@/lib/mobile-api";

export default function LikesScreen() {
  const insets = useSafeAreaInsets();
  const session = useCustomerSessionQuery();
  const likes = useLikedProductsQuery();
  const products =
    likes.data?.items.map((item) => item.product).filter(Boolean) || [];

  if (session.isPending || likes.isLoading) {
    return <HookPageLoading title="Saved products" label="Loading your saved products" />;
  }

  if (session.data?.user.accountType !== "customer") {
    return (
      <View
        className="flex-1 items-center justify-center bg-[#F1F1F3] px-8"
        style={{ paddingTop: insets.top }}
      >
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
          <Ionicons name="heart-outline" size={36} color="#FFC809" />
        </View>
        <Text className="mt-5 text-xl font-black text-black">
          Save your favourites
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-[#777]">
          Sign in to keep products you love close by.
        </Text>
        <Pressable
          onPress={() => router.push("/auth" as never)}
          className="mt-6 rounded-full bg-[#FFC809] px-6 py-3.5"
        >
          <Text className="font-black text-black">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F1F1F3]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <HookBackButton />
        <Text className="text-xl font-black text-black">Your likes</Text>
        <View className="w-11" />
      </View>
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item!.publicId}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{
          gap: 16,
          padding: 16,
          paddingBottom: insets.bottom + 32,
        }}
        renderItem={({ item }) => <CatalogProductCard product={item!} />}
        ListEmptyComponent={
          <View className="items-center px-8 py-24">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <Ionicons name="heart-outline" size={30} color="#aaa" />
            </View>
            <Text className="mt-4 text-lg font-black text-black">
              Nothing saved yet
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-[#777]">
              Tap the heart on a product to save it here.
            </Text>
            <Pressable
              onPress={() => router.replace("/(tabs)/discover" as never)}
              className="mt-5 rounded-full bg-black px-5 py-3"
            >
              <Text className="font-black text-white">Discover products</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}
