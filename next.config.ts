import type { NextConfig } from "next";

// GitHub Pages serves this repo at /diet-planner/, not at the domain root.
const repoBasePath = process.env.GITHUB_PAGES ? "/diet-planner" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: repoBasePath,
  assetPrefix: repoBasePath,
  images: {
    // static export can't run the default optimizer; meal photos come from TheMealDB as-is
    unoptimized: true,
  },
};

export default nextConfig;
