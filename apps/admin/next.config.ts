import type { NextConfig } from "next";
import path from "node:path";

const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingRoot: workspaceRoot,
  reactStrictMode: true,
  turbopack: {
    root: workspaceRoot
  },
  transpilePackages: [
    "@not-alone/config",
    "@not-alone/design-tokens",
    "@not-alone/domain",
    "@not-alone/test-fixtures",
    "@not-alone/validation"
  ]
};

export default nextConfig;
