import type {
  AnalyticsEvent,
  AnalyticsLocale,
  AnalyticsOutcome,
  AnalyticsScope,
  AnalyticsTool,
  ScanMode,
  VerdictCode,
} from "@2check/contracts";
import { WEB_API_BASE_PATH } from "@2check/contracts";

/**
 * PRD 28 — product analytics, first-party and deliberately small.
 *
 * No third-party script is loaded, and none could be: the Content-Security-Policy allows scripts
 * only from this origin, and the colophon tells readers that no analytics or advertising network
 * runs here. What is sent is a bounded set of enumerations — never the domain, the scanId, the
 * string that was typed, or anything derived from the result beyond an aggregate verdict.
 *
 * AC-28.6 — none of this can affect a domain check: every call is fire-and-forget, wrapped, and
 * its failure is silent by design.
 */
export interface AnalyticsDimensions {
  readonly locale: AnalyticsLocale;
  readonly tool: AnalyticsTool;
  readonly mode?: ScanMode;
  readonly scope?: AnalyticsScope;
  readonly outcome?: AnalyticsOutcome;
  readonly verdictCode?: VerdictCode;
}

const SESSION_KEY = "2check-session";
const SEEN_KEY = "2check-seen";

/**
 * PRD 28.6 — an anonymous value for one visit, so a funnel can be joined within a session. It
 * lives in sessionStorage, so it is gone when the tab closes; it is not an account and it is
 * never linked to anything outside this page.
 */
function sessionId(): string | undefined {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing !== null) {
      return existing;
    }
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}

/**
 * PRD 28.5 — whether this browser has been here before. A flag, not an identifier: it says
 * "again", and nothing that could tie this visit to the previous one.
 */
function returning(): boolean {
  try {
    const seen = localStorage.getItem(SEEN_KEY) === "1";
    localStorage.setItem(SEEN_KEY, "1");
    return seen;
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent, dimensions: AnalyticsDimensions): void {
  try {
    const id = sessionId();
    const body = JSON.stringify([
      {
        event,
        locale: dimensions.locale,
        tool: dimensions.tool,
        ...(dimensions.mode === undefined ? {} : { mode: dimensions.mode }),
        ...(dimensions.scope === undefined ? {} : { scope: dimensions.scope }),
        ...(dimensions.outcome === undefined ? {} : { outcome: dimensions.outcome }),
        ...(dimensions.verdictCode === undefined ? {} : { verdictCode: dimensions.verdictCode }),
        ...(id === undefined ? {} : { sessionId: id }),
        returning: returning(),
      },
    ]);
    const endpoint = `${WEB_API_BASE_PATH}/events`;
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // A counter is never a reason for the page to misbehave.
  }
}
