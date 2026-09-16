/**
 * PRD 28.3 and 28.6 — the coarse class of client an event arrived from.
 *
 * The User-Agent header is a fingerprint: it names a browser build, an operating-system patch
 * level and sometimes a device model, and a handful of them are unique to one person. It is
 * therefore read and thrown away here, never stored and never logged, and what is kept is a
 * value from a closed enumeration small enough that it identifies nobody.
 *
 * This runs on the server on purpose. The collection schema is the privacy boundary (AC-28.3)
 * and has no field for either of these, so a page cannot claim to be something it is not, and
 * nothing new travels from the browser to make this work.
 */

export const DEVICE_KINDS = ["mobile", "tablet", "desktop", "bot", "unknown"] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

export const BROWSERS = [
  "chrome",
  "safari",
  "firefox",
  "edge",
  "opera",
  "samsung",
  "yandex",
  "other",
] as const;
export type Browser = (typeof BROWSERS)[number];

export interface AnalyticsClient {
  readonly deviceKind: DeviceKind;
  readonly browser: Browser;
}

const BOT =
  /bot|crawl|spider|slurp|headless|monitor|preview|curl|wget|python-requests|facebookexternalhit|bingpreview/;

/**
 * Order matters: several browsers keep "Chrome" or "Safari" in their token for compatibility,
 * so the ones that also carry their own name have to be recognised before the name they borrow.
 */
const BROWSER_RULES: readonly (readonly [Browser, RegExp])[] = [
  ["edge", /\bedg(e|a|ios)?\//],
  ["opera", /\bopr\/|\bopera\b/],
  ["samsung", /samsungbrowser/],
  ["yandex", /yabrowser/],
  ["firefox", /\bfirefox\/|\bfxios\//],
  ["chrome", /\bchrome\/|\bcriOS\//i],
  ["safari", /\bsafari\//],
];

export function classifyClient(userAgent: string | undefined): AnalyticsClient {
  if (userAgent === undefined || userAgent.trim() === "") {
    return { deviceKind: "unknown", browser: "other" };
  }
  const agent = userAgent.toLowerCase();

  if (BOT.test(agent)) {
    // A crawler is counted apart rather than dropped: a statistics page that quietly folds
    // crawlers into its visitor count is overstating its audience.
    return { deviceKind: "bot", browser: "other" };
  }

  const deviceKind: DeviceKind = /ipad|tablet|playbook|silk/.test(agent)
    ? "tablet"
    : // Android without "mobile" is a tablet, which is the convention Android itself uses.
      /android(?!.*mobile)/.test(agent)
      ? "tablet"
      : /mobi|iphone|ipod|phone|windows phone/.test(agent)
        ? "mobile"
        : "desktop";

  const browser = BROWSER_RULES.find(([, pattern]) => pattern.test(agent))?.[0] ?? "other";
  return { deviceKind, browser };
}
