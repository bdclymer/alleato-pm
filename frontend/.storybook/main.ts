import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../public"],
  viteFinal: async (viteConfig) => {
    if (!viteConfig.resolve) viteConfig.resolve = {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      "@": path.resolve(__dirname, "../src"),
    };
    // React plugin with automatic JSX runtime — eliminates "React is not defined" errors
    // Tailwind v4 Vite plugin for `@import "tailwindcss"` support
    viteConfig.plugins = [
      ...( viteConfig.plugins ?? []),
      react({ jsxRuntime: "automatic" }),
      tailwindcss(),
    ];
    // Polyfill `process.env` — Vite doesn't provide it, but many libs reference it
    viteConfig.define = {
      ...viteConfig.define,
      "process.env": {},
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
    };
    return viteConfig;
  },
};

export default config;
