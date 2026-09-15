import type { NextRequest } from "next/server";

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

function apiOrigin(): string {
  return process.env.API_ORIGIN ?? "http://127.0.0.1:3001";
}

async function forward(request: NextRequest, path: readonly string[]): Promise<Response> {
  const { search } = new URL(request.url);
  const target = `${apiOrigin()}${API_PREFIX}/${path.join("/")}${search}`;

  const response = await fetch(target, {
    method: request.method,
    headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
    ...(request.method === "GET" || request.method === "HEAD"
      ? {}
      : { body: await request.text() }),
    cache: "no-store",
  });

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
