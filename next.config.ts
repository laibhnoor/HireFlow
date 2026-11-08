import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["bcryptjs", "unpdf", "mammoth"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
