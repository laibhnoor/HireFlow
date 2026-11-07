import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["bcryptjs"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
