import type { NextRequest } from "next/server";

/**
 * The visitor's own public address, shown back to them and kept nowhere.
 *
 * PRD 28.4 forbids an IP address in analytics, and that stands: this answers the caller with
 * the caller's own address and nothing is recorded, counted or logged. It is deliberately not
 * part of the web API contract under /api/web — the API never sees a visitor's address,
 * because the browser reaches it through this application rather than directly, and that is
 * one fewer place a personal datum can end up.
 */
export const dynamic = "force-dynamic";

/**
 * The leftmost entry of X-Forwarded-For is the client as the first proxy saw it; nginx appends
 * each further hop on the right (deploy/nginx.example.conf). X-Real-IP is the fallback for a
 * deployment that sets only that.
 */
function clientAddress(request: NextRequest): string | undefined {
  const chain = request.headers.get("x-forwarded-for");
  const first = chain?.split(",")[0]?.trim();
  if (first !== undefined && first !== "") {
    return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  return real === undefined || real === "" ? undefined : real;
}

export async function GET(request: NextRequest): Promise<Response> {
  const address = clientAddress(request);
  if (address === undefined) {
    // Behind an unknown proxy chain there is nothing honest to answer.
    return new Response(null, { status: 204 });
  }
  return new Response(JSON.stringify({ address }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // Per caller and only for this caller: never held by a shared cache.
      "cache-control": "no-store, private",
    },
  });
}
