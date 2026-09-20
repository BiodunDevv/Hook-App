import { RefreshControl } from "react-native";

/** The app's standard pull-to-refresh: dark spinner on iOS, gold on Android. */
export function HookRefreshControl({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#111111"
      colors={["#FFC809"]}
      progressBackgroundColor="#FFFFFF"
    />
  );
}
