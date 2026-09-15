import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@2check/contracts", "@2check/messages"],
  // The internal web API is reached through app/api/web/[...path], which reads its origin at
  // request time so one built artifact can move between environments (PRD 27.3).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // PRD 25.5 and AC-25.4 — a scan URL grants access, so it must never travel in a
          // referrer to another origin.
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // AC-25.5 — no third-party analytics can load, so no scanId or domain can reach one.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default config;
