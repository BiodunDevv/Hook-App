export const designTokens = {
  color: {
    brand: "#FFC809",
    brandPressed: "#E7B200",
    ink: "#111111",
    textMuted: "#66666B",
    background: "#F1F1F3",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F1F3",
    disabled: "#D5D5D8",
    border: "rgba(17, 17, 17, 0.06)",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    card: 22,
    control: 26,
  },
  typography: {
    headerSize: 20,
    headerLineHeight: 28,
    headerFont: "NunitoSans-Bold",
    buttonSize: 15,
    labelSize: 11,
    valueSize: 16,
    buttonFont: "NunitoSans-Black",
    labelFont: "NunitoSans-SemiBold",
  },
  control: {
    actionHeight: 52,
    bottomInset: 8,
    bottomContentInset: 84,
  },
} as const;

/**
 * The single horizontal gutter every screen uses.
 *
 * Screens had been setting their own value — 16 here, 18 there, 24 in places —
 * so headers and content drifted out of alignment between (and sometimes
 * within) pages. Import `screenPadding` rather than hardcoding a number.
 */
export const screenPadding = designTokens.spacing.lg;

/** Content gutter for a screen's scroll body. Spread into contentContainerStyle. */
export const screenContentStyle = {
  paddingHorizontal: screenPadding,
} as const;

/** Matches screenContentStyle for headers and other non-scrolling sections. */
export const screenHeaderStyle = {
  paddingHorizontal: screenPadding,
} as const;

export const centeredHeaderTextStyle = {
  fontSize: designTokens.typography.headerSize,
  lineHeight: designTokens.typography.headerLineHeight,
  fontFamily: designTokens.typography.headerFont,
  color: designTokens.color.ink,
  textAlign: "center",
} as const;
