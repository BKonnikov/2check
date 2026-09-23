/**
 * The caller's address as the edge reported it.
 *
 * The leftmost entry of X-Forwarded-For is the client as the first proxy saw it; nginx appends
 * each further hop on the right (deploy/nginx.example.conf), so the rightmost entries are our
 * own machines. X-Real-IP is the fallback for a deployment that sets only that.
 *
 * X-Forwarded-For is a header, so a client can send one of its own. Our nginx is configured to
 * trust it only from the edge balancer and to pass on the single address it determined itself
 * (deploy/nginx.example.conf), which makes the leftmost entry authoritative here. Behind a proxy
 * that is not configured that way, this reverts to best-effort — so it is deliberately NOT what
 * protects the service from a flood. That belongs at the edge, where the TCP source address
 * cannot be claimed at all.
 */
export function clientAddress(headers: Headers): string | undefined {
  const chain = headers.get("x-forwarded-for");
  const first = chain?.split(",")[0]?.trim();
  if (first !== undefined && first !== "") {
    return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  return real === undefined || real === "" ? undefined : real;
}
