import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Phase 1 photography is freely licensed media hosted on Wikimedia Commons.
    // Phase 2+ swaps these for CDN assets referenced from the database.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
    ],
  },
};

export default nextConfig;
