import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
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
    // Add Tailwind v4 Vite plugin so `@import "tailwindcss"` works
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
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
