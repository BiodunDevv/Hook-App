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

export const centeredHeaderTextStyle = {
  fontSize: designTokens.typography.headerSize,
  lineHeight: designTokens.typography.headerLineHeight,
  fontFamily: designTokens.typography.headerFont,
  color: designTokens.color.ink,
  textAlign: "center",
} as const;
