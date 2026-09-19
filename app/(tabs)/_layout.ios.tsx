import { NativeTabs } from "expo-router/unstable-native-tabs";

import { countActiveNegotiations } from "@/lib/negotiations";
import { useNegotiationsQuery } from "@/lib/mobile-api";

const hookYellow = "#FFC809";
const tabInkMuted = "#B2B2B5";

function badgeText(count: number) {
  return count > 99 ? "99+" : String(count);
}

export default function IOSNativeTabLayout() {
  const negotiations = useNegotiationsQuery();
  const activeNegotiations = countActiveNegotiations(
    Array.isArray(negotiations.data) ? negotiations.data : [],
  );

  // if (Number.parseInt(String(Platform.Version), 10) < 26)
  //   return <LegacyIOSTabs />;

  return (
    <NativeTabs
      backgroundColor="#FFFFFF"
      blurEffect="systemChromeMaterialLight"
      iconColor={{ default: tabInkMuted, selected: hookYellow }}
      labelStyle={{
        default: { color: tabInkMuted },
        selected: { color: hookYellow, fontWeight: "700" },
      }}
      badgeBackgroundColor={hookYellow}
      shadowColor="#0000001A"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Icon
          sf={{ default: "bubble.left", selected: "bubble.left.fill" }}
        />
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!activeNegotiations}>
          {activeNegotiations ? badgeText(activeNegotiations) : ""}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart" role="search">
        <NativeTabs.Trigger.Icon
          sf={{ default: "cart", selected: "cart.fill" }}
        />
        <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
