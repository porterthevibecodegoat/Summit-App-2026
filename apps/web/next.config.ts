import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@not-alone/config", "@not-alone/test-fixtures"]
};

export default nextConfig;
