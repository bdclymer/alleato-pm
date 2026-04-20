import React from "react";
import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

// Polyfill `process` for Storybook/Vite — browser has no process global.
// Supabase and other libs reference process.env at module init time.
if (typeof globalThis.process === "undefined") {
  // @ts-expect-error – intentional browser polyfill
  globalThis.process = { env: { NODE_ENV: "development" } };
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "hsl(0 0% 98%)" },
        { name: "dark", value: "hsl(222 47% 11%)" },
      ],
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-6">
        <Story />
      </div>
    ),
  ],
};

export default preview;
