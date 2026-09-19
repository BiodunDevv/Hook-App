import { Tabs } from "expo-router";

import { HookTabBar } from "@/components/tab-bar/HookTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <HookTabBar {...props} />}
      screenOptions={{
        animation: "fade",
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: "#F1F1F3" },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
    </Tabs>
  );
}
