import { colorName } from "@/lib/color-name";

export type ResolvedProductColor = {
  /** Canonical value used for rendering and variant selection. */
  hex: string;
  /** Human-readable value used in product and cart UI. */
  name: string;
};

const COLOR_ALIASES: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  "off-white": "#F5F5F5",
  gray: "#808080",
  grey: "#808080",
  "light gray": "#D5D5D8",
  "light grey": "#D5D5D8",
  "dark gray": "#4A4A4A",
  "dark grey": "#4A4A4A",
  silver: "#C0C0C0",
  beige: "#D9C8A9",
  cream: "#FFFDD0",
  yellow: "#FFC809",
  gold: "#D4AF37",
  green: "#5BE000",
  emerald: "#10B981",
  teal: "#0F9D9A",
  blue: "#123BFF",
  "sky blue": "#38BDF8",
  navy: "#14213D",
  purple: "#8A00FF",
  pink: "#EC4899",
  red: "#FF3B30",
  burgundy: "#800020",
  brown: "#7A4B2A",
  orange: "#FF7A00",
};

function parseColor(value?: string): string | undefined {
  const raw = String(value || "").trim();
  const normalized = raw.toLowerCase();
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) {
    const hex = raw.slice(0, 7);
    return hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase()
      : hex.toUpperCase();
  }
  if (COLOR_ALIASES[normalized]) return COLOR_ALIASES[normalized];

  const rgbMatch = normalized.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/,
  );
  if (!rgbMatch) return undefined;
  const channels = rgbMatch.slice(1, 4).map((channel) =>
    Math.max(0, Math.min(255, Number(channel))),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Resolve a product color once for both rendering and display. */
export function resolveColor(value?: string): ResolvedProductColor {
  const hex = parseColor(value) || "#D5D5D8";
  const raw = String(value || "").trim();
  return {
    hex,
    // Codes and known colour words become an everyday name ("#14213D" -> "Navy");
    // anything else a person typed is kept, tidied.
    name: colorName(parseColor(value) ? hex : raw) || "Unspecified",
  };
}

export function colorLabel(value?: string) {
  return resolveColor(value).name;
}

export function colorHex(value?: string) {
  return resolveColor(value).hex;
}
