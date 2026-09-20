import { router, useLocalSearchParams } from "expo-router";
import { centeredHeaderTextStyle } from "@/constants/design-tokens";
import { ScrollView, Text, View } from "react-native";
import { HookRefreshControl } from "@/components/shared/HookRefreshControl";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthSheet } from "@/components/auth/AuthSheetProvider";
import { HookBackButton } from "@/components/shared/HookBackButton";
import { HookPageLoading } from "@/components/shared/HookPageLoading";
import { useLegalContentQuery } from "@/lib/mobile-api";

/**
 * Renders the small, controlled HTML shape the backend produces for legal
 * content (only <h2>, <p>, <ul>/<ol>/<li>, and <em> — see
 * seed-legal-content.ts) as native text blocks. Pulling in a full HTML/WebView
 * renderer isn't worth it for this narrow, backend-authored content.
 */
function LegalBody({ html }: { html: string }) {
  const blocks = html
    .split(/<\/(h2|p|ul|ol)>/)
    .reduce<{ tag: string; content: string }[]>((acc, part, index, array) => {
      if (index % 2 === 0) return acc;
      const tag = part;
      const content = array[index - 1].match(/<(?:h2|p|ul|ol)[^>]*>([\s\S]*)/)?.[1] || "";
      acc.push({ tag, content });
      return acc;
    }, []);

  function stripTags(value: string) {
    return value.replace(/<em>|<\/em>/g, "").replace(/<[^>]+>/g, "").trim();
  }

  return (
    <>
      {blocks.map((block, index) => {
        if (block.tag === "h2") {
          return (
            <Text key={index} className="mt-6 text-[17px] font-black text-black">
              {stripTags(block.content)}
            </Text>
          );
        }
        if (block.tag === "ul" || block.tag === "ol") {
          const items = block.content.split(/<\/li>/).map(stripTags).filter(Boolean);
          return (
            <View key={index} className="mt-2 gap-1.5">
              {items.map((item, itemIndex) => (
                <View key={itemIndex} className="flex-row gap-2">
                  <Text className="text-[13px] leading-6 text-[#52525b]">{"•"}</Text>
                  <Text className="flex-1 text-[13px] leading-6 text-[#52525b]">{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        const isEmphasis = block.content.includes("<em>");
        return (
          <Text
            key={index}
            className={`mt-3 text-[13px] leading-6 ${isEmphasis ? "italic text-[#8a6500]" : "text-[#52525b]"}`}
          >
            {stripTags(block.content)}
          </Text>
        );
      })}
    </>
  );
}

const TITLES: Record<string, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  returns: "Returns Policy",
};

export default function LegalContentScreen() {
  const insets = useSafeAreaInsets();
  const { type, from } = useLocalSearchParams<{ type: string; from?: string }>();
  const { openAuth } = useAuthSheet();
  const legalType = type === "privacy" || type === "returns" ? type : "terms";
  const query = useLegalContentQuery(legalType);
  const title = query.data?.title || TITLES[legalType];
  const { refreshing, onRefresh } = usePullRefresh(() => query.refetch());

  function goBack() {
    if (from === "auth") {
      router.back();
      openAuth();
      return;
    }
    router.back();
  }

  if (query.isLoading) {
    return <HookPageLoading title={title} label={`Loading ${title.toLowerCase()}`} onBack={goBack} />;
  }

  return (
    <View className="flex-1 bg-[#F1F1F3]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <HookBackButton onPress={goBack} />
        <Text style={centeredHeaderTextStyle} numberOfLines={1}>
          {title}
        </Text>
        <View className="w-11" />
      </View>
      <ScrollView
        refreshControl={<HookRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {query.data?.effectiveDate ? (
          <Text className="text-[12px] font-semibold text-[#8a6500]">
            Effective {new Date(query.data.effectiveDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        ) : null}
        {query.isError ? (
          <Text className="mt-6 text-[13px] leading-6 text-[#52525b]">
            This document could not be loaded right now. Please try again later.
          </Text>
        ) : (
          <LegalBody html={query.data?.bodyHtml || ""} />
        )}
      </ScrollView>
    </View>
  );
}
