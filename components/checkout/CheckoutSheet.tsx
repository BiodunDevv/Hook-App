import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef, type PropsWithChildren } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { designTokens } from "@/constants/design-tokens";

/** Fixed chrome with Gorhom-integrated scrolling and keyboard handling. */
export function CheckoutSheet({ visible, onClose, title, children, fullScreen = false }: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  fullScreen?: boolean;
}>) {
  const sheet = useRef<BottomSheet>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (visible) sheet.current?.snapToIndex(0);
    else sheet.current?.close();
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => subscription.remove();
  }, [visible, onClose]);
  const backdrop = useCallback((props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.65} pressBehavior="close" />
  ), []);
  return (
    <BottomSheet
      ref={sheet}
      index={visible ? 0 : -1}
      snapPoints={[fullScreen ? "100%" : "88%"]}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture
      enableHandlePanningGesture
      topInset={insets.top + 8}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: designTokens.color.background, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: "#C8C8CC" }}
      onChange={(index) => { if (index === -1 && visibleRef.current) onClose(); }}
    >
      <View accessibilityViewIsModal style={{ flex: 1, minHeight: 0 }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: "NunitoSans-Bold", fontSize: 20, color: designTokens.color.ink }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
            <Ionicons name="close" size={24} color={designTokens.color.ink} />
          </Pressable>
        </View>
        <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
      </View>
    </BottomSheet>
  );
}
