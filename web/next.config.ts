import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Emit /auth/reset-password/index.html so static hosts resolve /auth/reset-password (not only .html).
  trailingSlash: true,
};

export default nextConfig;
