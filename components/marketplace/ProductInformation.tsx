import { Ionicons } from "@expo/vector-icons";
import { useId, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, withTiming } from "react-native-reanimated";

function InformationSection({ title, children, initiallyOpen = false, last = false }: {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
  last?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [height, setHeight] = useState(0);
  const contentId = useId();
  const animation = useAnimatedStyle(() => ({
    height: withTiming(open ? height : 0, {
      duration: 240,
      easing: Easing.inOut(Easing.quad),
      reduceMotion: ReduceMotion.System,
    }),
    opacity: withTiming(open ? 1 : 0, { duration: 180, reduceMotion: ReduceMotion.System }),
  }), [open, height]);
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? "180deg" : "0deg", {
      duration: 240, reduceMotion: ReduceMotion.System,
    }) }],
  }), [open]);

  return (
    <View style={!last && styles.divider}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.header}
        hitSlop={4}
      >
        <Text style={styles.title}>{title}</Text>
        <Animated.View style={chevron}>
          <Ionicons name="chevron-down" size={17} color="#111111" />
        </Animated.View>
      </Pressable>
      <Animated.View style={[styles.clip, animation]} pointerEvents={open ? "auto" : "none"}>
        <View
          nativeID={contentId}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
          style={styles.content}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

export function ProductInformation({ name, description }: { name: string; description?: string | null }) {
  return (
    <View>
      <InformationSection title="Description" initiallyOpen>
        <Text style={styles.body}>{description?.trim() || "Product details are not yet available. Contact Hook for more information before ordering."}</Text>
      </InformationSection>
      <InformationSection title="What you'll receive">
        <Text style={styles.body}>•  1x {name}</Text>
        <Text style={styles.body}>•  Original packaging</Text>
        <Text style={styles.body}>•  Hook authenticity tag</Text>
      </InformationSection>
      <InformationSection title="Hook Protection" last>
        <Text style={styles.body}>•  Product sourced by Hook</Text>
        <Text style={styles.body}>•  Item checked before dispatch</Text>
        <Text style={styles.body}>•  Payment protected under refund policy</Text>
      </InformationSection>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#A7ABB2" },
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { flex: 1, fontSize: 16, fontFamily: "NunitoSans-SemiBold", color: "#111111" },
  clip: { overflow: "hidden" },
  content: { position: "absolute", top: 0, left: 0, right: 0, paddingBottom: 20, gap: 12 },
  body: { fontSize: 14, lineHeight: 24, fontFamily: "NunitoSans-Regular", color: "#66666B" },
});
