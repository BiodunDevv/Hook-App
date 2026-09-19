import { Text, View, StyleSheet } from "react-native";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { designTokens, centeredHeaderTextStyle } from "@/constants/design-tokens";

/** Pages own their safe-area inset; this header never adds another one. */
export function HookPageHeader({ title, subtitle, centered = false }: { title: string; subtitle?: string; centered?: boolean }) {
  return (
    <View style={styles.header}>
      <HookBackButton style={styles.back} />
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, centered && centeredHeaderTextStyle]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {centered ? <View style={{ width: 44 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { fontSize: 22, fontFamily: "NunitoSans-Black", color: designTokens.color.ink },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 19, color: designTokens.color.textMuted },
});
