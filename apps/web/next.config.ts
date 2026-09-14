import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The shared package ships TypeScript-compatible ESM from the workspace.
  transpilePackages: ["@2check/contracts"],
};

export default config;
