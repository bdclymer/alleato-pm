import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [
    "@mermaid-js/parser",
    "mermaid",
    "@streamdown/mermaid",
  ],
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
