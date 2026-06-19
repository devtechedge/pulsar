import type { NextConfig } from "next";

/**
 * Next.js config — supports BOTH Vercel and GitHub Pages from the same codebase.
 *
 * Vercel:        `next build` (default). No basePath. Output = standard.
 * GitHub Pages:  Set env `GITHUB_PAGES=1` and `BASE_PATH=/your-repo-name`.
 *                Output = static export to `out/`. All assets prefixed with basePath.
 *
 * The GitHub Actions workflow (.github/workflows/deploy.yml) sets these env vars
 * automatically based on your repo name, so you don't have to think about it.
 */

const isGithubPages = process.env.GITHUB_PAGES === "1";
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  // Vercel: 'standalone' is fine (and Vercel ignores it anyway).
  // GitHub Pages: 'export' produces a static `out/` directory.
  output: isGithubPages ? "export" : "standalone",

  // GitHub Pages serves from username.github.io/repo-name/, so all asset
  // URLs need to be prefixed with the repo name.
  basePath: isGithubPages ? basePath : "",
  assetPrefix: isGithubPages ? basePath : "",

  // Static export doesn't support image optimization (needs a server).
  // The site doesn't use next/image, but enable this for safety.
  images: { unoptimized: true },

  // three.js ships ESM; transpile for older bundlers.
  transpilePackages: ["three"],

  // Trailing slash on every route — required for GitHub Pages so that
  // /pulsar/about/ resolves correctly without a server rewriter.
  trailingSlash: isGithubPages,

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
};

export default nextConfig;
