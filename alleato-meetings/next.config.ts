import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only secrets (service role, Graph creds, OpenAI) are read in route
  // handlers / server components only — never exposed to the client bundle.
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
