import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@2check/contracts", "@2check/messages"],
  // The internal web API is reached through app/api/web/[...path], which reads its origin at
  // request time so one built artifact can be promoted between environments (PRD 27.3).
};

export default config;
