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
    // Prevent webpack from barrel-importing entire icon/component libraries.
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
    // Heavy doc/API packages only used in specific admin routes
    "redoc",
    "swagger-ui-dist",
    "xlsx",
  ],
  webpack: (config) => {
    // Limit webpack worker parallelism to prevent OOM on Vercel's 8 GB build machines.
    // Default is (cpuCount - 1) workers; at 2 cores that's already 1, but explicit cap
    // prevents memory spikes when multiple heavy modules compile simultaneously.
    config.parallelism = 1;

    // react-pdf imports bare `pdfjs-dist`, whose non-minified 5.x ESM entry redeclares
    // webpack's internal export variable and crashes the drawing viewer in dev.
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
    // Exclude ALL non-frontend directories from every serverless function.
    // outputFileTracingRoot is ../ (repo root), so everything at the repo
    // level is a candidate for tracing. Only the frontend/ runtime code
    // should be bundled — everything else is dev-only or irrelevant.
    "/*": [
      "../_bmad/**",
      "../_bmad-output/**",
      "../backend/**",
      "../docs/**",
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
      "./config/playwright/**",
      "./playwright-report/**",
      "./tests/**",
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
