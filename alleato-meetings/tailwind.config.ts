import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm near-black "control room" surfaces
        ink: {
          950: "#0b0b0d",
          900: "#101013",
          850: "#15151a",
          800: "#1b1b21",
          700: "#24242b",
          600: "#30303a",
        },
        line: "#272730",
        text: "#ededf1",
        muted: "#9a9aa6",
        faint: "#6a6a76",
        // Single confident accent — refined gold ("on air")
        gold: {
          DEFAULT: "#e8b54a",
          soft: "rgba(232,181,74,0.12)",
          ink: "#1c1606",
        },
        good: "#5bd0a0",
        bad: "#f0746c",
        warn: "#e8a23d",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Numeric weight utilities (font-400 … font-700) used throughout the UI.
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
        fade: "fade 0.4s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
