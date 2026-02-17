import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mai/core"],
  // Output standalone for future Docker deployment
  // output: "standalone", // TODO: enable for production
};

export default nextConfig;
