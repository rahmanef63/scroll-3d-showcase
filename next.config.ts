import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runner copies .next/standalone and runs server.js.
  output: "standalone",
  // Lets marketing routes opt into "use cache" with cacheLife/cacheTag.
  // Top-level since 16.2 — it was `experimental.cacheComponents` before that.
  cacheComponents: true,
};

export default nextConfig;
