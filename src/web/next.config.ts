import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [],
    unoptimized: true, // This helps with static image loading
  },
};

export default nextConfig;
