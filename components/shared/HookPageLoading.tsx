import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkeletonCartPage, SkeletonFormPage, SkeletonGridPage, SkeletonListPage, SkeletonPage, SkeletonProductPage, SkeletonStorefrontPage, SkeletonTextPage } from "@/components/motion/Skeleton";
import { HookBackButton } from "./HookBackButton";

type HookPageLoadingProps = {
  title?: string;
  label?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Which page this stands in for, so the skeleton matches its layout. */
  variant?: "generic" | "product" | "list" | "cart" | "grid" | "form" | "text" | "storefront";
};

/** Full-page loading state: a skeleton of the page instead of a spinner, so the screen feels ready sooner. */
export function HookPageLoading({ label = "Loading", showBack = true, onBack, variant = "generic" }: HookPageLoadingProps) {
  const insets = useSafeAreaInsets();
  const body =
    variant === "product" ? <SkeletonProductPage />
    : variant === "list" ? <SkeletonListPage />
    : variant === "cart" ? <SkeletonCartPage />
    : variant === "grid" ? <SkeletonGridPage />
    : variant === "form" ? <SkeletonFormPage />
    : variant === "text" ? <SkeletonTextPage />
    : variant === "storefront" ? <SkeletonStorefrontPage />
    : <SkeletonPage label={label} />;
  // The product and storefront skeletons draw their own top edge; the others sit under the back button.
  const fullBleed = variant === "product" || variant === "storefront";
  return (
    <View className="flex-1 bg-[#F1F1F3]">
      {showBack ? (
        <View style={{ position: "absolute", left: 16, top: insets.top + 10, zIndex: 10 }}>
          <HookBackButton onPress={onBack} />
        </View>
      ) : null}
      <View style={{ flex: 1, paddingTop: fullBleed ? (variant === "storefront" ? insets.top + 10 : 0) : insets.top + 68 }}>{body}</View>
    </View>
  );
}
