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
      // Poster frames for the embedded monastery videos. Only the thumbnail is
      // fetched from here; playback stays inside YouTube's own iframe player.
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
