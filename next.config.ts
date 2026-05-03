import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: "standalone",
  // Keep native/binary packages out of the Webpack/Turbopack bundle
  serverExternalPackages: [
    "playwright-core",
    "@sparticuz/chromium",
    "@sparticuz/chromium-min",
    "cheerio",
  ],
};

export default nextConfig;
