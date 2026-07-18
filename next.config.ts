import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // meal photos come from the recipe publishers, via TheMealDB
    remotePatterns: [{ protocol: "https", hostname: "www.themealdb.com" }],
  },
};

export default nextConfig;
