import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@verifytrust/sdk"],
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
