import type { NextConfig } from "next";

// GitHub Pages serves this repo at /diet-planner/, not at the domain root.
const forGithubPages = process.env.GITHUB_PAGES === "true";
const repoBasePath = forGithubPages ? "/diet-planner" : "";

const nextConfig: NextConfig = {
  // Static export only for the GitHub Pages build. The Gemini-backed API routes need a
  // server, so the default (Vercel) build stays a normal Next.js app and keeps them.
  ...(forGithubPages ? { output: "export" as const } : {}),
  basePath: repoBasePath,
  assetPrefix: repoBasePath,
  images: {
    // static export can't run the default optimizer; meal photos come from TheMealDB as-is
    unoptimized: true,
  },
};

export default nextConfig;
