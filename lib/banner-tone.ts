import type { PublicBanner } from "@/lib/mobile-api";

/**
 * A banner's colours. If an admin picked a custom colour in Admin > Settings, that wins; otherwise it falls back to
 * one of the four fixed presets. Kept in one place so the two renderers (`BannerCarousel`, `MarqueeBanner`) never
 * drift apart the way their separate, hand-copied colour maps previously did.
 */
export const BANNER_TONE_HEX: Record<string, { bg: string; fg: string }> = {
  gold: { bg: "#FFC809", fg: "#111111" },
  dark: { bg: "#18181B", fg: "#FFFFFF" },
  green: { bg: "#059669", fg: "#FFFFFF" },
  red: { bg: "#DC2626", fg: "#FFFFFF" },
};

export function resolveBannerColors(banner: Pick<PublicBanner, "tone" | "colorBg" | "colorFg">) {
  if (banner.colorBg && banner.colorFg) return { bg: banner.colorBg, fg: banner.colorFg };
  return BANNER_TONE_HEX[banner.tone] || BANNER_TONE_HEX.gold;
}
