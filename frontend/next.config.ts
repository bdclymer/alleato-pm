import path from "node:path";
import type { NextConfig } from "next";

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
    ],
  },
  serverExternalPackages: [
    "@mermaid-js/parser",
    "mermaid",
    "@streamdown/mermaid",
    "puppeteer",
    // Heavy doc/API packages only used in specific admin routes
    "redoc",
    "swagger-ui-dist",
  ],
  webpack: (config) => {
    // Limit webpack worker parallelism to prevent OOM on Vercel's 8 GB build machines.
    // Default is (cpuCount - 1) workers; at 2 cores that's already 1, but explicit cap
    // prevents memory spikes when multiple heavy modules compile simultaneously.
    config.parallelism = 1;
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
