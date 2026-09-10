import type { NextConfig } from "next";
import path from "node:path";

const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: workspaceRoot
  },
  transpilePackages: [
    "@not-alone/config",
    "@not-alone/design-tokens",
    "@not-alone/domain",
    "@not-alone/test-fixtures",
    "@not-alone/validation"
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" }
        ]
      }
    ];
  }
};

export default nextConfig;
