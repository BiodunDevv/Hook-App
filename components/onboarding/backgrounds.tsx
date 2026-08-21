import { LinearGradient } from "expo-linear-gradient";
import { View, useWindowDimensions } from "react-native";

const BASE_COLORS = ["#B5FFFC", "#FFDEE9"] as const;
const ELLIPSE_COLORS = [
  "#FFC809",
  "rgba(241,241,243,0.02)",
] as const;

function scaled(value: number, scale: number) {
  return value * scale;
}

function BackgroundEllipse({
  left,
  top,
  scale,
}: {
  left: number;
  top: number;
  scale: number;
}) {
  const size = scaled(720, scale);

  return (
    <LinearGradient
      pointerEvents="none"
      colors={ELLIPSE_COLORS}
      locations={[0, 1]}
      className="absolute rounded-full"
      style={{
        height: size,
        left: scaled(left, scale),
        top: scaled(top, scale),
        width: size,
      }}
    />
  );
}

export function TopGlow({ scale }: { scale: number }) {
  return (
    <>
      <BackgroundEllipse left={-111} top={-111} scale={scale} />
      <BackgroundEllipse left={-204} top={520} scale={scale} />
    </>
  );
}

export function FadeOverlay() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        "transparent",
        "rgba(255,199,0,0.12)",
        "rgba(241,241,243,0.70)",
        "#f1f1f3",
      ]}
      locations={[0, 0.32, 0.64, 0.86]}
      className="absolute left-0 right-0"
      style={{
        height: "44%",
        top: "36%",
      }}
    />
  );
}

export function BottomHaze() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        "transparent",
        "rgba(255,255,255,0.35)",
        "rgba(255,255,255,0.65)",
      ]}
      locations={[0, 0.58, 1]}
      className="absolute bottom-0 left-0 right-0 h-[18%]"
    />
  );
}

export function SharedOnboardingBackground() {
  const { width } = useWindowDimensions();
  const scale = width / 402;

  return (
    <View className="absolute inset-0" pointerEvents="none">
      <LinearGradient
        pointerEvents="none"
        colors={BASE_COLORS}
        className="absolute left-0 top-0 h-[120%] w-full"
      />
      <TopGlow scale={scale} />
      <FadeOverlay />
      <BottomHaze />
    </View>
  );
}
