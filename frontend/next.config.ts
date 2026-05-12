import path from "node:path";
import { createRequire } from "node:module";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);

function resolvePdfjsDistPath(filePath: string) {
  const reactPdfPackageDir = path.dirname(require.resolve("react-pdf/package.json"));
  const pdfjsPackagePath = require.resolve("pdfjs-dist/package.json", {
    paths: [reactPdfPackageDir],
  });

  return path.join(path.dirname(pdfjsPackagePath), filePath);
}

const pdfjsBrowserEntry = resolvePdfjsDistPath("build/pdf.min.mjs");

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking is handled by pre-commit hooks and CI (tsc --noEmit).
    // Skipping during build saves significant memory on Vercel's 8GB machines.
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  devIndicators: false,
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
    // Prevent webpack/turbopack from barrel-importing entire icon/component libraries.
    // Without this, lucide-react (511 icons), @tabler/icons-react (3000+ icons),
    // and react-icons cause the webpack worker to OOM on Vercel's 8 GB build machines.
    optimizePackageImports: [
      "lucide-react",
      "@tabler/icons-react",
      "react-icons",
      "@radix-ui/react-icons",
      "framer-motion",
      "motion",
      "recharts",
      "@liveblocks/react",
      "@liveblocks/react-ui",
      "@liveblocks/react-lexical",
      "date-fns",
      "lodash",
      "@lexical/react",
      "@lexical/rich-text",
      "@lexical/link",
      "@lexical/list",
      "@lexical/markdown",
      "@lexical/code",
      "@lexical/selection",
      "@lexical/utils",
      "@lexical/yjs",
      "@lexical/headless",
      "@codemirror/view",
      "@codemirror/state",
      "@codemirror/lang-python",
      "@codemirror/theme-one-dark",
      "@liveblocks/client",
    ],
  },
  turbopack: {
    // Turbopack equivalent of the webpack pdfjs-dist alias below.
    // react-pdf's non-minified 5.x ESM entry redeclares webpack's internal export
    // variable; the minified build avoids this.
    // NOTE: Turbopack does not support absolute filesystem paths in resolveAlias -
    // use a bare module specifier instead (pnpm hoists pdfjs-dist to the top level).
    resolveAlias: {
      "pdfjs-dist": "pdfjs-dist/build/pdf.min.mjs",
    },
  },
  serverExternalPackages: [
    // AI/ML packages — large module graphs, server-only, never in client bundles.
    // Webpack bundling these causes OOM on Vercel's 8 GB build machines.
    "openai",
    "ai",
    "@ai-sdk/openai",
    "@ai-sdk/anthropic",
    "@ai-sdk/mcp",
    // Mermaid diagram packages — complex dependency trees
    "@mermaid-js/parser",
    "mermaid",
    "@streamdown/mermaid",
    // Headless browser — binary path breaks when webpack bundles these
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
    // Microsoft Teams Bot Framework — native Node.js modules, heavy dep graph
    "@chat-adapter/teams",
    "botbuilder",
    "botframework-connector",
    "@azure/identity",
    "chat",
    "@chat-adapter/state-memory",
    // Heavy doc/API packages only used in specific admin routes
    "redoc",
    "swagger-ui-dist",
    "xlsx",
    // OpenTelemetry + tracing — native Node.js modules, never in client bundles
    "@opentelemetry/sdk-node",
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/exporter-trace-otlp-http",
    "@arizeai/openinference-instrumentation-openai",
    "@langfuse/otel",
    "@langfuse/tracing",
    "langfuse",
  ],
  webpack: (config) => {
    // react-pdf imports bare `pdfjs-dist`, whose non-minified 5.x ESM entry redeclares
    // webpack's internal export variable and crashes the drawing viewer in dev.
    // Production builds use Turbopack (--turbopack flag); this alias applies to local
    // dev and any non-Turbopack builds. Turbopack equivalent: experimental.turbo.resolveAlias.
    config.resolve.alias = {
      ...config.resolve.alias,
      "pdfjs-dist$": pdfjsBrowserEntry,
    };

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lgveqfnpkxvzbnnwuled.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "www.gravatar.com",
        pathname: "/avatar/**",
      },
    ],
  },
  // Set the workspace root to silence Next.js warning about multiple lockfiles
  outputFileTracingRoot: path.join(__dirname, "../"),
  outputFileTracingExcludes: {
    // Exclude ALL non-runtime artifact directories from every serverless function.
    // Keys are route globs; use /**/* so nested routes such as
    // /api/admin/rag-eval/run do not accidentally trace repo evidence output.
    "/**/*": [
      "../_bmad/**",
      "../_bmad-output/**",
      "../backend/**",
      "../docs-ai/**",
      "../dogfood-output/**",
      "../e2e-screenshots/**",
      "../logs/**",
      "../memories/**",
      "../output/**",
      "../procore-crawls/**",
      "../procore-templates/**",
      "../scripts/**",
      "../supabase/**",
      "../tests/**",
      "../tools/**",
      "../tmp/**",
      "../verify-output/**",
      "../vermillian/**",
      "../docs/.archive/**",
      "../docs/BMAD/**",
      "../docs/PRPs/**",
      "../docs/ai-plan/evals/**",
      "../docs/asrs/**",
      "../docs/change-order-process/**",
      "../docs/ops/evidence/**",
      "../docs/procore-reference/procore-workflow-images/**",
      "../docs/reports/**",
      "../scripts/adversarial-harness/**",
      "../scripts/change-events-crawl/**",
      "../scripts/feature-tracker/**",
      "../scripts/mcp-servers/**",
      "../scripts/playwright-crawl/**",
      "../scripts/screenshot-capture/**",
      "../scripts/visual-audit/**",
      "./coverage/**",
      "./config/playwright/**",
      "./e2e-screenshots/**",
      "./playwright-report/**",
      "./storybook-static/**",
      "./tests/**",
      "./tsconfig*.tsbuildinfo",
    ],
  },
  // Security headers (OWASP best practices)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
  // Proxy chatkit requests to the Alleato RAG backend (port 8051)
  async rewrites() {
    return [
      {
        source: "/rag-chatkit",
        destination: "http://127.0.0.1:8051/rag-chatkit",
      },
      {
        source: "/rag-chatkit/:path*",
        destination: "http://127.0.0.1:8051/rag-chatkit/:path*",
      },
      {
        source: "/chatkit",
        destination: "http://127.0.0.1:8051/rag-chatkit",
      },
      {
        source: "/chatkit/:path*",
        destination: "http://127.0.0.1:8051/rag-chatkit/:path*",
      },
    ];
  },
};

export default nextConfig;
