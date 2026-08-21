/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["NunitoSans-Regular"],
        regular: ["NunitoSans-Regular"],
        medium: ["NunitoSans-Medium"],
        semibold: ["NunitoSans-SemiBold"],
        bold: ["NunitoSans-Bold"],
        extrabold: ["NunitoSans-ExtraBold"],
        black: ["NunitoSans-Black"],
      },
      colors: {
        hook: {
          DEFAULT: "#ffc809",
          glow: "#FFC700",
          surface: "#f1f1f3",
          text: "#414040",
          muted: "#8a8989",
          accent: "#D8643E",
        },
        onboarding: {
          aqua: "#B5FFFC",
          blush: "#FFDEE9",
        },
      },
    },
  },
  plugins: [],
}
