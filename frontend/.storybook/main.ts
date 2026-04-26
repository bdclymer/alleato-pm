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
  staticDirs: [],
  viteFinal: async (viteConfig) => {
    if (!viteConfig.resolve) viteConfig.resolve = {};
    // Use array format so specific aliases are checked before the generic "@" prefix.
    // Object format resolves "@" before "@/contexts/..." because it matches the prefix first.
    const existingAliases = Array.isArray(viteConfig.resolve.alias)
      ? viteConfig.resolve.alias
      : Object.entries(viteConfig.resolve.alias ?? {}).map(([find, replacement]) => ({ find, replacement: replacement as string }));
    viteConfig.resolve.alias = [
      // Specific mocks first — must come before the generic "@" alias
      { find: "@/contexts/project-context", replacement: path.resolve(__dirname, "./mocks/project-context.tsx") },
      { find: "next/navigation",            replacement: path.resolve(__dirname, "./mocks/next-navigation.ts") },
      { find: "next/link",                  replacement: path.resolve(__dirname, "./mocks/next-link.tsx") },
      // Generic @ path alias
      { find: "@", replacement: path.resolve(__dirname, "../src") },
      ...existingAliases,
    ];
    // Force automatic JSX runtime in all Storybook Vite pipelines (serve/build/deps).
    // This prevents "React is not defined" when stories use JSX without importing React.
    viteConfig.esbuild = {
      ...viteConfig.esbuild,
      jsx: "automatic",
      jsxImportSource: "react",
    };
    viteConfig.optimizeDeps = {
      ...viteConfig.optimizeDeps,
      esbuildOptions: {
        ...(viteConfig.optimizeDeps?.esbuildOptions ?? {}),
        jsx: "automatic",
        jsxImportSource: "react",
      },
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
