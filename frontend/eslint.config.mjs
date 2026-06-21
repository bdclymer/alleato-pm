// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import path from "node:path";
import { FlatCompat } from "@eslint/eslintrc";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "@typescript-eslint/eslint-plugin";
import designSystemPlugin from "./eslint-plugin-design-system/index.js";

const compat = new FlatCompat({
  baseDirectory: path.resolve(),
  recommendedConfig: false,
  allConfig: false,
});

const IGNORE_PATTERNS = [
  ".next/**",
  "**/.next/**",
  "**/node_modules/**",
  "dist/**",
  "build/**",
  "out/**",
  "coverage/**",
  "public/**",
  "storybook-static/**",
  "test-results/**",
  "scripts/**", // Utility scripts - allow console.log
  "tests/**", // Test files - allow console.log
  "verify-*.js", // Verification scripts - allow console.log
  "verify-*.mjs",
  "check-scrollbar.mjs",
  "verify-scrollbar-final.mjs",
  "sidebar-verification-standalone.js",
  "verify-transcript*.js",
  "verify-transcript*.mjs",
  "drizzle/**",
  "eslint-plugin-design-system/**", // Plugin source - excluded from linting but imported above
  "src/types/**",
];

const config = [
  {
    ignores: IGNORE_PATTERNS,
  },
  ...compat.extends("next/core-web-vitals"),
  {
    plugins: {
      turbo: turboPlugin,
      "@typescript-eslint": tseslint,
      "design-system": designSystemPlugin,
    },
    rules: {
      // MANDATORY RULES - Errors that BLOCK commits/pushes
      "turbo/no-undeclared-env-vars": "off",
      "react-hooks/rules-of-hooks": "error", // Critical: React hooks must follow rules
      "no-debugger": "error", // Never ship debuggers
      "prefer-const": "error",
      "no-var": "error",

      // IMPORTANT RULES - Warnings (disabled to unblock cleanup tasks)
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "off",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-console": "off",
      "react-hooks/exhaustive-deps": "off",
      "no-alert": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "@next/next/no-img-element": "off",

      // Design System Enforcement
      // All rules are "warn" globally + escalated to "error" on changed files via lint-staged.
      // To escalate a rule to "error" globally: verify zero violations first with:
      //   node_modules/.bin/eslint src --no-color 2>&1 | grep "<rule-name>"

      "design-system/no-hardcoded-colors": "warn",
      "design-system/no-arbitrary-spacing": "warn",
      "design-system/require-semantic-colors": "warn",
      "design-system/no-design-violations": "warn",
      "design-system/require-page-shell": "warn",
      "design-system/no-raw-button": "warn",
      "design-system/no-raw-form-controls": "warn",
      "design-system/require-money-field": "warn",
      // WARN globally (300+ existing violations — tracked as debt, fix incrementally).
      // ENFORCED as ERROR on changed files via lint-staged (.lintstagedrc.js).
      "design-system/require-api-client": "warn",
      "design-system/require-empty-state": "warn",
      "design-system/no-raw-heading": "error",
      "design-system/no-inline-currency": "warn",
      "design-system/require-error-state": "warn",
      "design-system/require-info-alert": "warn",
      // Gate 19: blocks raw <TableBody>/<TableRow> etc. in page/component files
      "design-system/no-raw-table-primitives": "warn",
      // Gate 16: blocks raw fetch() to external URLs in API routes
      "design-system/no-external-fetch-in-api-routes": "warn",
      // Gate 20: blocks toast.error(err instanceof Error ? err.message : "fallback")
      // which leaks raw browser errors ("Failed to fetch") into the UI
      "design-system/no-raw-error-message-toast": "warn",
      // Gate 21: blocks raw <Input placeholder="Search..."> — use <ExpandingSearch> from @/components/ds
      "design-system/no-raw-search-input": "warn",
    },
  }, // Admin pages: relax heading rule — these are internal tools used only by the Alleato team.
  // Layout consistency is nice-to-have here; focus enforcement on customer-facing pages.
  {
    files: ["src/app/(admin)/**/*.tsx", "src/app/(admin)/**/*.ts"],
    rules: {
      "design-system/no-raw-heading": "off",
    },
  }, // Design template files: used as starting points / exploratory UI, not production components.
  // Intentional use of hardcoded colors, arbitrary values, and non-semantic tokens.
  {
    files: [
      "src/components/ds/futuristic-id-card.tsx",
      "src/components/ds/liquid-metal-id-card.tsx",
    ],
    rules: {
      "design-system/no-hardcoded-colors": "off",
      "design-system/no-arbitrary-spacing": "off",
      "design-system/require-semantic-colors": "off",
      "design-system/no-design-violations": "off",
      "design-system/no-raw-button": "off",
      "design-system/no-raw-form-controls": "off",
    },
  }, // Redirect-only pages have no JSX output — PageShell rule does not apply.
  {
    files: ["src/app/**/estimates/new/page.tsx"],
    rules: {
      "design-system/require-page-shell": "off",
    },
  }, // Transactional email templates: rendered by Resend/React Email to static HTML
  // for external inboxes, which cannot resolve CSS variables. Inline hex is
  // required here, matching the shared EmailShell palette.
  {
    files: ["src/emails/**/*.tsx", "src/emails/**/*.ts"],
    rules: {
      "design-system/no-hardcoded-colors": "off",
      "design-system/require-semantic-colors": "off",
    },
  }, // Kanban feature: board lanes and draggable cards require fixed geometry and card styling.
  // PageShell remains enforced; only geometry/card-noise rules are relaxed here.
  {
    files: ["src/features/kanban/**/*.tsx", "src/features/kanban/**/*.ts"],
    rules: {
      "design-system/no-arbitrary-spacing": "off",
      "design-system/no-design-violations": "off",
    },
  },
  ...storybook.configs["flat/recommended"],
];

export default config;
