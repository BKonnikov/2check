import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "./_components/chrome";

/**
 * PRD 24.4 — robots.txt is not a security boundary and does not replace the noindex on a scan
 * page; that page carries its own robots directive. Scan, API and gated routes are kept out of
 * the crawl path as well.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/ru/scan/", "/uz/scan/", "/en/scan/"] },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
