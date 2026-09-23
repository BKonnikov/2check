import type { NextRequest } from "next/server";
import { clientAddress } from "../../../_components/clientAddress";

/**
 * Forwards the browser's calls to the internal web API.
 *
 * This is a route handler rather than a next.config rewrite on purpose: rewrites are baked into
 * the build, and PRD 27.3 promotes one immutable artifact from staging to production with
 * environment differences supplied by configuration. Reading API_ORIGIN per request keeps that
 * true. Only the fixed /api/web prefix of the configured origin is reachable.
 */
export const dynamic = "force-dynamic";

const API_PREFIX = "/api/web";

const NULL_BODY_STATUS = new Set([204, 205, 304]);

function apiOrigin(): string {
  return process.env.API_ORIGIN ?? "http://127.0.0.1:3001";
}

async function forward(request: NextRequest, path: readonly string[]): Promise<Response> {
  const { search } = new URL(request.url);
  const target = `${apiOrigin()}${API_PREFIX}/${path.join("/")}${search}`;

  /**
   * PRD 22.2 — the API rate-limits per caller, and until now every caller was this application.
   * Nothing carried the visitor's address across the proxy, so all visitors shared one bucket:
   * a single busy client could spend everyone's quota, and no single client was ever limited.
   *
   * The address is asserted here and always overwritten, never passed through from the incoming
   * request, so a header a client invented cannot reach the API untouched. It is best-effort
   * fairness rather than protection: X-Forwarded-For can be claimed, which is why a flood is
   * stopped at the edge by TCP source address instead.
   */
  const caller = clientAddress(request.headers);

  /**
   * PRD 28.3 — the API reads the User-Agent to derive the coarse client class it stores, and
   * discards the string itself. Without this line the only User-Agent it ever saw was this
   * server's own fetch, so every visit was recorded as an unrecognised desktop browser and the
   * statistics page said so in earnest. Nothing new is stored by forwarding it: the header goes
   * to the process that was always meant to read it.
   */
  const agent = request.headers.get("user-agent");

  const response = await fetch(target, {
    method: request.method,
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
      ...(caller === undefined ? {} : { "x-forwarded-for": caller }),
      ...(agent === null ? {} : { "user-agent": agent }),
    },
    ...(request.method === "GET" || request.method === "HEAD"
      ? {}
      : { body: await request.text() }),
    cache: "no-store",
  });

  /**
   * 204, 205 and 304 are null-body statuses: constructing a Response with a body — even the
   * empty string `text()` returns — throws, and the throw becomes a 500 from this route.
   *
   * The analytics endpoint answers 204 by design (PRD 28), so every event the browser sent was
   * turned into a 500 here and no usage was ever recorded. It failed silently because the beacon
   * has nobody to report to and analytics is deliberately not a dependency of a scan (AC-28.6).
   */
  if (NULL_BODY_STATUS.has(response.status)) {
    return new Response(null, { status: response.status });
  }

  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

interface RouteContext {
  readonly params: Promise<{ readonly path: string[] }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  return forward(request, (await context.params).path);
}
