/**
 * PRD 21.3 and AC-21.3 — standard logs never carry the raw input, URL path or query, session
 * secrets, registrant personal data, raw RDAP/WHOIS bodies, or internal denylist values.
 * Redaction is declared here rather than left to each call site, so a new log line cannot leak
 * by omission.
 */
export const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['set-cookie']",
  "res.headers['set-cookie']",
  "originalInput",
  "*.originalInput",
  "registrant",
  "*.registrant",
  "raw",
  "*.raw",
  "internalInfrastructureDenylist",
  "*.internalInfrastructureDenylist",
] as const;

export const LOG_REDACTION = {
  paths: [...REDACTED_PATHS],
  censor: "[redacted]",
} as const;

/**
 * PRD 25.6 — the URL path, query and fragment are not product data. Only the route template is
 * logged, so a scanId in a path never reaches the log either (PRD 25.5).
 */
export function requestSerializer(request: {
  readonly method: string;
  readonly routeOptions?: { readonly url?: string | undefined };
}): { method: string; route: string } {
  return {
    method: request.method,
    route: request.routeOptions?.url ?? "unrouted",
  };
}
