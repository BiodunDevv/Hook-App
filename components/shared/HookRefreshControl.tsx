import { haptics } from "@/lib/haptics";
import { RefreshControl, type RefreshControlProps } from "react-native";

/**
 * The app's standard pull-to-refresh: dark spinner on iOS, gold on Android.
 *
 * It must forward every prop it receives. On Android, ScrollView clones its
 * `refreshControl` element and injects `style` and the scroll content as
 * `children`; a wrapper that only reads `refreshing` and `onRefresh` drops
 * them, and the whole screen renders blank.
 */
export function HookRefreshControl({ refreshing, onRefresh, ...rest }: RefreshControlProps) {
  return (
    <RefreshControl
      tintColor="#111111"
      colors={["#FFC809"]}
      progressBackgroundColor="#FFFFFF"
      {...rest}
      refreshing={refreshing}
      onRefresh={() => {
        haptics.tap();
        onRefresh?.();
      }}
    />
  );
}
