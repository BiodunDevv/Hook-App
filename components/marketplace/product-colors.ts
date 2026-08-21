export type ResolvedProductColor = {
  /** Canonical value used for rendering and variant selection. */
  hex: string;
  /** Human-readable value used in product and cart UI. */
  name: string;
};

type Rgb = { r: number; g: number; b: number };
type ColorDefinition = { name: string; hex: string; rgb: Rgb };

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

const COLOR_PALETTE: ColorDefinition[] = [
  ["Black", "#111111"],
  ["Dark Gray", "#4A4A4A"],
  ["Gray", "#808080"],
  ["Silver", "#C0C0C0"],
  ["Light Gray", "#D5D5D8"],
  ["White", "#FFFFFF"],
  ["Beige", "#D9C8A9"],
  ["Brown", "#7A4B2A"],
  ["Red", "#FF3B30"],
  ["Burgundy", "#800020"],
  ["Orange", "#FF7A00"],
  ["Yellow", "#FFC809"],
  ["Green", "#5BE000"],
  ["Teal", "#0F9D9A"],
  ["Sky Blue", "#38BDF8"],
  ["Blue", "#123BFF"],
  ["Navy", "#14213D"],
  ["Purple", "#8A00FF"],
  ["Pink", "#EC4899"],
].map(([name, hex]) => ({ name, hex, rgb: parseHex(hex) }));

const EXACT_NAMES: Record<string, string> = {
  "#000000": "Black",
  "#111111": "Black",
  "#ffffff": "White",
  "#f5f5f5": "Off-white",
  "#d5d5d8": "Light Gray",
  "#808080": "Gray",
  "#ffc809": "Yellow",
  "#ffd400": "Yellow",
  "#5be000": "Green",
  "#123bff": "Blue",
  "#8a00ff": "Purple",
  "#ff3b30": "Red",
  "#7a4b2a": "Brown",
  "#ff7a00": "Orange",
};

function parseHex(value: string): Rgb {
  const normalized = value.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized.slice(0, 6);
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

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

function nearestColorName(hex: string) {
  const rgb = parseHex(hex);
  let nearest = COLOR_PALETTE[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of COLOR_PALETTE) {
    const distance =
      (rgb.r - candidate.rgb.r) ** 2 +
      (rgb.g - candidate.rgb.g) ** 2 +
      (rgb.b - candidate.rgb.b) ** 2;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest.name;
}

/** Resolve a product color once for both rendering and display. */
export function resolveColor(value?: string): ResolvedProductColor {
  const hex = parseColor(value) || "#D5D5D8";
  const normalized = hex.toLowerCase();
  const raw = String(value || "").trim();
  return {
    hex,
    name: EXACT_NAMES[normalized] ||
      (parseColor(value) ? nearestColorName(hex) : raw || "Unspecified"),
  };
}

export function colorLabel(value?: string) {
  return resolveColor(value).name;
}

export function colorHex(value?: string) {
  return resolveColor(value).hex;
}
