import type { NextConfig } from "next";

/**
 * Next.js config — supports BOTH Vercel and GitHub Pages from the same codebase.
 *
 * Vercel:        `next build` (default). No standalone output (Vercel rejects nft.json).
 * GitHub Pages:  Set env `GITHUB_PAGES=1` and `BASE_PATH=/your-repo-name`.
 *                Output = static export to `out/`.
 */

const isGithubPages = process.env.GITHUB_PAGES === "1";
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(isGithubPages
    ? { output: "export" as const }
    : process.env.VERCEL
      ? {}
      : { output: "standalone" as const }),

  basePath: isGithubPages ? basePath : "",
  assetPrefix: isGithubPages ? basePath : "",

  images: { unoptimized: true },

  transpilePackages: ["three"],

  trailingSlash: isGithubPages,

  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },

};

export default nextConfig;
