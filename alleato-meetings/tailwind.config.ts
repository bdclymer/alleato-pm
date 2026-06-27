import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0c0e",
        panel: "#15171b",
        border: "#262a31",
        muted: "#8b919c",
        fg: "#e6e8ec",
        accent: "#5b8cff",
      },
    },
  },
  plugins: [],
};

export default config;
