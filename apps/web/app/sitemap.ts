import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, LOCALES, SITE_ORIGIN } from "./_components/chrome";

/**
 * PRD 24.4 and AC-24.3 — only pages meant for indexing. Scan routes, API routes and the gated
 * resource never appear here, and there is no history catalogue to list.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    INDEXABLE_PATHS.map((path) => ({
      url: `${SITE_ORIGIN}/${locale}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
  );
}
