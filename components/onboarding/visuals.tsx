import { Image as ExpoImage } from "expo-image";
import { Image, Text, View } from "react-native";

import onboardingMarket from "@/assets/images/onboarding/step-1/market.png";
import frame88 from "@/assets/images/onboarding/step-2/frame88.jpg";
import frame89 from "@/assets/images/onboarding/step-2/frame89.jpg";
import frame93 from "@/assets/images/onboarding/step-2/frame93.jpg";
import frame94 from "@/assets/images/onboarding/step-2/frame94.jpg";
import frame95 from "@/assets/images/onboarding/step-2/frame95.jpg";
import frame96 from "@/assets/images/onboarding/step-2/frame96.jpg";
import onboardingDelivery from "@/assets/images/onboarding/step-3/delivery.gif";

import { DESIGN_WIDTH } from "./data";

export function OnboardingVisual({
  activeIndex,
  scale,
}: {
  activeIndex: number;
  scale: number;
}) {
  if (activeIndex === 0) {
    return <MarketVisual scale={scale} />;
  }

  if (activeIndex === 1) {
    return <PriceVisual scale={scale} />;
  }

  return <DeliveryVisual scale={scale} />;
}

function MarketVisual({ scale }: { scale: number }) {
  return (
    <>
      <Image
        source={onboardingMarket}
        resizeMode="contain"
        style={{
          height: 454 * scale,
          left: 31 * scale,
          position: "absolute",
          top: 119 * scale,
          width: 340 * scale,
        }}
      />
    </>
  );
}

function AvatarImage({
  scale,
  size,
  source,
  x,
  y,
}: {
  scale: number;
  size: number;
  source: number;
  x: number;
  y: number;
}) {
  return (
    <Image
      source={source}
      resizeMode="cover"
      style={{
        borderColor: "rgba(255,255,255,0.45)",
        borderRadius: (size * scale) / 2,
        borderWidth: 1,
        height: size * scale,
        left: x * scale,
        position: "absolute",
        top: y * scale,
        width: size * scale,
      }}
    />
  );
}

function BubbleLabel({
  scale,
  small,
  text,
  x,
  y,
}: {
  scale: number;
  small?: boolean;
  text: string;
  x: number;
  y: number;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        left: x * scale,
        position: "absolute",
        top: y * scale,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: 5 * scale,
          height: (small ? 16.5 : 24) * scale,
          justifyContent: "center",
          minWidth: (small ? 46 : 67) * scale,
          paddingHorizontal: 8 * scale,
        }}
      >
        <Text
          style={{
            color: "#000",
            fontSize: (small ? 9.6 : 14) * scale,
            lineHeight: (small ? 12 : 18) * scale,
          }}
        >
          {text}
        </Text>
      </View>
      <View
        style={{
          borderLeftColor: "transparent",
          borderLeftWidth: 8 * scale,
          borderRightColor: "transparent",
          borderRightWidth: 8 * scale,
          borderTopColor: "#fff",
          borderTopWidth: 10 * scale,
          height: 0,
          width: 0,
        }}
      />
    </View>
  );
}

function MessageBubble({
  scale,
  small,
  text,
  width,
  x,
  y,
}: {
  scale: number;
  small?: boolean;
  text: string;
  width: number;
  x: number;
  y: number;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 18 * scale,
        elevation: 3,
        left: x * scale,
        paddingHorizontal: 12 * scale,
        paddingVertical: 8 * scale,
        position: "absolute",
        shadowColor: "rgba(0,0,0,0.2)",
        shadowOffset: { width: 0, height: 2 * scale },
        shadowOpacity: 0.22,
        shadowRadius: 4 * scale,
        top: y * scale,
        width: width * scale,
      }}
    >
      <Text
        style={{
          color: "#414040",
          fontSize: (small ? 9.3 : 12.4) * scale,
          lineHeight: (small ? 12 : 16) * scale,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function PriceVisual({ scale }: { scale: number }) {
  return (
    <>
      <View
        style={{
          height: 430 * scale,
          left: 0,
          position: "absolute",
          top: 86 * scale,
          width: DESIGN_WIDTH * scale,
        }}
      >
        <AvatarImage source={frame93} scale={scale} size={22} x={42} y={76} />
        <AvatarImage source={frame96} scale={scale} size={33} x={59} y={132} />
        <AvatarImage source={frame88} scale={scale} size={33} x={64} y={224} />
        <AvatarImage source={frame94} scale={scale} size={70} x={111} y={202} />
        <AvatarImage source={frame89} scale={scale} size={70} x={296} y={130} />
        <AvatarImage source={frame95} scale={scale} size={33} x={321} y={93} />

        <BubbleLabel scale={scale} x={51} y={114} text="19,000" small />
        <BubbleLabel scale={scale} x={150} y={170} text="80,000" />
        <BubbleLabel scale={scale} x={273} y={99} text="Last price" />

        <MessageBubble
          scale={scale}
          width={207}
          x={97}
          y={280}
          text="What is the last price for this clothe, i need it as soon as possible."
          small
        />
        <MessageBubble
          scale={scale}
          width={276}
          x={63}
          y={334}
          text="Their is only one of it type in the market, that is why the price has gone up"
        />
        <MessageBubble
          scale={scale}
          width={311}
          x={46}
          y={397}
          text="Their is only one of it type in the market, that is why the price has gone up"
        />
      </View>
    </>
  );
}

function DeliveryVisual({ scale }: { scale: number }) {
  return (
    <>
      <ExpoImage
        source={onboardingDelivery}
        contentFit="cover"
        style={{
          height: 504 * scale,
          left: 0,
          position: "absolute",
          top: 0,
          width: DESIGN_WIDTH * scale,
        }}
      />
    </>
  );
}
