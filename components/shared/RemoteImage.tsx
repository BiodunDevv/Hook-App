import { Ionicons } from "@expo/vector-icons";
import { Image, type ImageContentFit, type ImageSource } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

type RemoteImageProps = {
  uri?: string | null;
  contentFit?: ImageContentFit;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackSource?: ImageSource | number;
  transition?: number;
};

export function RemoteImage({
  uri,
  contentFit = "cover",
  fallbackIcon = "image-outline",
  fallbackSource,
  transition = 180,
}: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  if (!uri || failed) {
    if (fallbackSource) {
      return (
        <Image
          source={fallbackSource}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          transition={transition}
        />
      );
    }
    return (
      <View
        style={StyleSheet.absoluteFill}
        className="items-center justify-center bg-[#f1f1f3]"
      >
        <Ionicons name={fallbackIcon} size={28} color="#a1a1aa" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={transition}
      onError={() => setFailed(true)}
    />
  );
}
