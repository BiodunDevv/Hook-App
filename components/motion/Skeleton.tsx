import { useEffect } from "react";
import { View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

const BASE = "#DCDCE1";

/** One pulsing value shared by every block inside a skeleton, so they breathe together. */
function usePulse() {
  const pulse = useSharedValue(0.45);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.45, { duration: 700 })), -1);
  }, [pulse]);
  return useAnimatedStyle(() => ({ opacity: pulse.value }));
}

/** A grey rounded placeholder. Styled with plain style props so it renders the same everywhere. */
export function SkeletonBlock({ width = "100%", height = 14, radius = 8, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = usePulse();
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: BASE }, pulse, style]} />;
}

/** Wraps skeleton content: hidden from screen readers, announces loading once. */
export function SkeletonGroup({ children, label = "Loading", style }: { children: React.ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} importantForAccessibility="yes" style={style}>
      {children}
    </View>
  );
}

/** Placeholder shaped like a product card. */
export function SkeletonProductCard() {
  return (
    <View style={{ width: "100%" }}>
      <SkeletonBlock height={0} radius={0} style={{ aspectRatio: 1, height: undefined, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} />
      <SkeletonBlock width="80%" height={14} style={{ marginTop: 10 }} />
      <SkeletonBlock width="40%" height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

/** A two-column grid of product placeholders. */
export function SkeletonProductGrid({ count = 6 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading products" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, rowGap: 18 }}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ width: "48.5%" }}>
          <SkeletonProductCard />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Placeholder rows: a picture, two lines of text and a trailing value. */
export function SkeletonRows({ count = 5, label = "Loading" }: { count?: number; label?: string }) {
  return (
    <SkeletonGroup label={label} style={{ paddingHorizontal: 16, gap: 12 }}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 12 }}>
          <SkeletonBlock width={56} height={56} radius={14} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBlock width="70%" height={13} />
            <SkeletonBlock width="45%" height={12} />
          </View>
          <SkeletonBlock width={54} height={14} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** A market-card-shaped placeholder for the Home list. */
export function SkeletonMarketCards({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading markets" style={{ gap: 16 }}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} height={112} radius={22} />
      ))}
    </SkeletonGroup>
  );
}

/** A row of round category placeholders. */
export function SkeletonCategoryCircles({ count = 5, size = 72, tint = "rgba(255,255,255,0.55)" }: { count?: number; size?: number; tint?: string }) {
  const pulse = usePulse();
  return (
    <SkeletonGroup label="Loading categories" style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 17 }}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ width: size + 6, alignItems: "center" }}>
          <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint }, pulse]} />
          <Animated.View style={[{ width: size * 0.6, height: 10, borderRadius: 5, marginTop: 10, backgroundColor: tint }, pulse]} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Whole-screen placeholder used while a page loads: a title, a hero block and rows. */
export function SkeletonPage({ hero = true, rows = 4, label = "Loading" }: { hero?: boolean; rows?: number; label?: string }) {
  return (
    <SkeletonGroup label={label} style={{ flex: 1, paddingTop: 8, gap: 18 }}>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <SkeletonBlock width="55%" height={26} radius={10} />
        <SkeletonBlock width="35%" height={13} />
      </View>
      {hero ? <SkeletonBlock height={190} radius={22} style={{ marginHorizontal: 16, width: undefined }} /> : null}
      <SkeletonRows count={rows} label={label} />
    </SkeletonGroup>
  );
}

/** Placeholder entries for a FlatList, so loading rows sit in the list itself and never depend on the header. */
export type SkeletonItem = { publicId: string; skeleton: true };
export const SKELETON_ITEMS: SkeletonItem[] = Array.from({ length: 6 }, (_, index) => ({ publicId: `skeleton-${index}`, skeleton: true as const }));
export function isSkeletonItem(item: unknown): item is SkeletonItem {
  return Boolean(item) && typeof item === "object" && (item as SkeletonItem).skeleton === true;
}

/* ---- Page-shaped skeletons: each mirrors the layout of the screen it stands in for ---- */

const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ backgroundColor: "#fff", borderRadius: 18, padding: 14 }, style]}>{children}</View>
);

/** Product page: hero picture, thumbnails, title, price and quantity, option groups. */
export function SkeletonProductPage() {
  return (
    <SkeletonGroup label="Loading product" style={{ flex: 1 }}>
      <SkeletonBlock height={380} radius={0} style={{ borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 14 }}>
        {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} width={64} height={64} radius={16} />)}
      </View>
      <View style={{ paddingHorizontal: 12, gap: 12 }}>
        <SkeletonBlock width="70%" height={26} radius={10} />
        <SkeletonBlock width="40%" height={13} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SkeletonBlock width="34%" height={26} radius={10} />
          <SkeletonBlock width={120} height={36} radius={18} />
        </View>
        <SkeletonBlock width="24%" height={15} style={{ marginTop: 10 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[70, 90, 70].map((w, i) => <SkeletonBlock key={i} width={w} height={40} radius={20} />)}
        </View>
        <SkeletonBlock width="24%" height={15} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[48, 48, 48, 48, 48].map((w, i) => <SkeletonBlock key={i} width={w} height={44} radius={10} />)}
        </View>
      </View>
    </SkeletonGroup>
  );
}

/** Orders, addresses, notifications: a title, then stacked cards with a header line, details and a value. */
export function SkeletonListPage({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonGroup label="Loading" style={{ flex: 1, gap: 14, paddingHorizontal: 16 }}>
      <SkeletonBlock width="50%" height={28} radius={10} />
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <SkeletonBlock width="38%" height={14} />
            <SkeletonBlock width={70} height={22} radius={11} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <SkeletonBlock width={54} height={54} radius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBlock width="80%" height={13} />
              <SkeletonBlock width="50%" height={12} />
            </View>
          </View>
        </Card>
      ))}
    </SkeletonGroup>
  );
}

/** Cart: item rows with a picture, text and stepper, then a summary card and a button. */
export function SkeletonCartPage() {
  return (
    <SkeletonGroup label="Loading your cart" style={{ flex: 1, gap: 12, paddingHorizontal: 16 }}>
      <SkeletonBlock width="40%" height={28} radius={10} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12, backgroundColor: "#F8F8FA", borderRadius: 16, padding: 10 }}>
          <SkeletonBlock width={84} height={84} radius={12} />
          <View style={{ flex: 1, gap: 9, justifyContent: "center" }}>
            <SkeletonBlock width="75%" height={14} />
            <SkeletonBlock width="45%" height={12} />
            <SkeletonBlock width={96} height={30} radius={15} />
          </View>
        </View>
      ))}
      <Card style={{ gap: 10, marginTop: 6 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <SkeletonBlock width="34%" height={13} />
            <SkeletonBlock width="20%" height={13} />
          </View>
        ))}
      </Card>
    </SkeletonGroup>
  );
}

/** Saved products: a title over the product grid. */
export function SkeletonGridPage() {
  return (
    <SkeletonGroup label="Loading" style={{ flex: 1, gap: 14 }}>
      <SkeletonBlock width="50%" height={28} radius={10} style={{ marginLeft: 16 }} />
      <SkeletonProductGrid />
    </SkeletonGroup>
  );
}

/** Forms and checkout: sections with a label and a field or two. */
export function SkeletonFormPage({ sections = 3 }: { sections?: number }) {
  return (
    <SkeletonGroup label="Loading" style={{ flex: 1, gap: 14, paddingHorizontal: 16 }}>
      <SkeletonBlock width="46%" height={28} radius={10} />
      {Array.from({ length: sections }, (_, i) => (
        <Card key={i} style={{ gap: 12 }}>
          <SkeletonBlock width="32%" height={14} />
          <SkeletonBlock height={48} radius={14} />
          <SkeletonBlock height={48} radius={14} />
        </Card>
      ))}
      <SkeletonBlock height={52} radius={26} style={{ marginTop: 4 }} />
    </SkeletonGroup>
  );
}

/** Legal and long text: a title and paragraphs. */
export function SkeletonTextPage() {
  const widths = ["100%", "96%", "100%", "88%", "100%", "72%"];
  return (
    <SkeletonGroup label="Loading" style={{ flex: 1, gap: 12, paddingHorizontal: 16 }}>
      <SkeletonBlock width="60%" height={28} radius={10} />
      {[0, 1, 2].map((block) => (
        <View key={block} style={{ gap: 9, marginTop: 10 }}>
          <SkeletonBlock width="40%" height={16} />
          {widths.map((w, i) => <SkeletonBlock key={i} width={w as DimensionValue} height={12} />)}
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Category and market pages: the yellow header, category circles and the product grid. */
export function SkeletonStorefrontPage() {
  return (
    <SkeletonGroup label="Loading" style={{ flex: 1 }}>
      <View style={{ backgroundColor: "#FFDA55", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 16, paddingBottom: 18, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <SkeletonBlock width={44} height={44} radius={22} style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
          <View style={{ gap: 6 }}>
            <SkeletonBlock width={90} height={10} style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
            <SkeletonBlock width={120} height={14} style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
          </View>
        </View>
        <SkeletonBlock width="46%" height={30} radius={10} style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
        <SkeletonBlock height={52} radius={26} style={{ backgroundColor: "rgba(255,255,255,0.85)" }} />
      </View>
      <SkeletonCategoryCircles tint="#DCDCE1" size={54} count={6} />
      <View style={{ height: 16 }} />
      <SkeletonProductGrid />
    </SkeletonGroup>
  );
}
